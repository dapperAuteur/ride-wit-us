import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // Clear auth cookie
    cookies().delete("auth_token")

    return NextResponse.json({ message: "Signed out successfully" })
  } catch (error) {
    console.error("Sign out error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
