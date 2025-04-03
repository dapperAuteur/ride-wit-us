import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { UserModel } from "@/lib/db/models/user"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    await connectToDatabase()

    // Find user by email
    const user = await UserModel.findOne({ email })

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" })

    // Set cookie
    cookies().set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Return user data (without password)
    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiry: user.subscriptionExpiry,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    console.error("Sign in error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

