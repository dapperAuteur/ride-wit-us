import { NextResponse } from "next/server"
import { executeSQL } from "@/lib/db/neon"

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
    const connectionTest = await executeSQL("SELECT NOW() as time")

    if (!connectionTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          details: connectionTest.error,
        },
        { status: 500 },
      )
    }

    // Check if users table exists
    const tableCheck = await executeSQL(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'users'
      ) as table_exists
    `)

    if (!tableCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to check if users table exists",
          details: tableCheck.error,
        },
        { status: 500 },
      )
    }

    const usersTableExists = tableCheck.data[0].table_exists

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
    const tableStructure = await executeSQL(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      ORDER BY ordinal_position
    `)

    if (!tableStructure.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to get users table structure",
          details: tableStructure.error,
        },
        { status: 500 },
      )
    }

    // Count users
    const userCount = await executeSQL("SELECT COUNT(*) as count FROM users")

    if (!userCount.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to count users",
          details: userCount.error,
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
        serverTime: connectionTest.data[0].time,
        usersTableExists,
        tableStructure: tableStructure.data,
        userCount: userCount.data[0].count,
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

