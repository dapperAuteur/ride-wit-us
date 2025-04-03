import PricingPlans from "@/components/subscription/pricing-plans"
import MainNav from "@/components/nav/main-nav"

export default function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      <div className="container mx-auto p-4 flex-1">
        <h1 className="text-3xl font-bold mb-6">Subscription Plans</h1>
        <PricingPlans />
      </div>
    </div>
  )
}

