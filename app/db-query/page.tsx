"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Database, Loader2, Play } from "lucide-react"

export default function DatabaseQueryPage() {
  const [query, setQuery] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const executeQuery = async () => {
    if (!query.trim()) {
      setError("Please enter a SQL query")
      return
    }

    setIsExecuting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/db-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || data.message || "Query execution failed")
        if (data.details) {
          console.error("Query error details:", data.details)
        }
      } else {
        setResult(data.data)
      }
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred")
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Database Query Tool
          </CardTitle>
          <CardDescription>Execute SQL queries against your Neon PostgreSQL database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="query" className="text-sm font-medium">
              SQL Query
            </label>
            <Textarea
              id="query"
              placeholder="SELECT * FROM users;"
              className="font-mono h-32"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <Button onClick={executeQuery} disabled={isExecuting || !query.trim()} className="flex items-center gap-2">
            {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Execute Query
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="text-sm font-mono bg-destructive/20 p-2 rounded overflow-auto max-h-40">{error}</div>
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Query Result</h3>
              <div className="bg-muted p-4 rounded-md overflow-auto max-h-96">
                <pre className="text-sm font-mono">{JSON.stringify(result, null, 2)}</pre>
              </div>
              <p className="text-sm text-muted-foreground">
                {Array.isArray(result) ? `${result.length} rows returned` : "Query executed successfully"}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Use this tool to execute SQL queries for debugging and development purposes.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
