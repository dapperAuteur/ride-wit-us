import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { UserModel } from "@/lib/db/models/user"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"

// GET all users (admin/manager only)
export async function GET() {
  try {
    const token = cookies().get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as { id: string }

    await connectToDatabase()

    // Find user by ID
    const user = await UserModel.findById(decoded.id)

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Check if user is admin or manager
    if (user.role !== "admin" && user.role !== "manager") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Get all users
    const users = await UserModel.find({}).select("-password").sort({ createdAt: -1 }).lean()

    // Transform MongoDB documents to plain objects
    const transformedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionExpiry: user.subscriptionExpiry,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as { id: string }

    await connectToDatabase()

    // Find user by ID
    const currentUser = await UserModel.findById(decoded.id)

    if (!currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Check if user is admin or manager
    if (currentUser.role !== "admin" && currentUser.role !== "manager") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const { name, email, password, role } = await request.json()

    // Validate role (managers can only create users)
    if (currentUser.role === "manager" && role !== "user") {
      return NextResponse.json({ message: "Managers can only create users" }, { status: 403 })
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email })

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const newUser = new UserModel({
      name,
      email,
      password: hashedPassword,
      role,
      subscriptionStatus: "free",
    })

    await newUser.save()

    // Return user data (without password)
    return NextResponse.json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        subscriptionStatus: newUser.subscriptionStatus,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

