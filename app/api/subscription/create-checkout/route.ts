import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { UserModel } from "@/lib/db/models/user"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import stripe from "@/lib/stripe"

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

    const { priceId, planId } = await request.json()

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
        },
      })

      customerId = customer.id

      // Update user with Stripe customer ID
      user.stripeCustomerId = customerId
      await user.save()
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?canceled=true`,
      metadata: {
        userId: user._id.toString(),
        planId,
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error("Create checkout session error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

