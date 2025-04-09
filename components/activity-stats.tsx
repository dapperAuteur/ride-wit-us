"use client"

import type { ActivityData } from "@/types/activity"
import { Card, CardContent } from "@/components/ui/card"
import { calculateTotalDistance, calculateAverageSpeed, calculateTotalMaintenanceCost } from "@/lib/activity-data"
import { useUnit } from "@/contexts/unit-context"
import { convertDistance } from "@/lib/unit-conversion"

interface ActivityStatsProps {
  activities: ActivityData[]
  type: string
}

export default function ActivityStats({ activities, type }: ActivityStatsProps) {
  const { unit } = useUnit()

  const totalDistance = calculateTotalDistance(activities)
  const totalActivities = activities.length
  const averageSpeed = calculateAverageSpeed(activities)
  const totalMaintenanceCost = calculateTotalMaintenanceCost(activities)

  // Convert values based on the selected unit
  const displayDistance =
    type.includes("driving") && unit === "km"
      ? convertDistance(totalDistance, "miles", "km")
      : type.includes("driving")
        ? totalDistance
        : unit === "miles"
          ? convertDistance(totalDistance, "km", "miles")
          : totalDistance

  const displaySpeed =
    type.includes("driving") && unit === "km"
      ? convertDistance(averageSpeed, "miles", "km")
      : type.includes("driving")
        ? averageSpeed
        : unit === "miles"
          ? convertDistance(averageSpeed, "km", "miles")
          : averageSpeed

  const speedUnit = unit === "miles" ? "mph" : "km/h"

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-sm text-muted-foreground">Total Distance</div>
          <div className="text-2xl font-bold mt-1">
            {displayDistance.toFixed(1)} {unit}
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
            {displaySpeed.toFixed(1)} {speedUnit}
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

