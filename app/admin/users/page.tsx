import AdminLayout from "@/components/admin/admin-layout"
import UserManagement from "@/components/admin/user-management"
import MainNav from "@/components/nav/main-nav"

export default function AdminUsersPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      <AdminLayout>
        <UserManagement />
      </AdminLayout>
    </div>
  )
}

