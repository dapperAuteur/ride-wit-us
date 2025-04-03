export type UserRole = "user" | "manager" | "admin"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  subscriptionStatus: "free" | "monthly" | "annual" | "none"
  subscriptionExpiry?: string
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}

