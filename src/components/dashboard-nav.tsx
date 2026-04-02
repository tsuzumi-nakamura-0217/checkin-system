"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type NavLink = {
  href: string
  label: string
}

type DashboardNavProps = {
  navLinks: NavLink[]
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardNavDesktop({ navLinks }: DashboardNavProps) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1.5 text-sm font-medium">
      {navLinks.map((item) => {
        const isActive = isActivePath(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors",
              isActive
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                isActive ? "bg-primary" : "bg-muted-foreground",
              )}
            />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function DashboardNavMobile({ navLinks }: DashboardNavProps) {
  const pathname = usePathname()

  return (
    <nav className="mb-6 grid grid-cols-2 gap-2.5 lg:hidden">
      {navLinks.map((item) => {
        const isActive = isActivePath(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium shadow-sm transition-colors",
              isActive
                ? "border-border bg-secondary text-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}