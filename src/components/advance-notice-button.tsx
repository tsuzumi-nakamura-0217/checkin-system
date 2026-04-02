"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type DashboardAdvanceNotice = {
  id: string
  type: string
  date: Date | string
  newTargetTime: string | null
  reason: string
  status: string
}

type AdvanceNoticeButtonProps = {
  requests: DashboardAdvanceNotice[]
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function toJSTString(date: Date): string {
  const d = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return d.toISOString().split("T")[0]
}

export function AdvanceNoticeButton({ requests }: AdvanceNoticeButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<"LATE" | "ABSENT">("LATE")
  const [date, setDate] = useState("")
  const [newTargetTime, setNewTargetTime] = useState("10:00")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null)

  const tomorrow = addDays(new Date(), 1)
  const minDate = toJSTString(tomorrow)

  const closeModal = () => {
    setIsOpen(false)
    setType("LATE")
    setDate("")
    setNewTargetTime("10:00")
    setReason("")
    setMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch("/api/advance-notice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          date,
          newTargetTime: type === "LATE" ? newTargetTime : undefined,
          reason,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "事前申告に失敗しました。")
      }

      setMessage({ type: "success", text: "事前申告を送信しました。" })
      setTimeout(() => {
        closeModal()
        router.refresh()
      }, 1500)
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "事前申告に失敗しました。",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("この事前申告を取り消しますか？")) return

    try {
      const response = await fetch(`/api/advance-notice?id=${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "取り消しに失敗しました。")
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "取り消しに失敗しました。")
    }
  }

  return (
    <>
      <div className="flex w-full flex-col gap-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-xl border border-border bg-card px-8 py-3.5 text-sm font-bold text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-themed hover:border-primary/20 active:scale-[0.99]"
        >
          事前申告（遅刻・欠席）
        </button>

        {requests.length > 0 && (
          <div className="w-full space-y-2.5">
            <h4 className="text-xs font-bold tracking-wide text-muted-foreground/70 uppercase">今後の事前申告</h4>
            {requests.map((req) => {
              const dateStr = new Date(req.date).toLocaleDateString("ja-JP", {
                month: "short",
                day: "numeric",
              })
              const isPastDeadline = new Date(req.date).getTime() - 24 * 60 * 60 * 1000 < Date.now()

              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-themed"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                          req.type === "ABSENT"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                        }`}
                      >
                        {req.type === "ABSENT" ? "欠席" : "遅刻"}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{dateStr}</span>
                      {req.type === "LATE" && req.newTargetTime && (
                        <span className="text-xs font-medium text-muted-foreground">
                          {req.newTargetTime} 予定
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{req.reason}</p>
                  </div>
                  {!isPastDeadline && (
                    <button
                      type="button"
                      onClick={() => handleDelete(req.id)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="取り消し"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
            aria-label="モーダルを閉じる"
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-themed-lg animate-scale-in sm:p-8">
            <div className="mb-6">
              <h3 className="text-lg font-bold tracking-tight text-foreground">事前申告</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                遅刻または欠席の申告は前日の23:59までに行ってください。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">
                  申告タイプ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("LATE")}
                    className={`rounded-xl border py-2.5 text-sm font-bold transition-all ${
                      type === "LATE"
                        ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    遅刻
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("ABSENT")}
                    className={`rounded-xl border py-2.5 text-sm font-bold transition-all ${
                      type === "ABSENT"
                        ? "border-destructive/30 bg-destructive/10 text-destructive shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    欠席
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="notice-date" className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">
                    対象日
                  </label>
                  <input
                    id="notice-date"
                    type="date"
                    min={minDate}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium shadow-none outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {type === "LATE" && (
                  <div className="space-y-2">
                    <label htmlFor="notice-time" className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">
                      予定到着時刻
                    </label>
                    <input
                      id="notice-time"
                      type="time"
                      value={newTargetTime}
                      onChange={(e) => setNewTargetTime(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium shadow-none outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="notice-reason" className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">
                  理由
                </label>
                <textarea
                  id="notice-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="理由を入力してください..."
                  required
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium shadow-none outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {message && (
                <p className={`text-sm font-medium ${message.type === "error" ? "text-destructive" : "text-accent"}`}>
                  {message.text}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl gradient-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow-themed disabled:opacity-50"
                >
                  {isSubmitting ? "送信中..." : "申告する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
