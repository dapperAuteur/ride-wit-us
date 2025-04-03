"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/date-utils"

export default function UserProfile() {
  const { user, signOut, deleteAccount } = useAuth()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  if (!user) {
    return null
  }

  const getSubscriptionBadge = () => {
    switch (user.subscriptionStatus) {
      case "monthly":
        return <Badge className="bg-green-500">Premium Monthly</Badge>
      case "annual":
        return <Badge className="bg-purple-500">Premium Annual</Badge>
      case "free":
        return <Badge>Free</Badge>
      default:
        return <Badge variant="outline">No Subscription</Badge>
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>Manage your account settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Name</p>
          <p>{user.name}</p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Email</p>
          <p>{user.email}</p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Role</p>
          <p className="capitalize">{user.role}</p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Subscription</p>
          <div className="flex items-center gap-2">
            {getSubscriptionBadge()}
            {user.subscriptionExpiry && (
              <span className="text-sm text-muted-foreground">
                Expires: {formatDate(user.subscriptionExpiry, true)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Account Created</p>
          <p>{formatDate(user.createdAt, true)}</p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => signOut()}>
            Sign Out
          </Button>
          <Button variant="destructive" className="flex-1" onClick={() => setIsDeleteDialogOpen(true)}>
            Delete Account
          </Button>
        </div>
      </CardFooter>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and all of your data from our
              servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAccount()} className="bg-destructive text-destructive-foreground">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

