import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { verify } from "jsonwebtoken"
import { cookies } from "next/headers"

// PUT update user (admin/manager only)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
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

    const { name, email, role, subscriptionStatus } = await request.json()

    // Validate role (managers can only update to user role)
    if (currentUser.role === "MANAGER" && role !== "USER") {
      return NextResponse.json({ message: "Managers can only update to user role" }, { status: 403 })
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        name,
        email,
        role: role as any,
        subscriptionStatus: subscriptionStatus as any,
      },
    })

    // Return user data (without password)
    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        subscriptionStatus: updatedUser.subscriptionStatus,
        subscriptionExpiry: updatedUser.subscriptionExpiry?.toISOString(),
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// DELETE user (admin/manager only)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    // Prevent deleting self
    if (params.id === currentUser.id) {
      return NextResponse.json({ message: "Cannot delete your own account" }, { status: 400 })
    }

    // Get user to delete
    const userToDelete = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!userToDelete) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Managers can only delete users
    if (currentUser.role === "MANAGER" && userToDelete.role !== "USER") {
      return NextResponse.json({ message: "Managers can only delete users" }, { status: 403 })
    }

    // Delete user
    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

