import { NextResponse } from "next/server"
import { createUpdatedAtTrigger } from "@/lib/db/triggers"

export async function POST() {
  try {
    const success = await createUpdatedAtTrigger()

    if (!success) {
      return NextResponse.json({ success: false, message: "Failed to create database triggers" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Database triggers created successfully",
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
