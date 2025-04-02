import type { ActivityData } from "@/types/activity"

export function exportToCSV(activities: ActivityData[]): void {
  if (activities.length === 0) {
    alert("No activities to export")
    return
  }

  // CSV header
  const headers = ["ID", "Date", "Type", "Distance", "Duration", "Maintenance Cost", "Notes"]

  // Convert activities to CSV rows
  const rows = activities.map((activity) => [
    activity.id,
    new Date(activity.date).toLocaleDateString(),
    activity.type,
    activity.distance.toString(),
    activity.duration.toString(),
    activity.maintenanceCost ? activity.maintenanceCost.toString() : "0",
    activity.notes || "",
  ])

  // Combine header and rows
  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

  // Create a blob and download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  // Set up download attributes
  link.setAttribute("href", url)
  link.setAttribute("download", `activity-data-${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"

  // Add to document, trigger download, and clean up
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

