"use client"

import type { ActivityData } from "@/types/activity"
import { Card, CardContent } from "@/components/ui/card"
import { calculateTotalDistance, calculateAverageSpeed, calculateTotalMaintenanceCost } from "@/lib/activity-data"

interface ActivityStatsProps {
  activities: ActivityData[]
  type: string
}

export default function ActivityStats({ activities, type }: ActivityStatsProps) {
  const totalDistance = calculateTotalDistance(activities)
  const totalActivities = activities.length
  const averageSpeed = calculateAverageSpeed(activities)
  const totalMaintenanceCost = calculateTotalMaintenanceCost(activities)

  const unit = type.includes("driving") ? "miles" : "km"
  const speedUnit = type.includes("driving") ? "mph" : "km/h"

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-sm text-muted-foreground">Total Distance</div>
          <div className="text-2xl font-bold mt-1">
            {totalDistance.toFixed(1)} {unit}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-sm text-muted-foreground">Activities</div>
          <div className="text-2xl font-bold mt-1">{totalActivities}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-sm text-muted-foreground">Avg Speed</div>
          <div className="text-2xl font-bold mt-1">
            {averageSpeed.toFixed(1)} {speedUnit}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-sm text-muted-foreground">Maintenance</div>
          <div className="text-2xl font-bold mt-1">${totalMaintenanceCost.toFixed(2)}</div>
        </CardContent>
      </Card>
    </div>
  )
}

