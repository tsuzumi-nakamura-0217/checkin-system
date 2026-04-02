import { redirect } from "next/navigation"

import {
  formatPoint,
  getCheckInStatusLabel,
  getDashboardData,
} from "@/lib/dashboard-data"
import { getCurrentUser } from "@/lib/current-user"
import { formatTimeLabel } from "@/lib/calendar-utils"

export default async function DashboardHistoryPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  const data = await getDashboardData(currentUser.id)

  if (!data) {
    redirect("/login")
  }

  return (
    <section className="space-y-5">
      <h2>履歴</h2>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        {data.recentCheckIns.length === 0 ? (
          <p className="text-sm text-muted-foreground">チェックイン履歴がまだありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">日時</th>
                  <th className="px-2 py-2">ステータス</th>
                  <th className="px-2 py-2">ポイント</th>
                  <th className="px-2 py-2">目標時刻</th>
                  <th className="px-2 py-2">退勤</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCheckIns.map((item) => (
                  <tr key={item.time.toISOString()} className="border-b border-border text-foreground">
                    <td className="px-2 py-2">
                      {new Intl.DateTimeFormat("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(item.time)}
                    </td>
                    <td className="px-2 py-2">{getCheckInStatusLabel(item.status)}</td>
                    <td className="px-2 py-2 font-medium">{formatPoint(item.pointsEarned)} pt</td>
                    <td className="px-2 py-2">{item.targetTime}</td>
                    <td className="px-2 py-2">{item.checkOutTime ? formatTimeLabel(item.checkOutTime) : "-"}</td>
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
