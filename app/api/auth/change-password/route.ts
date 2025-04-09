import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken, comparePasswords, hashPassword } from "@/lib/auth/auth-utils"
import { sql } from "@/lib/db/neon"

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
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Current password and new password are required" },
        { status: 400 },
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long" },
        { status: 400 },
      )
    }

    // Get user from database
    const user = await sql`
      SELECT id, password
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

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password
    await sql`
      UPDATE users
      SET password = ${hashedPassword}, updated_at = NOW()
      WHERE id = ${decoded.id}
    `

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    })
  } catch (error: any) {
    console.error("Change password error:", error)
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 })
  }
}

