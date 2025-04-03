"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { type PricingTier, currentPricing } from "@/lib/pricing"
import { loadStripe } from "@stripe/stripe-js"

// Make sure to add your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

export default function PricingPlans() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleSubscribe = async (plan: PricingTier) => {
    if (!user) {
      window.location.href = "/signin?redirect=/subscription"
      return
    }

    if (plan.id === "free") {
      // Handle free plan subscription
      try {
        const response = await fetch("/api/subscription/downgrade", {
          method: "POST",
        })

        if (response.ok) {
          window.location.reload()
        }
      } catch (error) {
        console.error("Error downgrading subscription:", error)
      }
      return
    }

    setIsLoading(plan.id)

    try {
      const response = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          planId: plan.id,
        }),
      })

      const { sessionId } = await response.json()

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
    } finally {
      setIsLoading(null)
    }
  }

  const isCurrentPlan = (planId: string) => {
    return user?.subscriptionStatus === planId
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {currentPricing.map((plan) => (
        <Card key={plan.id} className={`flex flex-col ${isCurrentPlan(plan.id) ? "border-primary" : ""}`}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>
              {plan.interval === "month"
                ? "Billed monthly"
                : plan.interval === "year"
                  ? "Billed annually"
                  : "Free forever"}
            </CardDescription>
            <div className="mt-1">
              <span className="text-3xl font-bold">${plan.price}</span>
              {plan.interval !== "year" && (
                <span className="text-muted-foreground">{plan.price > 0 ? "/month" : ""}</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant={isCurrentPlan(plan.id) ? "outline" : "default"}
              disabled={isLoading !== null || isCurrentPlan(plan.id)}
              onClick={() => handleSubscribe(plan)}
            >
              {isLoading === plan.id
                ? "Processing..."
                : isCurrentPlan(plan.id)
                  ? "Current Plan"
                  : `Subscribe to ${plan.name}`}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

