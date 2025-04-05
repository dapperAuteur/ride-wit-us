import { NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

export async function POST() {
  try {
    // Create users table
    try {
      await sql`
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
      `
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create users table",
          error: error.message,
        },
        { status: 500 },
      )
    }

    // Create activities table
    try {
      await sql`
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
      `
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create activities table",
          error: error.message,
        },
        { status: 500 },
      )
    }

    // Create pricing_tiers table
    try {
      await sql`
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
      `
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create pricing_tiers table",
          error: error.message,
        },
        { status: 500 },
      )
    }

    // Add foreign key constraint
    try {
      await sql`
        ALTER TABLE activities 
        ADD CONSTRAINT fk_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
      `
    } catch (error: any) {
      // This might fail if the constraint already exists, so we don't return an error
      console.log("Foreign key constraint error (might already exist):", error.message)
    }

    // Create indexes for better performance
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
    } catch (error: any) {
      console.log("Index creation error (might already exist):", error.message)
    }

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

