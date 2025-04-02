"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ActivityData, ActivityType } from "@/types/activity"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataEntryPanelProps {
  onAddActivity: (activity: ActivityData) => void
}

export default function DataEntryPanel({ onAddActivity }: DataEntryPanelProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [type, setType] = useState<ActivityType>("walking")
  const [distance, setDistance] = useState("")
  const [duration, setDuration] = useState("")
  const [maintenanceCost, setMaintenanceCost] = useState("")
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!distance || !duration) return

    const newActivity: ActivityData = {
      id: Date.now().toString(),
      date: date.toISOString(),
      type,
      distance: Number.parseFloat(distance),
      duration: Number.parseFloat(duration),
      maintenanceCost: maintenanceCost ? Number.parseFloat(maintenanceCost) : undefined,
      notes,
    }

    onAddActivity(newActivity)

    // Reset form
    setDistance("")
    setDuration("")
    setMaintenanceCost("")
    setNotes("")
  }

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="pb-2">
        <CardTitle>Add Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Activity Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as ActivityType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walking">Walking</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="biking">Biking</SelectItem>
                <SelectItem value="driving">Driving</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="distance">Distance ({type === "driving" ? "miles" : "km"})</Label>
            <Input
              id="distance"
              type="number"
              step="0.01"
              min="0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              step="1"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenanceCost">Monthly Maintenance Cost ($)</Label>
            <Input
              id="maintenanceCost"
              type="number"
              step="0.01"
              min="0"
              value={maintenanceCost}
              onChange={(e) => setMaintenanceCost(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button type="submit" className="w-full">
            Add Activity
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

