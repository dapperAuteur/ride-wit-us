"use client"

import { Button } from "@/components/ui/button"
import { useUnit } from "@/contexts/unit-context"
import { Repeat } from "lucide-react"

export default function UnitToggle() {
  const { unit, toggleUnit } = useUnit()

  return (
    <Button variant="outline" size="sm" onClick={toggleUnit} className="flex items-center gap-1">
      <Repeat className="h-3 w-3" />
      <span>{unit === "miles" ? "mi" : "km"}</span>
    </Button>
  )
}
