import { neon, neonConfig } from "@neondatabase/serverless"
import { Pool } from "@neondatabase/serverless"

// Configure neon to use WebSockets for better compatibility
neonConfig.fetchConnectionCache = true

// Create a connection string from environment variables
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// Create a SQL query executor with error handling
export const sql = neon(connectionString)

// Create a connection pool for more complex operations
let pool: Pool | null = null

export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString })
  }
  return pool
}

// Helper function to execute SQL with detailed error reporting
export async function executeSQL(
  query: string,
  params: any[] = [],
): Promise<{ success: boolean; data?: any; error?: string; details?: any }> {
  try {
    const result = await sql(query, params)
    return { success: true, data: result }
  } catch (error: any) {
    console.error("Database error:", error)

    // Extract detailed error information
    const errorDetails = {
      message: error.message,
      code: error.code,
      position: error.position,
      hint: error.hint,
      detail: error.detail,
      where: error.where,
      schema: error.schema,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      constraint: error.constraint,
    }

    return {
      success: false,
      error: error.message,
      details: errorDetails,
    }
  }
}

// Function to test the database connection
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await sql`SELECT NOW()`
    return {
      success: true,
      message: `Connected successfully. Server time: ${result[0].now}`,
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
    }
  }
}

