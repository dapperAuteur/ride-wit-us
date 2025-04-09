import { NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import { hash } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

export async function GET() {
  try {
    // Test database connection
    const connectionTest = await sql`SELECT NOW() as time`

    // Create a test user
    const testPassword = await hash("password123", 10)
    const testId = uuidv4()
    const testEmail = `test-${Date.now()}@example.com`

    const createTest = await sql`
      INSERT INTO users (id, email, name, password, role)
      VALUES (${testId}, ${testEmail}, 'Test User', ${testPassword}, 'USER')
      RETURNING id, email, name, role
    `

    return NextResponse.json({
      success: true,
      message: "Database test successful",
      connection: {
        time: connectionTest[0].time,
      },
      testUser: createTest[0],
    })
  } catch (error: any) {
    console.error("Database test error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Database test failed",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
