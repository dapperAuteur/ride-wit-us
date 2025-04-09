export type UserRole = "USER" | "MANAGER" | "ADMIN"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  subscriptionStatus: "FREE" | "MONTHLY" | "ANNUAL" | "NONE"
  subscriptionExpiry?: string
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}
