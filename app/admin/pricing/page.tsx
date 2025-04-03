import AdminLayout from "@/components/admin/admin-layout"
import PricingManagement from "@/components/admin/pricing-management"
import MainNav from "@/components/nav/main-nav"

export default function AdminPricingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      <AdminLayout>
        <PricingManagement />
      </AdminLayout>
    </div>
  )
}

