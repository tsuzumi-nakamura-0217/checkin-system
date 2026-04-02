"use client"

import type { ComponentProps } from "react"
import dynamic from "next/dynamic"

import type { WeekCalendar as WeekCalendarComponent } from "@/components/week-calendar"

const WeekCalendar = dynamic(
  () => import("@/components/week-calendar").then((mod) => mod.WeekCalendar),
  { ssr: false }
)

type WeekCalendarDynamicProps = ComponentProps<typeof WeekCalendarComponent>

export function WeekCalendarDynamic(props: WeekCalendarDynamicProps) {
  return <WeekCalendar {...props} />
}
