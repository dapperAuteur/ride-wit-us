import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { verify } from "jsonwebtoken"
import { cookies } from "next/headers"

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

    // Check if user has premium subscription
    if (user.subscriptionStatus !== "MONTHLY" && user.subscriptionStatus !== "ANNUAL") {
      return NextResponse.json({ message: "Premium subscription required" }, { status: 403 })
    }

    // Get activities for this user
    const activities = await prisma.activity.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    })

    // Transform Prisma objects to plain objects
    const transformedActivities = activities.map((activity) => ({
      id: activity.id,
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

