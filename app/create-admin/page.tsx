"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CreateAdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const createAdmin = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/auth/create-admin", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create admin user")
        return
      }

      setSuccess("Admin user created successfully. You can now log in with admin@example.com and password admin123")
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Admin User</CardTitle>
          <CardDescription>Create or reset the admin user for testing purposes</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-50">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <p className="mb-4">This will create or reset the admin user with the following credentials:</p>
          <div className="bg-muted p-4 rounded-md mb-4">
            <p>
              <strong>Email:</strong> admin@example.com
            </p>
            <p>
              <strong>Password:</strong> admin123
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/login")}>
            Go to Login
          </Button>
          <Button onClick={createAdmin} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Admin User
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
