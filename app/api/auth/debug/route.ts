import { NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

export async function GET() {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { success: false, error: "Debug endpoint only available in development mode" },
        { status: 403 },
      )
    }

    // Check database connection
    let connectionTest
    try {
      connectionTest = await sql`SELECT NOW() as time`
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Check if users table exists
    let tableCheck
    try {
      tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'users'
        ) as table_exists
      `
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to check if users table exists",
          details: error.message,
        },
        { status: 500 },
      )
    }

    const usersTableExists = tableCheck[0].table_exists

    if (!usersTableExists) {
      return NextResponse.json(
        {
          success: false,
          error: "Users table does not exist",
          solution: "Run the database setup at /db-setup to create the required tables",
        },
        { status: 404 },
      )
    }

    // Check table structure
    let tableStructure
    try {
      tableStructure = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        ORDER BY ordinal_position
      `
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to get users table structure",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Count users
    let userCount
    try {
      userCount = await sql`SELECT COUNT(*) as count FROM users`
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to count users",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Check JWT secret
    const jwtSecretExists = !!process.env.JWT_SECRET

    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        serverTime: connectionTest[0].time,
        usersTableExists,
        tableStructure,
        userCount: userCount[0].count,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        jwtSecretExists,
      },
    })
  } catch (error: any) {
    console.error("Auth debug error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Auth debug failed",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
