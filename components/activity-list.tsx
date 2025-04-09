"use client"

import { useState } from "react"
import type { ActivityData } from "@/types/activity"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, ChevronDown, ChevronUp } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import EditActivityDialog from "./edit-activity-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUnit } from "@/contexts/unit-context"
import { convertDistance } from "@/lib/unit-conversion"

interface ActivityListProps {
  activities: ActivityData[]
  onUpdateActivity: (updatedActivity: ActivityData) => void
  onDeleteActivity: (id: string) => void
  title?: string
}

export default function ActivityList({
  activities,
  onUpdateActivity,
  onDeleteActivity,
  title = "Recent Activities",
}: ActivityListProps) {
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sortField, setSortField] = useState<keyof ActivityData>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const itemsPerPage = 5
  const { unit } = useUnit()

  const handleSort = (field: keyof ActivityData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const sortedActivities = [...activities].sort((a, b) => {
    if (sortField === "date") {
      return sortDirection === "asc"
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime()
    }

    if (sortField === "type") {
      return sortDirection === "asc" ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type)
    }

    const aValue = a[sortField]
    const bValue = b[sortField]

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  const paginatedActivities = sortedActivities.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const totalPages = Math.ceil(activities.length / itemsPerPage)

  const handleEdit = (activity: ActivityData) => {
    setEditingActivity(activity)
    setIsDialogOpen(true)
  }

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case "walking":
        return "Walking"
      case "running":
        return "Running"
      case "biking":
        return "Biking"
      case "driving":
        return "Driving"
      default:
        return type
    }
  }

  const getDisplayDistance = (activity: ActivityData) => {
    const isDriving = activity.type === "driving"
    let distance = activity.distance

    if (isDriving && unit === "km") {
      // Convert miles to km for driving
      distance = convertDistance(distance, "miles", "km")
    } else if (!isDriving && unit === "miles") {
      // Convert km to miles for non-driving
      distance = convertDistance(distance, "km", "miles")
    }

    return `${distance.toFixed(1)} ${unit}`
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 overflow-auto flex-grow">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort("date")}>
                <div className="flex items-center">
                  Date
                  {sortField === "date" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("type")}>
                <div className="flex items-center">
                  Type
                  {sortField === "type" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort("distance")}>
                <div className="flex items-center justify-end">
                  Distance
                  {sortField === "distance" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort("duration")}>
                <div className="flex items-center justify-end">
                  Duration
                  {sortField === "duration" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedActivities.length > 0 ? (
              paginatedActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>{formatDate(activity.date, true)}</TableCell>
                  <TableCell>{getActivityTypeLabel(activity.type)}</TableCell>
                  <TableCell className="text-right">{getDisplayDistance(activity)}</TableCell>
                  <TableCell className="text-right">{activity.duration} min</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(activity)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No activities found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 sticky bottom-0 bg-card pt-2 pb-1 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        <EditActivityDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          activity={editingActivity}
          onSave={onUpdateActivity}
          onDelete={onDeleteActivity}
        />
      </CardContent>
    </Card>
  )
}

