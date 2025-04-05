import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { verify } from "jsonwebtoken"
import { cookies } from "next/headers"
import stripe from "@/lib/stripe"

export async function DELETE() {
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

    // Delete user (activities will be cascade deleted)
    await prisma.user.delete({
      where: { id: user.id },
    })

    // Clear auth cookie
    cookies().delete("auth_token")

    return NextResponse.json({ message: "Account deleted successfully" })
  } catch (error) {
    console.error("Delete account error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

