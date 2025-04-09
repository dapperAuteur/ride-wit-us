import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { verify } from "jsonwebtoken"
import { cookies } from "next/headers"

// GET pricing tiers
export async function GET() {
  try {
    const pricingTiers = await prisma.pricingTier.findMany({
      orderBy: { price: "asc" },
    })

    return NextResponse.json({ pricingTiers })
  } catch (error) {
    console.error("Get pricing tiers error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

// PUT update pricing (admin only)
export async function PUT(request: Request) {
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

    // Check if user is admin
    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const { pricing } = await request.json()

    // Update pricing tiers
    for (const tier of pricing) {
      await prisma.pricingTier.update({
        where: { id: tier.id },
        data: {
          name: tier.name,
          price: tier.price,
          interval: tier.interval as any,
          stripePriceId: tier.stripePriceId,
          features: tier.features,
        },
      })
    }

    return NextResponse.json({ message: "Pricing updated successfully" })
  } catch (error) {
    console.error("Update pricing error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
