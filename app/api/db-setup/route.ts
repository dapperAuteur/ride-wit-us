import { NextResponse } from "next/server"
import { executeSQL } from "@/lib/db/neon"

export async function POST() {
  try {
    // Create users table
    const createUsersTable = await executeSQL(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('USER', 'MANAGER', 'ADMIN')) DEFAULT 'USER',
        subscription_status TEXT NOT NULL CHECK (subscription_status IN ('FREE', 'MONTHLY', 'ANNUAL', 'NONE')) DEFAULT 'FREE',
        subscription_expiry TIMESTAMP,
        stripe_customer_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    if (!createUsersTable.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create users table",
          error: createUsersTable.error,
          details: createUsersTable.details,
        },
        { status: 500 },
      )
    }

    // Create activities table
    const createActivitiesTable = await executeSQL(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('walking', 'running', 'biking', 'driving')),
        distance FLOAT NOT NULL,
        duration INTEGER NOT NULL,
        maintenance_cost FLOAT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT NOT NULL
      )
    `)

    if (!createActivitiesTable.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create activities table",
          error: createActivitiesTable.error,
          details: createActivitiesTable.details,
        },
        { status: 500 },
      )
    }

    // Create pricing_tiers table
    const createPricingTiersTable = await executeSQL(`
      CREATE TABLE IF NOT EXISTS pricing_tiers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price FLOAT NOT NULL,
        interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
        stripe_price_id TEXT,
        features TEXT[],
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    if (!createPricingTiersTable.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create pricing_tiers table",
          error: createPricingTiersTable.error,
          details: createPricingTiersTable.details,
        },
        { status: 500 },
      )
    }

    // Add foreign key constraint
    const addForeignKey = await executeSQL(`
      ALTER TABLE activities 
      ADD CONSTRAINT fk_user 
      FOREIGN KEY (user_id) 
      REFERENCES users(id) 
      ON DELETE CASCADE
    `)

    // This might fail if the constraint already exists, so we don't check for success

    // Create indexes for better performance
    await executeSQL(`CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id)`)
    await executeSQL(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`)

    return NextResponse.json({
      success: true,
      message: "Database setup completed successfully",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred during database setup",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

