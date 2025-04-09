"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Activity, CreditCard, LogIn, LogOut, Menu, User, UserPlus, Users } from "lucide-react"

export default function MainNav() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center">
        <Link href="/" className="text-xl font-bold mr-8">
          RideWitUS
        </Link>

        <div className="hidden md:flex items-center space-x-4">
          <Link
            href="/"
            className={`px-3 py-2 rounded-md ${
              isActive("/") ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            Dashboard
          </Link>

          {user && (
            <>
              <Link
                href="/profile"
                className={`px-3 py-2 rounded-md ${
                  isActive("/profile")
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                Profile
              </Link>

              <Link
                href="/subscription"
                className={`px-3 py-2 rounded-md ${
                  isActive("/subscription")
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                Subscription
              </Link>

              {(user.role === "admin" || user.role === "manager") && (
                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-md ${
                    pathname.startsWith("/admin")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <div className="hidden md:flex items-center space-x-2">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative">
                <User className="h-5 w-5" />
                <span className="ml-2">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/subscription" className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Subscription</span>
                </Link>
              </DropdownMenuItem>
              {(user.role === "admin" || user.role === "manager") && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Admin Panel</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button variant="ghost" asChild>
              <Link href="/signin">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                <UserPlus className="mr-2 h-4 w-4" />
                Sign Up
              </Link>
            </Button>
          </>
        )}
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-background border-b z-50 md:hidden">
          <div className="flex flex-col p-4 space-y-2">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md ${
                isActive("/") ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Activity className="inline-block mr-2 h-4 w-4" />
              Dashboard
            </Link>

            {user ? (
              <>
                <Link
                  href="/profile"
                  className={`px-3 py-2 rounded-md ${
                    isActive("/profile")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="inline-block mr-2 h-4 w-4" />
                  Profile
                </Link>

                <Link
                  href="/subscription"
                  className={`px-3 py-2 rounded-md ${
                    isActive("/subscription")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <CreditCard className="inline-block mr-2 h-4 w-4" />
                  Subscription
                </Link>

                {(user.role === "admin" || user.role === "manager") && (
                  <Link
                    href="/admin"
                    className={`px-3 py-2 rounded-md ${
                      pathname.startsWith("/admin")
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="inline-block mr-2 h-4 w-4" />
                    Admin Panel
                  </Link>
                )}

                <button
                  className="px-3 py-2 rounded-md text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    signOut()
                    setIsMenuOpen(false)
                  }}
                >
                  <LogOut className="inline-block mr-2 h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className={`px-3 py-2 rounded-md ${
                    isActive("/signin")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LogIn className="inline-block mr-2 h-4 w-4" />
                  Sign In
                </Link>

                <Link
                  href="/signup"
                  className={`px-3 py-2 rounded-md ${
                    isActive("/signup")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <UserPlus className="inline-block mr-2 h-4 w-4" />
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
