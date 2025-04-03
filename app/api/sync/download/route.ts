import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { ActivityModel } from "@/lib/db/models/activity"
import { UserModel } from "@/lib/db/models/user"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

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

    // Check if user has premium subscription
    if (user.subscriptionStatus !== "monthly" && user.subscriptionStatus !== "annual") {
      return NextResponse.json({ message: "Premium subscription required" }, { status: 403 })
    }

    // Get activities for this user
    const activities = await ActivityModel.find({ userId: user._id }).sort({ date: -1 }).lean()

    // Transform MongoDB documents to plain objects
    const transformedActivities = activities.map((activity) => ({
      id: activity._id.toString(),
      date: activity.date.toISOString(),
      type: activity.type,
      distance: activity.distance,
      duration: activity.duration,
      maintenanceCost: activity.maintenanceCost,
      notes: activity.notes,
    }))

    return NextResponse.json({ activities: transformedActivities })
  } catch (error) {
    console.error("Download activities error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

