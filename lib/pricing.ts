export interface PricingTier {
  id: string
  name: string
  price: number
  interval: "month" | "year"
  features: string[]
  stripePriceId: string
}

export const defaultPricing: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    features: [
      "Track walking, running, biking, and driving",
      "Local data storage",
      "CSV export and import",
      "Basic analytics",
    ],
    stripePriceId: "",
  },
  {
    id: "monthly",
    name: "Premium Monthly",
    price: 9.99,
    interval: "month",
    features: [
      "All Free features",
      "Cloud data storage",
      "Sync across devices",
      "Advanced analytics",
      "Priority support",
    ],
    stripePriceId: "price_monthly",
  },
  {
    id: "annual",
    name: "Premium Annual",
    price: 99.99,
    interval: "year",
    features: ["All Premium Monthly features", "2 months free", "Early access to new features"],
    stripePriceId: "price_annual",
  },
]

// This will be updated by admins
export let currentPricing = [...defaultPricing]

export function updatePricing(newPricing: PricingTier[]) {
  currentPricing = newPricing
}

