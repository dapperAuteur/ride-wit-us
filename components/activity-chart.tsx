"use client"

import { useEffect, useRef } from "react"
import type { ActivityData } from "@/types/activity"
import { Card } from "@/components/ui/card"
import { groupActivitiesByDay, calculateDailyTotals } from "@/lib/activity-data"
import { formatDate } from "@/lib/date-utils"
import { useUnit } from "@/contexts/unit-context"
import { convertDistance } from "@/lib/unit-conversion"

interface ActivityChartProps {
  activities: ActivityData[]
  type: string
}

export default function ActivityChart({ activities, type }: ActivityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { unit } = useUnit()

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (activities.length === 0) {
      // Draw "No data" message
      ctx.fillStyle = "#9ca3af" // gray-400
      ctx.font = "14px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("No activity data available", canvas.width / 2, canvas.height / 2)
      return
    }

    // Group activities by day
    const groupedActivities = groupActivitiesByDay(activities)
    const dailyTotals = calculateDailyTotals(groupedActivities)

    // Convert distances based on the selected unit
    const convertedDailyTotals = dailyTotals.map((day) => {
      const isDriving = type.includes("driving")
      let distance = day.distance

      if (isDriving && unit === "km") {
        // Convert miles to km for driving
        distance = convertDistance(distance, "miles", "km")
      } else if (!isDriving && unit === "miles") {
        // Convert km to miles for non-driving
        distance = convertDistance(distance, "km", "miles")
      }

      return { ...day, distance }
    })

    // Find max values for scaling
    const maxDistance = Math.max(...convertedDailyTotals.map((day) => day.distance), 0.1) // Prevent division by zero

    // Chart dimensions
    const padding = 40
    const chartWidth = canvas.width - padding * 2
    const chartHeight = canvas.height - padding * 2

    // Draw axes
    ctx.strokeStyle = "#4b5563" // gray-600
    ctx.lineWidth = 1

    // X-axis
    ctx.beginPath()
    ctx.moveTo(padding, canvas.height - padding)
    ctx.lineTo(canvas.width - padding, canvas.height - padding)
    ctx.stroke()

    // Y-axis
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, canvas.height - padding)
    ctx.stroke()

    // Draw bars
    const barWidth = Math.max(chartWidth / Math.max(convertedDailyTotals.length, 1) - 10, 5)

    convertedDailyTotals.forEach((day, index) => {
      const x = padding + index * (chartWidth / Math.max(convertedDailyTotals.length, 1)) + 5
      const barHeight = (day.distance / maxDistance) * chartHeight
      const y = canvas.height - padding - barHeight

      // Draw bar
      ctx.fillStyle = "#3b82f6" // blue-500
      ctx.fillRect(x, y, barWidth, barHeight)

      // Draw date label
      ctx.fillStyle = "#9ca3af" // gray-400
      ctx.font = "10px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(formatDate(day.date), x + barWidth / 2, canvas.height - padding + 15)

      // Draw distance value
      ctx.fillStyle = "#e5e7eb" // gray-200
      ctx.font = "10px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(day.distance.toFixed(1) + " " + unit, x + barWidth / 2, y - 5)
    })

    // Draw Y-axis labels
    ctx.fillStyle = "#9ca3af" // gray-400
    ctx.font = "10px Inter, sans-serif"
    ctx.textAlign = "right"

    for (let i = 0; i <= 5; i++) {
      const value = (maxDistance / 5) * i
      const y = canvas.height - padding - (chartHeight / 5) * i
      ctx.fillText(value.toFixed(1), padding - 5, y + 3)
    }

    // Draw title
    ctx.fillStyle = "#e5e7eb" // gray-200
    ctx.font = "12px Inter, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(`Distance (${unit})`, canvas.width / 2, 15)
  }, [activities, type, unit])

  return (
    <Card className="p-2 mb-4">
      <canvas ref={canvasRef} width={500} height={200} className="w-full h-[200px]" />
    </Card>
  )
}

