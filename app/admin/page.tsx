"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to users page by default
    router.push("/admin/users")
  }, [router])

  return null
}

