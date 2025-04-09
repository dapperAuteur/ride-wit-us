import { NextResponse } from "next/server"
import { executeSQL } from "@/lib/db/neon"

export async function POST(request: Request) {
  try {
    const { query, params } = await request.json()

    if (!query) {
      return NextResponse.json({ success: false, message: "No SQL query provided" }, { status: 400 })
    }

    // Execute the SQL query with detailed error reporting
    const result = await executeSQL(query, params || [])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "SQL execution failed",
          error: result.error,
          details: result.details,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
