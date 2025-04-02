"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ActivityData } from "@/types/activity"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { filterActivitiesByType, filterActivitiesByTimeRange } from "@/lib/activity-filters"
import ActivityChart from "../activity-chart"
import ActivityStats from "../activity-stats"

interface WalkingRunningPanelProps {
  activities: ActivityData[]
}

export default function WalkingRunningPanel({ activities }: WalkingRunningPanelProps) {
  const walkRunActivities = filterActivitiesByType(activities, ["walking", "running"])

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Walking & Running</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue="7days" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="7days">7 Days</TabsTrigger>
            <TabsTrigger value="4weeks">4 Weeks</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
          <TabsContent value="7days">
            <ActivityChart activities={filterActivitiesByTimeRange(walkRunActivities, 7)} type="walking/running" />
            <ActivityStats activities={filterActivitiesByTimeRange(walkRunActivities, 7)} type="walking/running" />
          </TabsContent>
          <TabsContent value="4weeks">
            <ActivityChart activities={filterActivitiesByTimeRange(walkRunActivities, 28)} type="walking/running" />
            <ActivityStats activities={filterActivitiesByTimeRange(walkRunActivities, 28)} type="walking/running" />
          </TabsContent>
          <TabsContent value="all">
            <ActivityChart activities={walkRunActivities} type="walking/running" />
            <ActivityStats activities={walkRunActivities} type="walking/running" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

