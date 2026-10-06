import { redirect } from "next/navigation"

import { AdvanceNoticeButton } from "@/components/advance-notice-button"
import { CheckInButton } from "@/components/check-in-button"
import { CheckOutButton } from "@/components/check-out-button"
import { formatPoint, getCheckInStatusLabel, getOverviewData, getAllUsersRankingAndTodayActivity } from "@/lib/dashboard-data"
import { getCurrentUser } from "@/lib/current-user"
import { CommunitySummaryCard } from "@/components/community/summary-card"
import { formatTimeLabel } from "@/lib/calendar-utils"

function getGreeting(): string {
  const hourText = new Intl.DateTimeFormat("ja-JP", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date())
  const hour = parseInt(hourText, 10)

  if (hour < 6) return "お疲れさまです 🌙"
  if (hour < 12) return "おはようございます ☀️"
  if (hour < 18) return "こんにちは 👋"
  return "お疲れさまです 🌙"
}

function getRankBadge(rank: number) {
  if (rank === 1) return { emoji: "🥇", color: "text-gold", bg: "bg-gold/10" }
  if (rank === 2) return { emoji: "🥈", color: "text-gray-400", bg: "bg-gray-400/10" }
  if (rank === 3) return { emoji: "🥉", color: "text-orange-400", bg: "bg-orange-400/10" }
  return { emoji: `${rank}`, color: "text-muted-foreground", bg: "bg-muted/50" }
}

function getStatusBadge(status: string | null) {
  if (status === "ON_TIME") return { label: "時間内", className: "bg-accent/10 text-accent" }
  if (status === "EARLY") return { label: "早着", className: "bg-primary/10 text-primary" }
  if (status === "LATE") return { label: "遅刻", className: "bg-destructive/10 text-destructive" }
  if (status === "REMOTE") return { label: "在宅", className: "bg-brand-uplift/10 text-brand-uplift" }
  return { label: "未チェックイン", className: "bg-black/[0.05] text-muted-foreground" }
}

function getTaskStatusIcon(status: string) {
  if (status === "DONE") return { icon: "✓", className: "text-accent bg-accent/10" }
  if (status === "IN_PROGRESS") return { icon: "▶", className: "text-primary bg-primary/10" }
  return { icon: "○", className: "text-muted-foreground bg-muted" }
}

type DashboardOverviewPageProps = {
  searchParams: Promise<{ action?: string | string[] }>
}

export default async function DashboardOverviewPage({ searchParams }: DashboardOverviewPageProps) {
  const { action } = await searchParams
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  // Login streak is already updated in the dashboard layout (runs before this page).
  const [data, { ranking, todayActivity }] = await Promise.all([
    getOverviewData(currentUser.id),
    getAllUsersRankingAndTodayActivity(),
  ])

  if (!data) {
    redirect("/login")
  }

  const weeklyCheckInCount = data.weeklyCheckInCount
  const weeklyTotalPoints = data.weeklyCheckInPoints + data.weeklyTaskPoints
  const todayStatusLabel = data.todayCheckIn
    ? getCheckInStatusLabel(data.todayCheckIn.status)
    : "未チェックイン"

  return (
    <section className="space-y-6 animate-fade-in">
      {/* Hero — large title on the canvas, no band (design.md §4) */}
      <section className="flex flex-col gap-5 pt-2 sm:flex-row sm:items-end sm:justify-between lg:pt-0">
        <div>
          <p className="text-[15px] font-medium text-muted-foreground">{getGreeting()}</p>
          <h1 className="mt-1 text-[34px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">ダッシュボード</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {data.todayCheckIn
              ? `本日のチェックインは ${data.checkedInTimeLabel} に完了しました。`
              : "まだチェックインしていません。まずはチェックインを記録しましょう。"}
          </p>
        </div>
        <div className="min-w-56 rounded-2xl bg-card px-5 py-4 shadow-themed">
          <p className="text-xs font-medium text-muted-foreground">本日のステータス</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{todayStatusLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {data.todayPointLabel ? `${data.todayPointLabel} pt` : "ポイント未確定"}
          </p>
        </div>
      </section>

      {/* Community Summary */}
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
        <CommunitySummaryCard />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <section className="group rounded-2xl bg-card p-5 shadow-themed transition-shadow hover:shadow-themed-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">総ポイント</p>
              <p className="mt-0.5 text-[28px] leading-tight font-semibold tracking-tight text-foreground tabular-nums">
                {data.user.points.toLocaleString("ja-JP")}
                <span className="ml-1 text-sm font-semibold text-primary">pt</span>
              </p>
            </div>
          </div>
        </section>

        <section className="group rounded-2xl bg-card p-5 shadow-themed transition-shadow hover:shadow-themed-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">タスクポイント</p>
              <p className="mt-0.5 text-[28px] leading-tight font-semibold tracking-tight text-foreground tabular-nums">
                {formatPoint(data.totalTaskPoints)}
                <span className="ml-1 text-sm font-semibold text-accent">pt</span>
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{data.doneTaskCount} 件完了 · 総ポイントに反映済み</p>
            </div>
          </div>
        </section>

        <section className="group rounded-2xl bg-card p-5 shadow-themed transition-shadow hover:shadow-themed-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10 text-chart-4">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">今週チェックイン</p>
              <p className="mt-0.5 text-[28px] leading-tight font-semibold tracking-tight text-foreground tabular-nums">
                {weeklyCheckInCount}
                <span className="ml-1 text-sm font-semibold text-chart-4">回</span>
              </p>
            </div>
          </div>
        </section>

        <section className="group rounded-2xl bg-card p-5 shadow-themed transition-shadow hover:shadow-themed-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-5/10 text-chart-5">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">今週合計</p>
              <p className="mt-0.5 text-[28px] leading-tight font-semibold tracking-tight text-foreground tabular-nums">
                {formatPoint(weeklyTotalPoints)}
                <span className="ml-1 text-sm font-semibold text-chart-5">pt</span>
              </p>
            </div>
          </div>
        </section>

        <section className="group rounded-2xl bg-card p-5 shadow-themed transition-shadow hover:shadow-themed-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0121 13a8.144 8.144 0 01-.343 2.314z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">連続ログイン</p>
              <p className="mt-0.5 text-[28px] leading-tight font-semibold tracking-tight text-foreground tabular-nums">
                {data.loginStreak}
                <span className="ml-1 text-sm font-semibold text-orange-500">日</span>
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">自己ベスト: {data.maxLoginStreak} 日</p>
            </div>
          </div>
        </section>

        <section className="group rounded-2xl bg-card p-5 shadow-themed transition-shadow hover:shadow-themed-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">連続時間内</p>
              <p className="mt-0.5 text-[28px] leading-tight font-semibold tracking-tight text-foreground tabular-nums">
                {data.checkInStreak}
                <span className="ml-1 text-sm font-semibold text-primary">回</span>
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">自己ベスト: {data.maxCheckInStreak} 回</p>
            </div>
          </div>
        </section>
      </div>

      {/* Actions Grid */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl bg-card p-6 shadow-themed sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary text-primary-foreground">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[19px] font-semibold tracking-tight text-foreground">チェックイン</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs font-medium text-muted-foreground">チェックイン</p>
              <p className="mt-1.5 text-sm font-medium text-foreground">
                {data.todayCheckIn ? `${data.checkedInTimeLabel} に記録済み` : "未記録"}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs font-medium text-muted-foreground">退勤</p>
              <p className="mt-1.5 text-sm font-medium text-foreground">
                {data.checkedOutTimeLabel ? `${data.checkedOutTimeLabel} に記録済み` : "未記録"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-muted p-5">
            <p className="text-xs font-medium text-muted-foreground">本日の操作</p>
            <p className="mt-1 text-sm text-muted-foreground">
              まずチェックイン、終了時に退勤を記録してください。
            </p>
            <div className="mt-4 space-y-3">
              <CheckInButton checkedIn={Boolean(data.todayCheckIn)} autoStart={action === "checkin"} />
              <CheckOutButton
                hasTodayCheckIn={Boolean(data.todayCheckIn)}
                alreadyCheckedOut={Boolean(data.todayCheckIn?.checkOutTime)}
                autoStart={action === "checkout"}
              />
              <AdvanceNoticeButton requests={data.advanceNotices} />
            </div>
          </div>
        </section>

        {/* Points Ranking - replaces 今日のメモ */}
        <section className="rounded-2xl bg-card p-6 shadow-themed sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <p className="text-[19px] font-semibold tracking-tight text-foreground">ポイントランキング</p>
          </div>

          <div className="mt-4 space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {ranking.map((user) => {
              const badge = getRankBadge(user.rank)
              const isCurrentUser = user.id === currentUser.id
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    isCurrentUser ? "bg-primary/[0.07]" : "hover:bg-muted"
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${badge.bg} ${badge.color}`}>
                    {user.rank <= 3 ? badge.emoji : user.rank}
                  </div>
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name ?? ""}
                      className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-black/5"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                      {(user.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isCurrentUser ? "text-primary" : "text-foreground"}`}>
                      {user.name ?? "名前未設定"}
                      {isCurrentUser && <span className="ml-1.5 text-[10px] font-semibold text-primary/60">(あなた)</span>}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {user.totalPoints.toLocaleString("ja-JP")}
                    <span className="ml-0.5 text-[10px] font-semibold text-muted-foreground">pt</span>
                  </p>
                </div>
              )
            })}
            {ranking.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">ユーザーが見つかりません</p>
            )}
          </div>
        </section>
      </div>

      {/* Today's Activity for All Users */}
      <section className="rounded-2xl bg-card p-6 shadow-themed sm:p-7 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[19px] font-semibold tracking-tight text-foreground">本日のみんなの活動</p>
            <p className="text-[10px] font-medium text-muted-foreground">チェックイン状況・目標時間・タスク</p>
          </div>
        </div>

        <div className="space-y-3">
          {todayActivity.map((user) => {
            const statusBadge = getStatusBadge(user.checkInStatus)
            const isCurrentUser = user.id === currentUser.id
            return (
              <div
                key={user.id}
                className={`rounded-xl p-4 transition-colors ${
                  isCurrentUser ? "bg-primary/[0.06]" : "bg-muted"
                }`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  {/* User Avatar */}
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name ?? ""}
                      className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/5"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                      {(user.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* User Name & Target */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isCurrentUser ? "text-primary" : "text-foreground"}`}>
                      {user.name ?? "名前未設定"}
                      {isCurrentUser && <span className="ml-1.5 text-[10px] font-semibold text-primary/60">(あなた)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      目標: {user.targetTime ?? "09:00"}
                      {user.checkInTime && (
                        <span className="ml-2">
                          → チェックイン: {formatTimeLabel(user.checkInTime)}
                        </span>
                      )}
                      {user.checkOutTime && (
                        <span className="ml-2">
                          · 退勤: {formatTimeLabel(user.checkOutTime)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge.className}`}>
                    {statusBadge.label}
                  </span>

                  {/* Points */}
                  {user.checkInPoints !== 0 && (
                    <span className={`text-xs font-semibold tabular-nums ${user.checkInPoints > 0 ? "text-accent" : "text-destructive"}`}>
                      {user.checkInPoints > 0 ? "+" : ""}{user.checkInPoints} pt
                    </span>
                  )}
                </div>

                {/* Task Completion Rate */}
                {user.totalTaskCount > 0 && user.taskCompletionRate !== null && (
                  <div className="mt-3 border-t border-border/50 pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-muted-foreground">タスク完了率</p>
                      <p className="text-[10px] font-semibold text-foreground tabular-nums">
                        {user.completedTaskCount} / {user.totalTaskCount} ({user.taskCompletionRate}%)
                      </p>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          user.taskCompletionRate === 100 ? "bg-chart-2" : "bg-primary"
                        }`}
                        style={{ width: `${user.taskCompletionRate}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {todayActivity.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">本日のデータがまだありません</p>
          )}
        </div>
      </section>
    </section>
  )
}
