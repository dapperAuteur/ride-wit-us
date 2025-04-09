"use client"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ActivityData, ActivityType } from "@/types/activity"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EditActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: ActivityData | null
  onSave: (updatedActivity: ActivityData) => void
  onDelete: (id: string) => void
}

export default function EditActivityDialog({
  open,
  onOpenChange,
  activity,
  onSave,
  onDelete,
}: EditActivityDialogProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [type, setType] = useState<ActivityType>("walking")
  const [distance, setDistance] = useState("")
  const [duration, setDuration] = useState("")
  const [maintenanceCost, setMaintenanceCost] = useState("")
  const [notes, setNotes] = useState("")

  // Update form when activity changes
  useEffect(() => {
    if (activity) {
      setDate(new Date(activity.date))
      setType(activity.type)
      setDistance(activity.distance.toString())
      setDuration(activity.duration.toString())
      setMaintenanceCost(activity.maintenanceCost?.toString() || "")
      setNotes(activity.notes || "")
    }
  }, [activity])

  const handleSave = () => {
    if (!activity || !distance || !duration) return

    const updatedActivity: ActivityData = {
      ...activity,
      date: date.toISOString(),
      type,
      distance: Number.parseFloat(distance),
      duration: Number.parseFloat(duration),
      maintenanceCost: maintenanceCost ? Number.parseFloat(maintenanceCost) : undefined,
      notes,
    }

    onSave(updatedActivity)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (!activity) return
    onDelete(activity.id)
    onOpenChange(false)
  }

  if (!activity) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
          <DialogDescription>Make changes to your activity record.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="edit-date"
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
            <Label htmlFor="edit-type">Activity Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as ActivityType)}>
              <SelectTrigger id="edit-type">
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
            <Label htmlFor="edit-distance">Distance ({type === "driving" ? "miles" : "km"})</Label>
            <Input
              id="edit-distance"
              type="number"
              step="0.01"
              min="0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-duration">Duration (minutes)</Label>
            <Input
              id="edit-duration"
              type="number"
              step="1"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-maintenance">Monthly Maintenance Cost ($)</Label>
            <Input
              id="edit-maintenance"
              type="number"
              step="0.01"
              min="0"
              value={maintenanceCost}
              onChange={(e) => setMaintenanceCost(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Input id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
