"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CloudIcon as CloudSync, Download, Upload } from "lucide-react"
import type { ActivityData } from "@/types/activity"

interface DataSyncProps {
  activities: ActivityData[]
  onUpdateActivities: (activities: ActivityData[]) => void
}

export default function DataSync({ activities, onUpdateActivities }: DataSyncProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isPaidUser = user?.subscriptionStatus === "monthly" || user?.subscriptionStatus === "annual"

  const handleSyncToCloud = async () => {
    if (!isPaidUser || !user) return

    setIsLoading("upload")
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/sync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ activities }),
      })

      if (response.ok) {
        setSuccess("Data successfully uploaded to cloud")
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const error = await response.json()
        setError(error.message || "Failed to upload data")
      }
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(null)
    }
  }

  const handleSyncFromCloud = async () => {
    if (!isPaidUser || !user) return

    setIsLoading("download")
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/sync/download")

      if (response.ok) {
        const data = await response.json()
        onUpdateActivities(data.activities)
        setSuccess("Data successfully downloaded from cloud")
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const error = await response.json()
        setError(error.message || "Failed to download data")
      }
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(null)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cloud Sync</CardTitle>
          <CardDescription>Sign in to sync your data across devices</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You need to be signed in to use cloud sync features.</p>
        </CardContent>
      </Card>
    )
  }

  if (!isPaidUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cloud Sync</CardTitle>
          <CardDescription>Upgrade to a premium plan to sync your data</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Cloud sync is available for premium subscribers only.</p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <a href="/subscription">View Premium Plans</a>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cloud Sync</CardTitle>
        <CardDescription>Sync your activity data across all your devices</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-50">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <p className="mb-4">
          Your data is automatically synced when you add or edit activities. You can also manually sync your data using
          the buttons below.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={handleSyncToCloud} disabled={isLoading !== null}>
            {isLoading === "upload" ? (
              <CloudSync className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload to Cloud
          </Button>

          <Button variant="outline" className="flex-1" onClick={handleSyncFromCloud} disabled={isLoading !== null}>
            {isLoading === "download" ? (
              <CloudSync className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download from Cloud
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

