"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type NavLink = {
  href: string
  label: string
  icon: string
}

type DashboardNavProps = {
  navLinks: NavLink[]
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = cn("h-[18px] w-[18px]", className)

  if (icon === "dashboard") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
      </svg>
    )
  }
  if (icon === "calendar") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
  if (icon === "tasks") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    )
  }
  if (icon === "history") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (icon === "settings") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  if (icon === "community") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  }
  if (icon === "ai") {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.75h4.5a1.5 1.5 0 011.5 1.5v1.064a4.5 4.5 0 012.186 2.186h1.064a1.5 1.5 0 011.5 1.5v4.5a1.5 1.5 0 01-1.5 1.5h-1.064a4.5 4.5 0 01-2.186 2.186v1.064a1.5 1.5 0 01-1.5 1.5h-4.5a1.5 1.5 0 01-1.5-1.5v-1.064A4.5 4.5 0 016.564 16.5H5.5a1.5 1.5 0 01-1.5-1.5v-4.5a1.5 1.5 0 011.5-1.5h1.064A4.5 4.5 0 018.75 6.314V5.25a1.5 1.5 0 011.5-1.5z" />
        <circle cx="9" cy="12" r="0.9" fill="currentColor" />
        <circle cx="15" cy="12" r="0.9" fill="currentColor" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15.2c.9.6 1.8.9 3 .9 1.2 0 2.1-.3 3-.9" />
      </svg>
    )
  }
  return null
}

export function DashboardNavDesktop({ navLinks }: DashboardNavProps) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1 text-sm font-medium">
      {navLinks.map((item) => {
        const isActive = isActivePath(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
              isActive
                ? "bg-primary/8 text-primary font-semibold"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive ? (
              <span className="absolute left-0 top-1/2 h-6 w-0.75 -translate-y-1/2 rounded-r-full gradient-primary" />
            ) : null}
            <NavIcon icon={item.icon} className={isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function DashboardNavMobile({ navLinks }: DashboardNavProps) {
  const pathname = usePathname()

  // Hide settings in mobile bottom bar to keep the control compact.
  const mobileLinks = navLinks.filter(item => item.icon !== "settings")

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {mobileLinks.map((item) => {
          const isActive = isActivePath(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold tracking-wide transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive ? (
                <span className="absolute top-0 left-1/2 h-[2.5px] w-8 -translate-x-1/2 rounded-b-full gradient-primary" />
              ) : null}
              <NavIcon icon={item.icon} className={isActive ? "text-primary" : ""} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}