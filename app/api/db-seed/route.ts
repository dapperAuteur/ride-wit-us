import { NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import { hash } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

export async function POST() {
  try {
    // Create admin user
    const adminPassword = await hash("admin123", 10)
    const adminId = uuidv4()

    try {
      const createAdmin = await sql`
        INSERT INTO users (id, email, name, password, role)
        VALUES (${adminId}, 'admin@example.com', 'Admin User', ${adminPassword}, 'ADMIN')
        ON CONFLICT (email) DO UPDATE
        SET name = 'Admin User', role = 'ADMIN'
        RETURNING id, email, name, role
      `

      // Create default pricing tiers
      const pricingTiers = [
        {
          id: "free",
          name: "Free",
          price: 0,
          interval: "month",
          features: [
            "Track walking, running, biking, and driving",
            "Local data storage",
            "CSV export and import",
            "Basic analytics",
          ],
          stripe_price_id: null,
        },
        {
          id: "monthly",
          name: "Premium Monthly",
          price: 9.99,
          interval: "month",
          features: [
            "All Free features",
            "Cloud data storage",
            "Sync across devices",
            "Advanced analytics",
            "Priority support",
          ],
          stripe_price_id: "price_monthly",
        },
        {
          id: "annual",
          name: "Premium Annual",
          price: 99.99,
          interval: "year",
          features: ["All Premium Monthly features", "2 months free", "Early access to new features"],
          stripe_price_id: "price_annual",
        },
      ]

      for (const tier of pricingTiers) {
        await sql`
          INSERT INTO pricing_tiers (id, name, price, interval, features, stripe_price_id)
          VALUES (${tier.id}, ${tier.name}, ${tier.price}, ${tier.interval}, ${tier.features}, ${tier.stripe_price_id})
          ON CONFLICT (id) DO UPDATE
          SET name = ${tier.name}, price = ${tier.price}, interval = ${tier.interval}, 
              features = ${tier.features}, stripe_price_id = ${tier.stripe_price_id}
        `
      }

      return NextResponse.json({
        success: true,
        message: "Database seeded successfully",
        admin: createAdmin[0],
      })
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to seed database",
          error: error.message,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred during database seeding",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

