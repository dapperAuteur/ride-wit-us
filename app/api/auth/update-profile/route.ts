import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth/auth-utils"
import { sql } from "@/lib/db/neon"
import { comparePasswords } from "@/lib/auth/auth-utils"

export async function PUT(request: Request) {
  try {
    // Get the token from cookies
    const token = cookies().get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Verify token
    const decoded = verifyToken(token)

    // Get request body
    const { name, email, currentPassword } = await request.json()

    if (!name || !email || !currentPassword) {
      return NextResponse.json(
        { success: false, error: "Name, email, and current password are required" },
        { status: 400 },
      )
    }

    // Get user from database
    const user = await sql`
      SELECT id, email, name, password, role, subscription_status, subscription_expiry, stripe_customer_id, created_at, updated_at
      FROM users
      WHERE id = ${decoded.id}
    `

    if (user.length === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Verify current password
    const isPasswordValid = await comparePasswords(currentPassword, user[0].password)

    if (!isPasswordValid) {
      return NextResponse.json({ success: false, error: "Current password is incorrect" }, { status: 401 })
    }

    // Check if email is already taken (if changing email)
    if (email !== user[0].email) {
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${email} AND id != ${decoded.id}
      `

      if (existingUser.length > 0) {
        return NextResponse.json({ success: false, error: "Email is already in use" }, { status: 409 })
      }
    }

    // Update user
    const updatedUser = await sql`
      UPDATE users
      SET name = ${name}, email = ${email}, updated_at = NOW()
      WHERE id = ${decoded.id}
      RETURNING id, email, name, role, subscription_status, subscription_expiry, stripe_customer_id, created_at, updated_at
    `

    return NextResponse.json({
      success: true,
      user: updatedUser[0],
    })
  } catch (error: any) {
    console.error("Update profile error:", error)
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 })
  }
}

