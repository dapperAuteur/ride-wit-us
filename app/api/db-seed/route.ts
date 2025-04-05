import { NextResponse } from "next/server"
import { executeSQL } from "@/lib/db/neon"
import { hash } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

export async function POST() {
  try {
    // Create admin user
    const adminPassword = await hash("admin123", 10)
    const adminId = uuidv4()

    const createAdmin = await executeSQL(
      `
      INSERT INTO users (id, email, name, password, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE
      SET name = EXCLUDED.name, role = EXCLUDED.role
      RETURNING id, email, name, role
    `,
      [adminId, "admin@example.com", "Admin User", adminPassword, "ADMIN"],
    )

    if (!createAdmin.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create admin user",
          error: createAdmin.error,
          details: createAdmin.details,
        },
        { status: 500 },
      )
    }

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
      const result = await executeSQL(
        `
        INSERT INTO pricing_tiers (id, name, price, interval, features, stripe_price_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name, price = EXCLUDED.price, interval = EXCLUDED.interval, 
            features = EXCLUDED.features, stripe_price_id = EXCLUDED.stripe_price_id
      `,
        [tier.id, tier.name, tier.price, tier.interval, tier.features, tier.stripe_price_id],
      )

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            message: `Failed to create pricing tier: ${tier.name}`,
            error: result.error,
            details: result.details,
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      admin: createAdmin.data[0],
    })
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

