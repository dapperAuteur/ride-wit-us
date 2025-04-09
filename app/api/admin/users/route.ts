import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { verify } from "jsonwebtoken"
import { cookies } from "next/headers"
import { hash } from "bcryptjs"

// GET all users (admin/manager only)
export async function GET() {
  try {
    const token = cookies().get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    // Verify token
    const decoded = verify(token, process.env.JWT_SECRET || "fallback_secret") as { id: string }

    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Check if user is admin or manager
    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Get all users
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Transform dates to strings
    const transformedUsers = users.map((user) => ({
      ...user,
      subscriptionExpiry: user.subscriptionExpiry?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }))

    return NextResponse.json({ users: transformedUsers })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// POST create new user (admin/manager only)
export async function POST(request: Request) {
  try {
    const token = cookies().get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    // Verify token
    const decoded = verify(token, process.env.JWT_SECRET || "fallback_secret") as { id: string }

    // Find user by ID
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
    })

    if (!currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Check if user is admin or manager
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const { name, email, password, role } = await request.json()

    // Validate role (managers can only create users)
    if (currentUser.role === "MANAGER" && role !== "USER") {
      return NextResponse.json({ message: "Managers can only create users" }, { status: 403 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as any,
        subscriptionStatus: "FREE",
      },
    })

    // Return user data (without password)
    return NextResponse.json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        subscriptionStatus: newUser.subscriptionStatus,
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
