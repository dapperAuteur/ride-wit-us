"use client"

import { useState, useEffect } from "react"
import WalkingRunningPanel from "./panels/walking-running-panel"
import BikingPanel from "./panels/biking-panel"
import DrivingPanel from "./panels/driving-panel"
import DataEntryPanel from "./panels/data-entry-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Download, Settings } from "lucide-react"
import { exportToCSV } from "@/lib/csv-export"
import type { ActivityData } from "@/types/activity"
import SettingsDialog from "./settings-dialog"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { BackupSettings } from "@/types/settings"
import { generatePlaceholderData } from "@/lib/placeholder-data"

export default function Dashboard() {
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [backupSettings, setBackupSettings] = useLocalStorage<BackupSettings>("backup-settings", {
    enabled: true,
    time: "00:00",
  })

  // Load activities from local storage on component mount
  useEffect(() => {
    const storedActivities = localStorage.getItem("activities")
    if (storedActivities) {
      try {
        setActivities(JSON.parse(storedActivities))
      } catch (e) {
        console.error("Failed to parse stored activities:", e)
        // If parsing fails, load placeholder data
        setActivities(generatePlaceholderData())
      }
    } else {
      // If no data exists, load placeholder data
      setActivities(generatePlaceholderData())
    }
  }, [])

  // Save activities to local storage whenever they change
  useEffect(() => {
    if (activities.length > 0) {
      localStorage.setItem("activities", JSON.stringify(activities))
    }
  }, [activities])

  // Setup automatic backup
  useEffect(() => {
    if (!backupSettings.enabled) return

    const checkBackupTime = () => {
      const now = new Date()
      const [hours, minutes] = backupSettings.time.split(":").map(Number)

      if (now.getHours() === hours && now.getMinutes() === minutes) {
        exportToCSV(activities)
      }
    }

    // Check every minute
    const intervalId = setInterval(checkBackupTime, 60000)

    return () => clearInterval(intervalId)
  }, [activities, backupSettings.enabled, backupSettings.time])

  const handleAddActivity = (newActivity: ActivityData) => {
    setActivities((prev) => [...prev, newActivity])
  }

  const handleDownload = () => {
    exportToCSV(activities)
  }

  // For desktop: render all panels in a grid
  // For mobile: use tabs to switch between panels
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">RideWitUS</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isDesktop ? (
        <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[calc(100vh-120px)]">
          <WalkingRunningPanel activities={activities} />
          <BikingPanel activities={activities} />
          <DrivingPanel activities={activities} />
          <DataEntryPanel onAddActivity={handleAddActivity} />
        </div>
      ) : (
        <Tabs defaultValue="walking" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="walking">Walk/Run</TabsTrigger>
            <TabsTrigger value="biking">Bike</TabsTrigger>
            <TabsTrigger value="driving">Drive</TabsTrigger>
            <TabsTrigger value="entry">Add Data</TabsTrigger>
          </TabsList>
          <TabsContent value="walking" className="h-[calc(100vh-180px)]">
            <WalkingRunningPanel activities={activities} />
          </TabsContent>
          <TabsContent value="biking" className="h-[calc(100vh-180px)]">
            <BikingPanel activities={activities} />
          </TabsContent>
          <TabsContent value="driving" className="h-[calc(100vh-180px)]">
            <DrivingPanel activities={activities} />
          </TabsContent>
          <TabsContent value="entry" className="h-[calc(100vh-180px)]">
            <DataEntryPanel onAddActivity={handleAddActivity} />
          </TabsContent>
        </Tabs>
      )}

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={backupSettings}
        onSettingsChange={setBackupSettings}
      />
    </div>
  )
}

