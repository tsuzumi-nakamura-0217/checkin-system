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
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="tracking-tight">カレンダー</h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              空いている時間帯をドラッグすると、時間指定タスクを作成できます。
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/dashboard/week?week=${toDayKey(data.previousWeek)}`}
              className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground transition-colors hover:bg-secondary"
            >
              先週
            </Link>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">{data.weekRangeLabel}</span>
            <Link
              href={`/dashboard/week?week=${toDayKey(data.nextWeek)}`}
              className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground transition-colors hover:bg-secondary"
            >
              来週
            </Link>
            <TodayTaskReportButton todayTasks={data.todayTasks} />
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
