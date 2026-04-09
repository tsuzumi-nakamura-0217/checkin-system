import Link from "next/link"
import { redirect } from "next/navigation"

import { TodayTaskReportButton } from "@/components/today-task-report-button"
import { WeekCalendar } from "@/components/week-calendar"
import { getCalendarData } from "@/lib/dashboard-data"
import { getCurrentUser } from "@/lib/current-user"
import { toDayKey } from "@/lib/calendar-utils"

type DashboardWeekPageProps = {
  searchParams: Promise<{ week?: string | string[] }>
}

export default async function DashboardWeekPage({ searchParams }: DashboardWeekPageProps) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  const resolvedSearchParams = await searchParams
  const data = await getCalendarData(currentUser.id, resolvedSearchParams.week)

  if (!data) {
    redirect("/login")
  }

  return (
    <section className="space-y-4 animate-fade-in">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-themed sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white shadow-sm">
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="tracking-tight">カレンダー</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ドラッグでタスク作成 • クリックで編集
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center rounded-xl border border-border bg-background p-1 shadow-sm">
              <Link
                href={`/dashboard/week?week=${toDayKey(data.previousWeek)}`}
                className="rounded-lg px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="先週"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <span className="px-3 py-1 text-xs font-bold text-foreground tabular-nums">{data.weekRangeLabel}</span>
              <Link
                href={`/dashboard/week?week=${toDayKey(data.nextWeek)}`}
                className="rounded-lg px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="来週"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <TodayTaskReportButton todayTasks={data.todayTasks} checkedInTimeLabel={data.checkedInTimeLabel} isRemote={data.isRemoteCheckIn} />
          </div>
        </div>
      </div>

      <WeekCalendar
        weekStartIso={data.weekStart.toISOString()}
        tasks={data.calendarTasks}
        checkIns={data.calendarCheckIns}
      />
    </section>
  )
}
