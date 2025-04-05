import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { verify } from "jsonwebtoken"
import { cookies } from "next/headers"

export async function POST(request: Request) {
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

    const { activities } = await request.json()

    // Delete existing activities for this user
    await prisma.activity.deleteMany({
      where: { userId: user.id },
    })

    // Insert new activities
    const activitiesToInsert = activities.map((activity: any) => ({
      date: new Date(activity.date),
      type: activity.type,
      distance: activity.distance,
      duration: activity.duration,
      maintenanceCost: activity.maintenanceCost,
      notes: activity.notes,
      userId: user.id,
    }))

    await prisma.activity.createMany({
      data: activitiesToInsert,
    })

    return NextResponse.json({ message: "Activities uploaded successfully" })
  } catch (error) {
    console.error("Upload activities error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

