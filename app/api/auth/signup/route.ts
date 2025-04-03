import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { UserModel } from "@/lib/db/models/user"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    await connectToDatabase()

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
      role: "user",
      subscriptionStatus: "free",
    })

    await newUser.save()

    // Create JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" })

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
    console.error("Sign up error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

