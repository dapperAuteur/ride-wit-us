"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, DollarSign, Database, Settings } from "lucide-react"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Check if user has permission to access admin pages
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return (
      <Card className="w-full max-w-3xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You do not have permission to access the admin panel.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Determine active tab based on pathname
  const getActiveTab = () => {
    if (pathname.includes("/admin/users")) return "users"
    if (pathname.includes("/admin/pricing")) return "pricing"
    if (pathname.includes("/admin/data")) return "data"
    if (pathname.includes("/admin/settings")) return "settings"
    return "users" // Default tab
  }

  const handleTabChange = (value: string) => {
    router.push(`/admin/${value}`)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full mb-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="users" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          {user.role === "admin" && (
            <TabsTrigger value="pricing" className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="data" className="flex items-center">
            <Database className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {children}
    </div>
  )
}

