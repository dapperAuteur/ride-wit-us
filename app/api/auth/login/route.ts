import { NextResponse } from "next/server"
import { loginUser } from "@/lib/auth/auth-utils"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password are required",
          errorCode: "MISSING_CREDENTIALS",
        },
        { status: 400 },
      )
    }

    // Login user
    const result = await loginUser(email, password)

    if (!result.success) {
      // Return appropriate status code based on error
      let statusCode = 500

      if (result.errorCode === "INVALID_CREDENTIALS") {
        statusCode = 401 // Unauthorized
      } else if (result.errorCode === "MISSING_CREDENTIALS") {
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
    console.error("Login route error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Login failed",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
