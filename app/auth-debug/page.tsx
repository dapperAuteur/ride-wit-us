"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Shield, Loader2, User, Key } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AuthDebugPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [debugData, setDebugData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchDebugData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/debug")
      const data = await response.json()

      if (!data.success) {
        setError(data.error || "Failed to fetch debug data")
      } else {
        setDebugData(data)
      }
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugData()
  }, [])

  const createTestUser = async () => {
    try {
      setError(null)

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          password: "password123",
          name: "Test User",
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || "Failed to create test user")
      } else {
        // Refresh debug data
        fetchDebugData()
      }
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred")
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Authentication Debug
          </CardTitle>
          <CardDescription>Diagnose authentication issues and verify your setup</CardDescription>
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

          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : debugData ? (
            <Tabs defaultValue="database">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="database">Database</TabsTrigger>
                <TabsTrigger value="environment">Environment</TabsTrigger>
              </TabsList>

              <TabsContent value="database" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Database Connection</h3>
                  <Alert variant={debugData.database.connected ? "default" : "destructive"}>
                    {debugData.database.connected ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>{debugData.database.connected ? "Connected" : "Connection Failed"}</AlertTitle>
                    <AlertDescription>
                      {debugData.database.connected
                        ? `Connected to database. Server time: ${new Date(debugData.database.serverTime).toLocaleString()}`
                        : "Failed to connect to database. Check your DATABASE_URL environment variable."}
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Users Table</h3>
                  <Alert variant={debugData.database.usersTableExists ? "default" : "destructive"}>
                    {debugData.database.usersTableExists ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>{debugData.database.usersTableExists ? "Table Exists" : "Table Missing"}</AlertTitle>
                    <AlertDescription>
                      {debugData.database.usersTableExists
                        ? `Users table exists with ${debugData.database.userCount} users.`
                        : "Users table does not exist. Run the database setup at /db-setup to create it."}
                    </AlertDescription>
                  </Alert>
                </div>

                {debugData.database.usersTableExists && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Table Structure</h3>
                    <div className="bg-muted p-4 rounded-md overflow-auto max-h-60">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4">Column</th>
                            <th className="text-left py-2 px-4">Type</th>
                            <th className="text-left py-2 px-4">Nullable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debugData.database.tableStructure.map((column: any, index: number) => (
                            <tr key={index} className="border-b border-muted-foreground/20">
                              <td className="py-2 px-4 font-mono">{column.column_name}</td>
                              <td className="py-2 px-4">{column.data_type}</td>
                              <td className="py-2 px-4">{column.is_nullable}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button onClick={createTestUser} className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Create Test User
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="environment" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Environment Variables</h3>
                  <Alert variant={debugData.environment.jwtSecretExists ? "default" : "destructive"}>
                    {debugData.environment.jwtSecretExists ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {debugData.environment.jwtSecretExists ? "JWT Secret" : "JWT Secret Missing"}
                    </AlertTitle>
                    <AlertDescription>
                      {debugData.environment.jwtSecretExists
                        ? "JWT_SECRET environment variable is set."
                        : "JWT_SECRET environment variable is missing. Authentication will not work without it."}
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Node Environment</h3>
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertTitle>Node Environment</AlertTitle>
                    <AlertDescription>Running in {debugData.environment.nodeEnv} mode.</AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Data</AlertTitle>
              <AlertDescription>Failed to fetch debug data. Please try again.</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={fetchDebugData} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refresh
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/db-setup")}>
            Go to Database Setup
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
