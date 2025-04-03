import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { UserModel } from "@/lib/db/models/user"
import { ActivityModel } from "@/lib/db/models/activity"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import stripe from "@/lib/stripe"

export async function DELETE() {
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
      cookies().delete("auth_token")
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Cancel Stripe subscription if exists
    if (user.stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
        })

        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id)
        }
      } catch (error) {
        console.error("Error canceling Stripe subscription:", error)
      }
    }

    // Delete user's activities
    await ActivityModel.deleteMany({ userId: user._id })

    // Delete user
    await UserModel.findByIdAndDelete(user._id)

    // Clear auth cookie
    cookies().delete("auth_token")

    return NextResponse.json({ message: "Account deleted successfully" })
  } catch (error) {
    console.error("Delete account error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

