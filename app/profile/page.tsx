import UserProfile from "@/components/auth/user-profile"
import MainNav from "@/components/nav/main-nav"

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      <div className="flex-1 flex items-center justify-center p-4">
        <UserProfile />
      </div>
    </div>
  )
}

