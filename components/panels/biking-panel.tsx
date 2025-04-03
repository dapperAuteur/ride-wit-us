"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ActivityData } from "@/types/activity"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { filterActivitiesByType, filterActivitiesByTimeRange } from "@/lib/activity-filters"
import ActivityChart from "../activity-chart"
import ActivityStats from "../activity-stats"

interface BikingPanelProps {
  activities: ActivityData[]
}

export default function BikingPanel({ activities }: BikingPanelProps) {
  const bikingActivities = filterActivitiesByType(activities, ["biking"])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle>Biking</CardTitle>
      </CardHeader>
      <CardContent className="p-4 overflow-auto flex-grow">
        <Tabs defaultValue="7days" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4 sticky top-0 bg-card z-10">
            <TabsTrigger value="7days">7 Days</TabsTrigger>
            <TabsTrigger value="4weeks">4 Weeks</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
          <TabsContent value="7days">
            <ActivityChart activities={filterActivitiesByTimeRange(bikingActivities, 7)} type="biking" />
            <ActivityStats activities={filterActivitiesByTimeRange(bikingActivities, 7)} type="biking" />
          </TabsContent>
          <TabsContent value="4weeks">
            <ActivityChart activities={filterActivitiesByTimeRange(bikingActivities, 28)} type="biking" />
            <ActivityStats activities={filterActivitiesByTimeRange(bikingActivities, 28)} type="biking" />
          </TabsContent>
          <TabsContent value="all">
            <ActivityChart activities={bikingActivities} type="biking" />
            <ActivityStats activities={bikingActivities} type="biking" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

