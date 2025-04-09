import { NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import { hashPassword } from "@/lib/auth/auth-utils"
import { v4 as uuidv4 } from "uuid"

export async function POST() {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { success: false, error: "This endpoint is only available in development mode" },
        { status: 403 },
      )
    }

    // Create admin user
    const adminPassword = await hashPassword("admin123")
    const adminId = uuidv4()

    const createAdmin = await sql`
      INSERT INTO users (id, email, name, password, role)
      VALUES (${adminId}, 'admin@example.com', 'Admin User', ${adminPassword}, 'ADMIN')
      ON CONFLICT (email) DO UPDATE
      SET password = ${adminPassword}, role = 'ADMIN'
      RETURNING id, email, name, role
    `

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      admin: createAdmin[0],
    })
  } catch (error: any) {
    console.error("Create admin error:", error)
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred", details: error.message },
      { status: 500 },
    )
  }
}
