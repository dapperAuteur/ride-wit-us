import { NextResponse } from "next/server"
import { registerUser } from "@/lib/auth/auth-utils"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        {
          success: false,
          error: "Email, password, and name are required",
          errorCode: "MISSING_FIELDS",
        },
        { status: 400 },
      )
    }

    // Register user
    const result = await registerUser(email, password, name)

    if (!result.success) {
      // Return appropriate status code based on error
      let statusCode = 500

      if (result.errorCode === "USER_EXISTS") {
        statusCode = 409 // Conflict
      } else if (
        ["INVALID_EMAIL", "INVALID_PASSWORD", "INVALID_NAME", "MISSING_CREDENTIALS"].includes(result.errorCode || "")
      ) {
        statusCode = 400 // Bad Request
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          details: process.env.NODE_ENV === "development" ? result.details : undefined,
        },
        { status: statusCode },
      )
    }

    // Set cookie with token
    const response = NextResponse.json({
      success: true,
      user: result.user,
    })

    response.cookies.set({
      name: "auth_token",
      value: result.token || "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error: any) {
    console.error("Registration route error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Registration failed",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

