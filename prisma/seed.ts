import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create default pricing tiers
  const pricingTiers = [
    {
      name: "Free",
      price: 0,
      interval: "month",
      features: [
        "Track walking, running, biking, and driving",
        "Local data storage",
        "CSV export and import",
        "Basic analytics",
      ],
    },
    {
      name: "Premium Monthly",
      price: 9.99,
      interval: "month",
      stripePriceId: "price_monthly",
      features: [
        "All Free features",
        "Cloud data storage",
        "Sync across devices",
        "Advanced analytics",
        "Priority support",
      ],
    },
    {
      name: "Premium Annual",
      price: 99.99,
      interval: "year",
      stripePriceId: "price_annual",
      features: ["All Premium Monthly features", "2 months free", "Early access to new features"],
    },
  ]

  for (const tier of pricingTiers) {
    await prisma.pricingTier.upsert({
      where: { name: tier.name },
      update: tier,
      create: tier,
    })
  }

  // Create admin user
  const adminPassword = await hash("admin123", 10)
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  })

  console.log("Database seeded successfully")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

