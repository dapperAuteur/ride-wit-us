"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User, AuthState } from "@/types/auth"

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
  updateUser: (user: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  })

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const data = await response.json()
          setAuthState({
            user: data.user,
            isLoading: false,
            error: null,
          })
        } else {
          setAuthState({
            user: null,
            isLoading: false,
            error: null,
          })
        }
      } catch (error) {
        setAuthState({
          user: null,
          isLoading: false,
          error: "Failed to check authentication status",
        })
      }
    }

    checkAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setAuthState({
          user: data.user,
          isLoading: false,
          error: null,
        })
      } else {
        const error = await response.json()
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.error || "Failed to sign in",
        }))
      }
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: "An unexpected error occurred",
      }))
    }
  }

  const signUp = async (name: string, email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setAuthState({
          user: data.user,
          isLoading: false,
          error: null,
        })
      } else {
        const error = await response.json()
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.error || "Failed to sign up",
        }))
      }
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: "An unexpected error occurred",
      }))
    }
  }

  const signOut = async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      })

      if (response.ok) {
        setAuthState({
          user: null,
          isLoading: false,
          error: null,
        })
      } else {
        const error = await response.json()
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.error || "Failed to sign out",
        }))
      }
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: "An unexpected error occurred",
      }))
    }
  }

  const deleteAccount = async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      })

      if (response.ok) {
        setAuthState({
          user: null,
          isLoading: false,
          error: null,
        })
      } else {
        const error = await response.json()
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.error || "Failed to delete account",
        }))
      }
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: "An unexpected error occurred",
      }))
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (!authState.user) return

    setAuthState((prev) => ({
      ...prev,
      user: { ...prev.user!, ...userData },
    }))
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        signIn,
        signUp,
        signOut,
        deleteAccount,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
