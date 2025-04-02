export type ActivityType = "walking" | "running" | "biking" | "driving"

export interface ActivityData {
  id: string
  date: string
  type: ActivityType
  distance: number
  duration: number
  maintenanceCost?: number
  notes?: string
}

