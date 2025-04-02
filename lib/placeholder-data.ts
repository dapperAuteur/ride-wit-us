import type { ActivityData } from "@/types/activity"

// Function to generate a random date within the last 60 days
function getRandomDate(daysBack = 60): string {
  const today = new Date()
  const pastDate = new Date(today)
  pastDate.setDate(today.getDate() - Math.floor(Math.random() * daysBack))
  return pastDate.toISOString()
}

// Function to generate random placeholder data for each activity type
export function generatePlaceholderData(): ActivityData[] {
  const activities: ActivityData[] = []

  // Generate walking/running activities
  for (let i = 0; i < 15; i++) {
    const isWalking = Math.random() > 0.5
    activities.push({
      id: `walk-run-${i}`,
      date: getRandomDate(),
      type: isWalking ? "walking" : "running",
      distance: Number.parseFloat((Math.random() * 10 + 1).toFixed(2)), // 1-11 km
      duration: Math.floor(Math.random() * 120 + 30), // 30-150 minutes
      maintenanceCost: Number.parseFloat((Math.random() * 50 + 10).toFixed(2)), // $10-60 (shoes, etc.)
      notes: isWalking ? "Daily walk" : "Morning run",
    })
  }

  // Generate biking activities
  for (let i = 0; i < 10; i++) {
    activities.push({
      id: `bike-${i}`,
      date: getRandomDate(),
      type: "biking",
      distance: Number.parseFloat((Math.random() * 30 + 5).toFixed(2)), // 5-35 km
      duration: Math.floor(Math.random() * 180 + 45), // 45-225 minutes
      maintenanceCost: Number.parseFloat((Math.random() * 100 + 25).toFixed(2)), // $25-125 (bike maintenance)
      notes: "Bike ride",
    })
  }

  // Generate driving activities
  for (let i = 0; i < 12; i++) {
    activities.push({
      id: `drive-${i}`,
      date: getRandomDate(),
      type: "driving",
      distance: Number.parseFloat((Math.random() * 100 + 10).toFixed(2)), // 10-110 miles
      duration: Math.floor(Math.random() * 240 + 20), // 20-260 minutes
      maintenanceCost: Number.parseFloat((Math.random() * 200 + 50).toFixed(2)), // $50-250 (gas, maintenance)
      notes: "Car trip",
    })
  }

  // Sort by date (newest first)
  return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

