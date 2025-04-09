"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import UserProfile from "@/components/auth/user-profile"
import { UpdateProfileForm } from "@/components/auth/update-profile-form"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import MainNav from "@/components/nav/main-nav"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MainNav />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MainNav />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Not Signed In</h1>
            <p className="text-muted-foreground">Please sign in to view your profile</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      <div className="container mx-auto p-4 flex-1">
        <h1 className="text-3xl font-bold mb-6">Your Account</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-3xl mx-auto">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="update">Update Info</TabsTrigger>
            <TabsTrigger value="password">Change Password</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>

          <TabsContent value="update">
            <UpdateProfileForm />
          </TabsContent>

          <TabsContent value="password">
            <ChangePasswordForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

