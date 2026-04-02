"use client"

import dynamic from "next/dynamic"

type NavLink = {
  href: string
  label: string
  icon: string
}

type DashboardNavDynamicProps = {
  navLinks: NavLink[]
}

const DashboardNavDesktop = dynamic(
  () => import("@/components/dashboard-nav").then((mod) => mod.DashboardNavDesktop),
  { ssr: false }
)

const DashboardNavMobile = dynamic(
  () => import("@/components/dashboard-nav").then((mod) => mod.DashboardNavMobile),
  { ssr: false }
)

export function DashboardNavDesktopDynamic({ navLinks }: DashboardNavDynamicProps) {
  return <DashboardNavDesktop navLinks={navLinks} />
}

export function DashboardNavMobileDynamic({ navLinks }: DashboardNavDynamicProps) {
  return <DashboardNavMobile navLinks={navLinks} />
}
