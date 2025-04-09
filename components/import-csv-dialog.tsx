"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ActivityData, ActivityType } from "@/types/activity"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Upload } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ImportCSVDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (activities: ActivityData[]) => void
}

export default function ImportCSVDialog({ open, onOpenChange, onImport }: ImportCSVDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const parseCSV = (text: string): ActivityData[] => {
    try {
      const lines = text.split("\n")
      const headers = lines[0].split(",")

      // Validate headers
      const requiredHeaders = ["ID", "Date", "Type", "Distance", "Duration"]
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`)
      }

      const activities: ActivityData[] = []

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue

        const values = lines[i].split(",")
        if (values.length < 5) continue

        const idIndex = headers.indexOf("ID")
        const dateIndex = headers.indexOf("Date")
        const typeIndex = headers.indexOf("Type")
        const distanceIndex = headers.indexOf("Distance")
        const durationIndex = headers.indexOf("Duration")
        const maintenanceCostIndex = headers.indexOf("Maintenance Cost")
        const notesIndex = headers.indexOf("Notes")

        // Validate activity type
        const type = values[typeIndex]
        if (!["walking", "running", "biking", "driving"].includes(type)) {
          continue
        }

        const activity: ActivityData = {
          id: values[idIndex] || `imported-${Date.now()}-${i}`,
          date: new Date(values[dateIndex]).toISOString(),
          type: values[typeIndex] as ActivityType,
          distance: Number.parseFloat(values[distanceIndex]),
          duration: Number.parseFloat(values[durationIndex]),
        }

        if (maintenanceCostIndex !== -1 && values[maintenanceCostIndex]) {
          activity.maintenanceCost = Number.parseFloat(values[maintenanceCostIndex])
        }

        if (notesIndex !== -1 && values[notesIndex]) {
          activity.notes = values[notesIndex]
        }

        activities.push(activity)
      }

      return activities
    } catch (error) {
      console.error("Error parsing CSV:", error)
      throw error
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file to import")
      return
    }

    try {
      const text = await file.text()
      const activities = parseCSV(text)

      if (activities.length === 0) {
        setError("No valid activities found in the CSV file")
        return
      }

      onImport(activities)
      onOpenChange(false)
      setFile(null)
    } catch (error) {
      setError(`Error importing CSV: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Activities from CSV</DialogTitle>
          <DialogDescription>Upload a CSV file from a previous backup to import your activities.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-mode">Import Mode</Label>
            <Select value={importMode} onValueChange={(value) => setImportMode(value as "merge" | "replace")}>
              <SelectTrigger>
                <SelectValue placeholder="Select import mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">Merge with existing data</SelectItem>
                <SelectItem value="replace">Replace all existing data</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
