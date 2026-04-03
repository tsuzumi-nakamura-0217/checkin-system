import { redirect } from "next/navigation"

import {
  formatPoint,
  getCheckInStatusLabel,
  getHistoryData,
} from "@/lib/dashboard-data"
import { getCurrentUser } from "@/lib/current-user"
import { formatTimeLabel } from "@/lib/calendar-utils"

function getStatusBadgeClass(status: string): string {
  if (status === "EARLY") return "bg-accent/10 text-accent"
  if (status === "LATE") return "bg-destructive/10 text-destructive"
  if (status === "ON_TIME") return "bg-primary/10 text-primary"
  if (status === "REMOTE") return "bg-amber-100 text-amber-700"
  return "bg-muted text-muted-foreground"
}

export default async function DashboardHistoryPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  const data = await getHistoryData(currentUser.id)

  if (!data) {
    redirect("/login")
  }

  return (
    <section className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white shadow-sm">
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2>履歴</h2>
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-themed overflow-hidden">
        {data.recentCheckIns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 text-primary mb-4">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground">チェックイン履歴がまだありません</p>
            <p className="mt-1 text-xs text-muted-foreground">チェックインを記録すると、ここに表示されます。</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left">
                  <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-muted-foreground/70 uppercase">日時</th>
                  <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-muted-foreground/70 uppercase">ステータス</th>
                  <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-muted-foreground/70 uppercase">ポイント</th>
                  <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-muted-foreground/70 uppercase">目標時刻</th>
                  <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] text-muted-foreground/70 uppercase">退勤</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCheckIns.map((item, index) => (
                  <tr key={item.time.toISOString()} className={`border-b border-border/50 text-foreground transition-colors hover:bg-secondary/30 ${index % 2 === 0 ? "" : "bg-secondary/10"}`}>
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {new Intl.DateTimeFormat("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(item.time)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(item.status)}`}>
                        {getCheckInStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums">{formatPoint(item.pointsEarned)} pt</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{item.targetTime}</td>
                    <td className="px-4 py-3 tabular-nums">{item.checkOutTime ? formatTimeLabel(item.checkOutTime) : <span className="text-muted-foreground/40">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
