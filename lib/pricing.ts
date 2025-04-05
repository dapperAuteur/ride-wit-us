export interface PricingTier {
  id: string
  name: string
  price: number
  interval: "month" | "year"
  features: string[]
  stripePriceId: string | null
}

export let currentPricing: PricingTier[] = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    interval: "month",
    features: [],
    stripePriceId: null,
  },
  {
    id: "MONTHLY",
    name: "Monthly",
    price: 10,
    interval: "month",
    features: [],
    stripePriceId: "monthly_price_id",
  },
  {
    id: "ANNUAL",
    name: "Annual",
    price: 100,
    interval: "year",
    features: [],
    stripePriceId: "annual_price_id",
  },
]

export const updatePricing = (newPricing: PricingTier[]) => {
  currentPricing = newPricing
}

