"use client"

import { useState, useEffect } from "react"
import WalkingRunningPanel from "./panels/walking-running-panel"
import BikingPanel from "./panels/biking-panel"
import DrivingPanel from "./panels/driving-panel"
import DataEntryPanel from "./panels/data-entry-panel"
import ActivityManagementPanel from "./panels/activity-management-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Download, Settings, List, CloudIcon as CloudSync } from "lucide-react"
import { exportToCSV } from "@/lib/csv-export"
import type { ActivityData } from "@/types/activity"
import SettingsDialog from "./settings-dialog"
import ImportCSVDialog from "./import-csv-dialog"
import ClearDataDialog from "./clear-data-dialog"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { BackupSettings } from "@/types/settings"
import { generatePlaceholderData } from "@/lib/placeholder-data"
import { useAuth } from "@/contexts/auth-context"
import DataSync from "./sync/data-sync"
import MainNav from "./nav/main-nav"
import UnitToggle from "./unit-toggle"

export default function Dashboard() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [clearDataOpen, setClearDataOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("walking")
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

  // Sync with MongoDB if user is premium
  useEffect(() => {
    const syncWithMongoDB = async () => {
      if (!user) return
      if (user.subscriptionStatus !== "monthly" && user.subscriptionStatus !== "annual") return

      try {
        // First, try to download from cloud
        const downloadResponse = await fetch("/api/sync/download")

        if (downloadResponse.ok) {
          const data = await downloadResponse.json()
          if (data.activities && data.activities.length > 0) {
            setActivities(data.activities)
            return
          }
        }

        // If no cloud data, upload local data
        if (activities.length > 0) {
          await fetch("/api/sync/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ activities }),
          })
        }
      } catch (error) {
        console.error("Error syncing with MongoDB:", error)
      }
    }

    syncWithMongoDB()
  }, [user, activities])

  const handleAddActivity = (newActivity: ActivityData) => {
    setActivities((prev) => [...prev, newActivity])
  }

  const handleUpdateActivity = (updatedActivity: ActivityData) => {
    setActivities((prev) => prev.map((activity) => (activity.id === updatedActivity.id ? updatedActivity : activity)))
  }

  const handleDeleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((activity) => activity.id !== id))
  }

  const handleImportActivities = (importedActivities: ActivityData[]) => {
    // Check if we're replacing or merging
    if (document.querySelector('select[value="replace"]')?.getAttribute("aria-selected") === "true") {
      setActivities(importedActivities)
    } else {
      // Merge with existing activities, avoiding duplicates by ID
      const existingIds = new Set(activities.map((a) => a.id))
      const newActivities = importedActivities.filter((a) => !existingIds.has(a.id))
      setActivities((prev) => [...prev, ...newActivities])
    }
  }

  const handleClearData = () => {
    setActivities([])
    localStorage.removeItem("activities")
  }

  const handleDownload = () => {
    exportToCSV(activities)
  }

  const isPremiumUser = user?.subscriptionStatus === "monthly" || user?.subscriptionStatus === "annual"

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />

      <div className="container mx-auto p-4 flex-grow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Activity Dashboard</h1>
          <div className="flex gap-2">
            <UnitToggle />
            {isPremiumUser && (
              <Button variant="outline" size="icon" onClick={() => setSyncOpen(!syncOpen)}>
                <CloudSync className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {syncOpen && (
          <div className="mb-6">
            <DataSync activities={activities} onUpdateActivities={setActivities} />
          </div>
        )}

        {isDesktop ? (
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[calc(100vh-220px)] max-h-[calc(100vh-220px)]">
            <WalkingRunningPanel activities={activities} />
            <BikingPanel activities={activities} />
            <DrivingPanel activities={activities} />
            <Tabs defaultValue="entry" className="w-full h-full flex flex-col">
              <TabsList className="grid grid-cols-2 mb-4 flex-shrink-0">
                <TabsTrigger value="entry">Add Data</TabsTrigger>
                <TabsTrigger value="manage">Manage</TabsTrigger>
              </TabsList>
              <TabsContent value="entry" className="flex-grow overflow-hidden">
                <DataEntryPanel onAddActivity={handleAddActivity} />
              </TabsContent>
              <TabsContent value="manage" className="flex-grow overflow-hidden">
                <ActivityManagementPanel
                  activities={activities}
                  onUpdateActivity={handleUpdateActivity}
                  onDeleteActivity={handleDeleteActivity}
                  onImportClick={() => setImportOpen(true)}
                  onClearDataClick={() => setClearDataOpen(true)}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-[calc(100vh-220px)]">
            <TabsList className="grid grid-cols-5 mb-4 flex-shrink-0">
              <TabsTrigger value="walking">Walk/Run</TabsTrigger>
              <TabsTrigger value="biking">Bike</TabsTrigger>
              <TabsTrigger value="driving">Drive</TabsTrigger>
              <TabsTrigger value="entry">Add</TabsTrigger>
              <TabsTrigger value="manage">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            <TabsContent value="walking" className="flex-grow overflow-hidden">
              <WalkingRunningPanel activities={activities} />
            </TabsContent>
            <TabsContent value="biking" className="flex-grow overflow-hidden">
              <BikingPanel activities={activities} />
            </TabsContent>
            <TabsContent value="driving" className="flex-grow overflow-hidden">
              <DrivingPanel activities={activities} />
            </TabsContent>
            <TabsContent value="entry" className="flex-grow overflow-hidden">
              <DataEntryPanel onAddActivity={handleAddActivity} />
            </TabsContent>
            <TabsContent value="manage" className="flex-grow overflow-hidden">
              <ActivityManagementPanel
                activities={activities}
                onUpdateActivity={handleUpdateActivity}
                onDeleteActivity={handleDeleteActivity}
                onImportClick={() => setImportOpen(true)}
                onClearDataClick={() => setClearDataOpen(true)}
              />
            </TabsContent>
          </Tabs>
        )}

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={backupSettings}
          onSettingsChange={setBackupSettings}
        />

        <ImportCSVDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImportActivities} />

        <ClearDataDialog open={clearDataOpen} onOpenChange={setClearDataOpen} onConfirm={handleClearData} />
      </div>
    </div>
  )
}

