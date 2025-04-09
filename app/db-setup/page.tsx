"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Database, Loader2 } from "lucide-react"

export default function DatabaseSetupPage() {
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [setupStatus, setSetupStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [seedStatus, setSeedStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setIsTestingConnection(true)
    setError(null)

    try {
      const response = await fetch("/api/db-test")
      const data = await response.json()

      setConnectionStatus({
        success: data.success,
        message: data.message || data.details || "Connection test completed",
      })
    } catch (error: any) {
      setConnectionStatus({
        success: false,
        message: "Connection test failed",
      })
      setError(error.message || "An unexpected error occurred")
    } finally {
      setIsTestingConnection(false)
    }
  }

  const setupDatabase = async () => {
    setIsSettingUp(true)
    setError(null)

    try {
      const response = await fetch("/api/db-setup", {
        method: "POST",
      })
      const data = await response.json()

      setSetupStatus({
        success: data.success,
        message: data.message || "Database setup completed",
      })

      if (!data.success && data.error) {
        setError(data.error)
      }
    } catch (error: any) {
      setSetupStatus({
        success: false,
        message: "Database setup failed",
      })
      setError(error.message || "An unexpected error occurred")
    } finally {
      setIsSettingUp(false)
    }
  }

  const seedDatabase = async () => {
    setIsSeeding(true)
    setError(null)

    try {
      const response = await fetch("/api/db-seed", {
        method: "POST",
      })
      const data = await response.json()

      setSeedStatus({
        success: data.success,
        message: data.message || "Database seeding completed",
      })

      if (!data.success && data.error) {
        setError(data.error)
      }
    } catch (error: any) {
      setSeedStatus({
        success: false,
        message: "Database seeding failed",
      })
      setError(error.message || "An unexpected error occurred")
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Database Setup
          </CardTitle>
          <CardDescription>Set up and initialize your Neon PostgreSQL database for RideWitUS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="text-sm font-mono bg-destructive/20 p-2 rounded overflow-auto max-h-40">{error}</div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Step 1: Test Database Connection</h3>
            <p className="text-sm text-muted-foreground">
              Verify that your application can connect to the Neon PostgreSQL database.
            </p>

            {connectionStatus && (
              <Alert variant={connectionStatus.success ? "default" : "destructive"}>
                {connectionStatus.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{connectionStatus.success ? "Connection Successful" : "Connection Failed"}</AlertTitle>
                <AlertDescription>{connectionStatus.message}</AlertDescription>
              </Alert>
            )}

            <Button onClick={testConnection} disabled={isTestingConnection} className="mt-2">
              {isTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Step 2: Create Database Tables</h3>
            <p className="text-sm text-muted-foreground">
              Create the necessary tables for users, activities, and pricing tiers.
            </p>

            {setupStatus && (
              <Alert variant={setupStatus.success ? "default" : "destructive"}>
                {setupStatus.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{setupStatus.success ? "Setup Successful" : "Setup Failed"}</AlertTitle>
                <AlertDescription>{setupStatus.message}</AlertDescription>
              </Alert>
            )}

            <Button onClick={setupDatabase} disabled={isSettingUp || !connectionStatus?.success} className="mt-2">
              {isSettingUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Tables
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Step 3: Seed Initial Data</h3>
            <p className="text-sm text-muted-foreground">Create an admin user and default pricing tiers.</p>

            {seedStatus && (
              <Alert variant={seedStatus.success ? "default" : "destructive"}>
                {seedStatus.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{seedStatus.success ? "Seeding Successful" : "Seeding Failed"}</AlertTitle>
                <AlertDescription>{seedStatus.message}</AlertDescription>
              </Alert>
            )}

            <Button onClick={seedDatabase} disabled={isSeeding || !setupStatus?.success} className="mt-2">
              {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Seed Database
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            After completing these steps, your database will be ready to use with the RideWitUS application.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
