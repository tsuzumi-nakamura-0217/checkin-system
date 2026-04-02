import { redirect } from "next/navigation"

import { AdvanceNoticeButton } from "@/components/advance-notice-button"
import { CheckInButton } from "@/components/check-in-button"
import { CheckOutButton } from "@/components/check-out-button"
import { formatPoint, getCheckInStatusLabel, getOverviewData } from "@/lib/dashboard-data"
import { getCurrentUser } from "@/lib/current-user"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return "お疲れさまです 🌙"
  if (hour < 12) return "おはようございます ☀️"
  if (hour < 18) return "こんにちは 👋"
  return "お疲れさまです 🌙"
}

export default async function DashboardOverviewPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  const data = await getOverviewData(currentUser.id)

  if (!data) {
    redirect("/login")
  }

  const weeklyCheckInCount = data.weeklyCheckInCount
  const weeklyTotalPoints = data.weeklyCheckInPoints + data.weeklyTaskPoints
  const todayStatusLabel = data.todayCheckIn
    ? getCheckInStatusLabel(data.todayCheckIn.status)
    : "未チェックイン"

  return (
    <section className="space-y-5 tracking-tight animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-themed sm:p-7">
        <div className="absolute inset-0 gradient-hero opacity-60" />
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/5 -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-primary/5 translate-y-8 -translate-x-8" />
        <div className="relative z-10 grid gap-4 sm:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-primary/60 uppercase">{getGreeting()}</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">ダッシュボード</h2>
            <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">
              {data.todayCheckIn
                ? `本日のチェックインは ${data.checkedInTimeLabel} に完了しました。`
                : "まだチェックインしていません。まずはチェックインを記録しましょう。"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-4 shadow-sm">
            <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">本日のステータス</p>
            <p className="mt-1.5 text-sm font-bold text-foreground">{todayStatusLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.todayPointLabel ? `${data.todayPointLabel} pt` : "ポイント未確定"}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <section className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-themed hover:border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">総ポイント</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {data.user.points.toLocaleString("ja-JP")}
                <span className="ml-1 text-sm font-semibold text-primary">pt</span>
              </p>
            </div>
          </div>
        </section>

        <section className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-themed hover:border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">完了タスク</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {data.doneTaskCount}
                <span className="ml-1 text-sm font-semibold text-accent">件</span>
              </p>
            </div>
          </div>
        </section>

        <section className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-themed hover:border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10 text-chart-4">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">今週チェックイン</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {weeklyCheckInCount}
                <span className="ml-1 text-sm font-semibold text-chart-4">回</span>
              </p>
            </div>
          </div>
        </section>

        <section className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-themed hover:border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-5/10 text-chart-5">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">今週合計</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {formatPoint(weeklyTotalPoints)}
                <span className="ml-1 text-sm font-semibold text-chart-5">pt</span>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Actions Grid */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-themed sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-bold text-foreground">チェックイン</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">チェックイン</p>
              <p className="mt-1.5 text-sm font-medium text-foreground">
                {data.todayCheckIn ? `${data.checkedInTimeLabel} に記録済み` : "未記録"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">退勤</p>
              <p className="mt-1.5 text-sm font-medium text-foreground">
                {data.checkedOutTimeLabel ? `${data.checkedOutTimeLabel} に記録済み` : "未記録"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-background/60 p-5">
            <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">本日の操作</p>
            <p className="mt-1 text-sm text-muted-foreground">
              まずチェックイン、終了時に退勤を記録してください。
            </p>
            <div className="mt-4 space-y-3">
              <CheckInButton checkedIn={Boolean(data.todayCheckIn)} />
              <CheckOutButton
                hasTodayCheckIn={Boolean(data.todayCheckIn)}
                alreadyCheckedOut={Boolean(data.todayCheckIn?.checkOutTime)}
              />
              <AdvanceNoticeButton requests={data.advanceNotices} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-themed sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-bold text-foreground">今日のメモ</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            事前申告は翌日分のみ受け付けます。遅刻・欠席が見込まれる場合は、当日になる前に登録してください。
          </p>

          <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
            <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">現在の状態</p>
            <ul className="mt-3 space-y-2.5 text-sm text-foreground">
              <li className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${data.todayCheckIn ? "bg-accent" : "bg-muted-foreground/30"}`} />
                チェックイン: {data.todayCheckIn ? "完了" : "未記録"}
              </li>
              <li className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${data.todayCheckIn?.checkOutTime ? "bg-accent" : "bg-muted-foreground/30"}`} />
                退勤: {data.todayCheckIn?.checkOutTime ? "完了" : "未記録"}
              </li>
              <li className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${data.todayPointLabel ? "bg-primary" : "bg-muted-foreground/30"}`} />
                本日のポイント: {data.todayPointLabel ? `${data.todayPointLabel} pt` : "未確定"}
              </li>
            </ul>
          </div>
        </section>
      </div>
    </section>
  )
}
