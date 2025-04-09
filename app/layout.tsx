import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { UnitProvider } from "@/contexts/unit-context"
import { Analytics } from "@vercel/analytics/react"
import ConsoltoChat from "@/components/ConsoltoChat"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RideWitUS - Activity Tracker",
  description: "Track and compare your movement activities",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} dark`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <UnitProvider>
              {children}
              <Analytics />
              <ConsoltoChat />
            </UnitProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}