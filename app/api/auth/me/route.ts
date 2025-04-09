import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken, getUserById } from "@/lib/auth/auth-utils"

export async function GET() {
  try {
    // Get the token from cookies
    const cookieStore = cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
          errorCode: "NOT_AUTHENTICATED",
        },
        { status: 401 },
      )
    }

    try {
      // Verify the token
      const decoded = verifyToken(token)

      // Get the user from the database
      const result = await getUserById(decoded.id)

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            errorCode: result.errorCode,
            details: process.env.NODE_ENV === "development" ? result.details : undefined,
          },
          { status: 404 },
        )
      }

      return NextResponse.json({
        success: true,
        user: result.user,
      })
    } catch (error: any) {
      // If token verification fails
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token",
          errorCode: "INVALID_TOKEN",
        },
        { status: 401 },
      )
    }
  } catch (error: any) {
    console.error("Auth me route error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Authentication check failed",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
