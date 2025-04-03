import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { UserModel } from "@/lib/db/models/user"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import { updatePricing } from "@/lib/pricing"

// PUT update pricing (admin only)
export async function PUT(request: Request) {
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

    // Check if user is admin
    if (user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const { pricing } = await request.json()

    // Update pricing
    updatePricing(pricing)

    return NextResponse.json({ message: "Pricing updated successfully" })
  } catch (error) {
    console.error("Update pricing error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

