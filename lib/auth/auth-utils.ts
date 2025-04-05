import { hash, compare } from "bcryptjs"
import { sign, verify } from "jsonwebtoken"
import { v4 as uuidv4 } from "uuid"
import { executeSQL } from "@/lib/db/neon"

// Types for authentication
export interface User {
  id: string
  email: string
  name: string
  role: "USER" | "MANAGER" | "ADMIN"
  subscription_status: "FREE" | "MONTHLY" | "ANNUAL" | "NONE"
  subscription_expiry?: Date
  stripe_customer_id?: string
  created_at: Date
  updated_at: Date
}

export interface AuthResult {
  success: boolean
  user?: User
  token?: string
  error?: string
  errorCode?: string
  details?: any
}

// Hash password with proper error handling
export async function hashPassword(password: string): Promise<string> {
  try {
    return await hash(password, 10)
  } catch (error: any) {
    console.error("Password hashing error:", error)
    throw new Error(`Failed to hash password: ${error.message}`)
  }
}

// Compare password with proper error handling
export async function comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await compare(password, hashedPassword)
  } catch (error: any) {
    console.error("Password comparison error:", error)
    throw new Error(`Failed to compare passwords: ${error.message}`)
  }
}

// Generate JWT token
export function generateToken(user: Partial<User>): string {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set")
  }

  try {
    return sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    )
  } catch (error: any) {
    console.error("Token generation error:", error)
    throw new Error(`Failed to generate token: ${error.message}`)
  }
}

// Verify JWT token
export function verifyToken(token: string): any {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set")
  }

  try {
    return verify(token, process.env.JWT_SECRET)
  } catch (error: any) {
    console.error("Token verification error:", error)
    throw new Error(`Failed to verify token: ${error.message}`)
  }
}

// Register a new user with detailed error handling
export async function registerUser(email: string, password: string, name: string): Promise<AuthResult> {
  try {
    // Check if email is valid
    if (!email || !email.includes("@")) {
      return {
        success: false,
        error: "Invalid email address",
        errorCode: "INVALID_EMAIL",
      }
    }

    // Check if password meets requirements
    if (!password || password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters long",
        errorCode: "INVALID_PASSWORD",
      }
    }

    // Check if name is provided
    if (!name || name.trim() === "") {
      return {
        success: false,
        error: "Name is required",
        errorCode: "INVALID_NAME",
      }
    }

    // Check if user already exists
    const checkUser = await executeSQL("SELECT email FROM users WHERE email = $1", [email])

    if (!checkUser.success) {
      console.error("Database error during user check:", checkUser.error)
      return {
        success: false,
        error: "Database error during user check",
        errorCode: "DB_ERROR",
        details: checkUser.error,
      }
    }

    if (checkUser.data && checkUser.data.length > 0) {
      return {
        success: false,
        error: "User with this email already exists",
        errorCode: "USER_EXISTS",
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate user ID
    const userId = uuidv4()

    // Insert user into database
    const insertUser = await executeSQL(
      `INSERT INTO users (id, email, name, password, role, subscription_status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, role, subscription_status, created_at, updated_at`,
      [userId, email, name, hashedPassword, "USER", "FREE"],
    )

    if (!insertUser.success) {
      console.error("Database error during user creation:", insertUser.error)
      return {
        success: false,
        error: "Failed to create user account",
        errorCode: "DB_ERROR",
        details: insertUser.error,
      }
    }

    const user = insertUser.data[0]

    // Generate token
    const token = generateToken(user)

    return {
      success: true,
      user,
      token,
    }
  } catch (error: any) {
    console.error("Registration error:", error)
    return {
      success: false,
      error: `Registration failed: ${error.message}`,
      errorCode: "UNKNOWN_ERROR",
      details: error,
    }
  }
}

// Login user with detailed error handling
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    // Check if email and password are provided
    if (!email || !password) {
      return {
        success: false,
        error: "Email and password are required",
        errorCode: "MISSING_CREDENTIALS",
      }
    }

    // Get user from database
    const getUser = await executeSQL(
      "SELECT id, email, name, password, role, subscription_status, subscription_expiry, stripe_customer_id, created_at, updated_at FROM users WHERE email = $1",
      [email],
    )

    if (!getUser.success) {
      console.error("Database error during login:", getUser.error)
      return {
        success: false,
        error: "Database error during login",
        errorCode: "DB_ERROR",
        details: getUser.error,
      }
    }

    if (!getUser.data || getUser.data.length === 0) {
      return {
        success: false,
        error: "Invalid email or password",
        errorCode: "INVALID_CREDENTIALS",
      }
    }

    const user = getUser.data[0]

    // Compare passwords
    const passwordMatch = await comparePasswords(password, user.password)

    if (!passwordMatch) {
      return {
        success: false,
        error: "Invalid email or password",
        errorCode: "INVALID_CREDENTIALS",
      }
    }

    // Remove password from user object
    delete user.password

    // Generate token
    const token = generateToken(user)

    return {
      success: true,
      user,
      token,
    }
  } catch (error: any) {
    console.error("Login error:", error)
    return {
      success: false,
      error: `Login failed: ${error.message}`,
      errorCode: "UNKNOWN_ERROR",
      details: error,
    }
  }
}

// Get user by ID with detailed error handling
export async function getUserById(userId: string): Promise<AuthResult> {
  try {
    const getUser = await executeSQL(
      "SELECT id, email, name, role, subscription_status, subscription_expiry, stripe_customer_id, created_at, updated_at FROM users WHERE id = $1",
      [userId],
    )

    if (!getUser.success) {
      console.error("Database error while getting user:", getUser.error)
      return {
        success: false,
        error: "Database error while getting user",
        errorCode: "DB_ERROR",
        details: getUser.error,
      }
    }

    if (!getUser.data || getUser.data.length === 0) {
      return {
        success: false,
        error: "User not found",
        errorCode: "USER_NOT_FOUND",
      }
    }

    return {
      success: true,
      user: getUser.data[0],
    }
  } catch (error: any) {
    console.error("Get user error:", error)
    return {
      success: false,
      error: `Failed to get user: ${error.message}`,
      errorCode: "UNKNOWN_ERROR",
      details: error,
    }
  }
}

