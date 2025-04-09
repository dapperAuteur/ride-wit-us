import type { ActivityData } from "@/types/activity"

interface DailyTotal {
  date: string
  distance: number
  duration: number
  maintenanceCost: number
}

export function groupActivitiesByDay(activities: ActivityData[]): Record<string, ActivityData[]> {
  const grouped: Record<string, ActivityData[]> = {}

  activities.forEach((activity) => {
    const date = new Date(activity.date)
    const dateString = date.toISOString().split("T")[0]

    if (!grouped[dateString]) {
      grouped[dateString] = []
    }

    grouped[dateString].push(activity)
  })

  return grouped
}

export function calculateDailyTotals(groupedActivities: Record<string, ActivityData[]>): DailyTotal[] {
  const dailyTotals: DailyTotal[] = []

  Object.entries(groupedActivities).forEach(([date, activities]) => {
    const totalDistance = activities.reduce((sum, activity) => sum + activity.distance, 0)
    const totalDuration = activities.reduce((sum, activity) => sum + activity.duration, 0)
    const totalMaintenanceCost = activities.reduce((sum, activity) => sum + (activity.maintenanceCost || 0), 0)

    dailyTotals.push({
      date,
      distance: totalDistance,
      duration: totalDuration,
      maintenanceCost: totalMaintenanceCost,
    })
  })

  // Sort by date
  return dailyTotals.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function calculateTotalDistance(activities: ActivityData[]): number {
  return activities.reduce((sum, activity) => sum + activity.distance, 0)
}

export function calculateAverageSpeed(activities: ActivityData[]): number {
  if (activities.length === 0) return 0

  const totalDistance = calculateTotalDistance(activities)
  const totalDuration = activities.reduce((sum, activity) => sum + activity.duration, 0)

  // Convert duration from minutes to hours
  const totalHours = totalDuration / 60

  return totalHours > 0 ? totalDistance / totalHours : 0
}

export function calculateTotalMaintenanceCost(activities: ActivityData[]): number {
  return activities.reduce((sum, activity) => sum + (activity.maintenanceCost || 0), 0)
}
