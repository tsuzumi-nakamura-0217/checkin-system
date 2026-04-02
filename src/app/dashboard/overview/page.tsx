import { redirect } from "next/navigation"

import { AdvanceNoticeButton } from "@/components/advance-notice-button"
import { CheckInButton } from "@/components/check-in-button"
import { CheckOutButton } from "@/components/check-out-button"
import { formatPoint, getCheckInStatusLabel, getDashboardData } from "@/lib/dashboard-data"
import { getCurrentUser } from "@/lib/current-user"

export default async function DashboardOverviewPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  const data = await getDashboardData(currentUser.id)

  if (!data) {
    redirect("/login")
  }

  const weeklyCheckInCount = data.weeklyCheckIns.length
  const weeklyTotalPoints = data.weeklyCheckInPoints + data.weeklyTaskPoints
  const todayStatusLabel = data.todayCheckIn
    ? getCheckInStatusLabel(data.todayCheckIn.status)
    : "未チェックイン"

  return (
    <section className="space-y-5 tracking-tight">
      <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:grid-cols-[1.5fr_1fr] sm:p-7">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">今日のサマリー</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">ダッシュボード</h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {data.todayCheckIn
              ? `本日のチェックインは ${data.checkedInTimeLabel} に完了しました。`
              : "まだチェックインしていません。まずはチェックインを記録しましょう。"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-secondary p-4">
          <p className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">本日のステータス</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{todayStatusLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.todayPointLabel ? `${data.todayPointLabel} pt` : "ポイント未確定"}
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">総ポイント</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {data.user.points.toLocaleString("ja-JP")}
            <span className="ml-1 text-base text-primary">pt</span>
          </p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">完了タスク</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {data.doneTaskCount}
            <span className="ml-1 text-base text-primary">件</span>
          </p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">今週チェックイン</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {weeklyCheckInCount}
            <span className="ml-1 text-base text-primary">回</span>
          </p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">今週合計</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {formatPoint(weeklyTotalPoints)}
            <span className="ml-1 text-base text-primary">pt</span>
          </p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-foreground">チェックイン</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">チェックイン</p>
              <p className="mt-2 text-sm text-foreground">
                {data.todayCheckIn ? `${data.checkedInTimeLabel} に記録済み` : "未記録"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">退勤</p>
              <p className="mt-2 text-sm text-foreground">
                {data.checkedOutTimeLabel ? `${data.checkedOutTimeLabel} に記録済み` : "未記録"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-background p-5">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">本日の操作</p>
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

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <p className="text-base font-semibold text-foreground">今日のメモ</p>
          <p className="mt-2 text-sm text-muted-foreground">
            事前申告は翌日分のみ受け付けます。遅刻・欠席が見込まれる場合は、当日になる前に登録してください。
          </p>

          <div className="mt-5 rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">現在の状態</p>
            <ul className="mt-3 space-y-2 text-sm text-foreground">
              <li>チェックイン: {data.todayCheckIn ? "完了" : "未記録"}</li>
              <li>退勤: {data.todayCheckIn?.checkOutTime ? "完了" : "未記録"}</li>
              <li>本日のポイント: {data.todayPointLabel ? `${data.todayPointLabel} pt` : "未確定"}</li>
            </ul>
          </div>
        </section>
      </div>
    </section>
  )
}
