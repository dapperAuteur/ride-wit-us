"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ActivityData } from "@/types/activity"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ActivityList from "../activity-list"
import { filterActivitiesByType } from "@/lib/activity-filters"
import { Import, Trash2 } from "lucide-react"

interface ActivityManagementPanelProps {
  activities: ActivityData[]
  onUpdateActivity: (updatedActivity: ActivityData) => void
  onDeleteActivity: (id: string) => void
  onImportClick: () => void
  onClearDataClick: () => void
}

export default function ActivityManagementPanel({
  activities,
  onUpdateActivity,
  onDeleteActivity,
  onImportClick,
  onClearDataClick,
}: ActivityManagementPanelProps) {
  const walkingRunningActivities = filterActivitiesByType(activities, ["walking", "running"])
  const bikingActivities = filterActivitiesByType(activities, ["biking"])
  const drivingActivities = filterActivitiesByType(activities, ["driving"])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle>Manage Activities</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onImportClick}>
            <Import className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="destructive" size="sm" onClick={onClearDataClick}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 overflow-auto flex-grow">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4 sticky top-0 bg-card z-10">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="walking">Walk/Run</TabsTrigger>
            <TabsTrigger value="biking">Bike</TabsTrigger>
            <TabsTrigger value="driving">Drive</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <ActivityList
              activities={activities}
              onUpdateActivity={onUpdateActivity}
              onDeleteActivity={onDeleteActivity}
              title="All Activities"
            />
          </TabsContent>
          <TabsContent value="walking">
            <ActivityList
              activities={walkingRunningActivities}
              onUpdateActivity={onUpdateActivity}
              onDeleteActivity={onDeleteActivity}
              title="Walking & Running Activities"
            />
          </TabsContent>
          <TabsContent value="biking">
            <ActivityList
              activities={bikingActivities}
              onUpdateActivity={onUpdateActivity}
              onDeleteActivity={onDeleteActivity}
              title="Biking Activities"
            />
          </TabsContent>
          <TabsContent value="driving">
            <ActivityList
              activities={drivingActivities}
              onUpdateActivity={onUpdateActivity}
              onDeleteActivity={onDeleteActivity}
              title="Driving Activities"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
