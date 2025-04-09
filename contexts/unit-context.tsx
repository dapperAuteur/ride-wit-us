"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type UnitType = "miles" | "km"

interface UnitContextType {
  unit: UnitType
  toggleUnit: () => void
}

const UnitContext = createContext<UnitContextType | undefined>(undefined)

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnit] = useState<UnitType>("miles")

  // Load preference from localStorage on mount
  useEffect(() => {
    const savedUnit = localStorage.getItem("preferred-unit")
    if (savedUnit === "miles" || savedUnit === "km") {
      setUnit(savedUnit)
    }
  }, [])

  // Save preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("preferred-unit", unit)
  }, [unit])

  const toggleUnit = () => {
    setUnit((prev) => (prev === "miles" ? "km" : "miles"))
  }

  return <UnitContext.Provider value={{ unit, toggleUnit }}>{children}</UnitContext.Provider>
}

export function useUnit() {
  const context = useContext(UnitContext)
  if (context === undefined) {
    throw new Error("useUnit must be used within a UnitProvider")
  }
  return context
}
