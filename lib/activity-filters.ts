import type { ActivityData, ActivityType } from "@/types/activity"

export function filterActivitiesByType(activities: ActivityData[], types: ActivityType[]): ActivityData[] {
  return activities.filter((activity) => types.includes(activity.type))
}

export function filterActivitiesByTimeRange(activities: ActivityData[], days: number): ActivityData[] {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  return activities.filter((activity) => {
    const activityDate = new Date(activity.date)
    return activityDate >= cutoffDate
  })
}
