"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type PricingTier, currentPricing, updatePricing } from "@/lib/pricing"
import { AlertCircle, Edit, Save } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function PricingManagement() {
  const { user } = useAuth()
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([...currentPricing])
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      // Validate pricing tiers
      for (const tier of pricingTiers) {
        if (tier.price < 0) {
          setError("Price cannot be negative")
          return
        }
        if (!tier.stripePriceId && tier.price > 0) {
          setError("Stripe Price ID is required for paid tiers")
          return
        }
      }

      // Update pricing in the backend
      const response = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pricing: pricingTiers }),
      })

      if (response.ok) {
        // Update local pricing
        updatePricing([...pricingTiers])
        setSuccess("Pricing updated successfully")
        setIsEditing(false)

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null)
        }, 3000)
      } else {
        const error = await response.json()
        setError(error.message || "Failed to update pricing")
      }
    } catch (error) {
      setError("An unexpected error occurred")
    }
  }

  const handleCancel = () => {
    setPricingTiers([...currentPricing])
    setIsEditing(false)
    setError(null)
  }

  const handlePriceChange = (index: number, price: string) => {
    const newPricingTiers = [...pricingTiers]
    newPricingTiers[index].price = Number.parseFloat(price) || 0
    setPricingTiers(newPricingTiers)
  }

  const handleStripePriceIdChange = (index: number, stripePriceId: string) => {
    const newPricingTiers = [...pricingTiers]
    newPricingTiers[index].stripePriceId = stripePriceId
    setPricingTiers(newPricingTiers)
  }

  const handleFeatureChange = (tierIndex: number, featureIndex: number, value: string) => {
    const newPricingTiers = [...pricingTiers]
    newPricingTiers[tierIndex].features[featureIndex] = value
    setPricingTiers(newPricingTiers)
  }

  const handleAddFeature = (tierIndex: number) => {
    const newPricingTiers = [...pricingTiers]
    newPricingTiers[tierIndex].features.push("New feature")
    setPricingTiers(newPricingTiers)
  }

  const handleRemoveFeature = (tierIndex: number, featureIndex: number) => {
    const newPricingTiers = [...pricingTiers]
    newPricingTiers[tierIndex].features.splice(featureIndex, 1)
    setPricingTiers(newPricingTiers)
  }

  // Check if user has permission to access this page
  if (!user || user.role !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Only administrators can manage pricing.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pricing Management</CardTitle>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Pricing
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-50">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Stripe Price ID</TableHead>
                <TableHead>Features</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricingTiers.map((tier, index) => (
                <TableRow key={tier.id}>
                  <TableCell>{tier.name}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={tier.price}
                        onChange={(e) => handlePriceChange(index, e.target.value)}
                        className="w-24"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      `$${tier.price}`
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={tier.interval}
                        onValueChange={(value) => {
                          const newPricingTiers = [...pricingTiers]
                          newPricingTiers[index].interval = value as "month" | "year"
                          setPricingTiers(newPricingTiers)
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Monthly</SelectItem>
                          <SelectItem value="year">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : tier.interval === "month" ? (
                      "Monthly"
                    ) : (
                      "Yearly"
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={tier.stripePriceId}
                        onChange={(e) => handleStripePriceIdChange(index, e.target.value)}
                        className="w-40"
                        disabled={tier.price === 0}
                      />
                    ) : (
                      tier.stripePriceId || "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="space-y-2">
                        {tier.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-center gap-2">
                            <Input
                              value={feature}
                              onChange={(e) => handleFeatureChange(index, featureIndex, e.target.value)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveFeature(index, featureIndex)}
                            >
                              &times;
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => handleAddFeature(index)}>
                          Add Feature
                        </Button>
                      </div>
                    ) : (
                      <ul className="list-disc pl-5">
                        {tier.features.map((feature, i) => (
                          <li key={i}>{feature}</li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

