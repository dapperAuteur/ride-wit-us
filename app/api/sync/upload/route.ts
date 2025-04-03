import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { ActivityModel } from "@/lib/db/models/activity"
import { UserModel } from "@/lib/db/models/user"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import mongoose from "mongoose"

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
    const user = await UserModel.findById(decoded.id)

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Check if user has premium subscription
    if (user.subscriptionStatus !== "monthly" && user.subscriptionStatus !== "annual") {
      return NextResponse.json({ message: "Premium subscription required" }, { status: 403 })
    }

    const { activities } = await request.json()

    // Delete existing activities for this user
    await ActivityModel.deleteMany({ userId: user._id })

    // Insert new activities
    const activitiesToInsert = activities.map((activity: any) => ({
      ...activity,
      userId: new mongoose.Types.ObjectId(user._id),
      date: new Date(activity.date),
    }))

    await ActivityModel.insertMany(activitiesToInsert)

    return NextResponse.json({ message: "Activities uploaded successfully" })
  } catch (error) {
    console.error("Upload activities error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

