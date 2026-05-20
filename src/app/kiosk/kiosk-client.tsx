"use client"

import { useState, useEffect, useCallback } from "react"

type TodayStatus = "unchecked" | "checked_in" | "checked_out"

type KioskUser = {
  id: string
  name: string | null
  image: string | null
  points: number
  todayStatus: TodayStatus
  checkedInAt: string | null
  checkedOutAt: string | null
  checkInStatus: string | null
  pointsEarned: number | null
}

type ModalState =
  | { type: "confirm"; user: KioskUser; action: "checkin" | "checkout" }
  | { type: "result"; user: KioskUser; action: "checkin" | "checkout"; success: boolean; message: string }
  | null

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name.slice(0, 2)
}

function formatTime(iso: string | null): string {
  if (!iso) return ""
  return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(iso))
}

function StatusBadge({ status }: { status: TodayStatus }) {
  if (status === "checked_in") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        出勤中
      </span>
    )
  }
  if (status === "checked_out") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        退勤済
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500">
      <span className="h-2 w-2 rounded-full bg-slate-400" />
      未出勤
    </span>
  )
}

function UserCard({ user, onTap }: { user: KioskUser; onTap: (user: KioskUser) => void }) {
  return (
    <button
      type="button"
      onClick={() => onTap(user)}
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-150 active:scale-[0.97] hover:shadow-md hover:border-primary/30 hover:bg-primary/5 touch-none select-none"
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.image} alt={user.name ?? ""} className="h-20 w-20 rounded-full object-cover ring-2 ring-border" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary ring-2 ring-primary/20">
          {getInitials(user.name)}
        </div>
      )}
      <div className="flex flex-col items-center gap-2">
        <p className="text-lg font-bold text-foreground leading-tight">{user.name ?? "不明"}</p>
        <StatusBadge status={user.todayStatus} />
        {user.todayStatus === "checked_in" && user.checkedInAt && (
          <p className="text-xs text-muted-foreground">{formatTime(user.checkedInAt)} 入室</p>
        )}
        {user.todayStatus === "checked_out" && user.checkedOutAt && (
          <p className="text-xs text-muted-foreground">{formatTime(user.checkedInAt)} 〜 {formatTime(user.checkedOutAt)}</p>
        )}
      </div>
    </button>
  )
}

export function KioskClient() {
  const [users, setUsers] = useState<KioskUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>(null)
  const [isActing, setIsActing] = useState(false)
  const [clock, setClock] = useState("")

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/kiosk/users")
      if (res.ok) {
        const data = await res.json() as { users: KioskUser[] }
        setUsers(data.users)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    const interval = setInterval(fetchUsers, 30000)
    return () => clearInterval(interval)
  }, [fetchUsers])

  useEffect(() => {
    const tick = () => {
      setClock(
        new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric", month: "2-digit", day: "2-digit",
          weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit",
        }).format(new Date())
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleTap = (user: KioskUser) => {
    if (user.todayStatus === "checked_out") {
      setModal({ type: "result", user, action: "checkout", success: true, message: "本日の勤務は完了しています。" })
      return
    }
    const action = user.todayStatus === "unchecked" ? "checkin" : "checkout"
    setModal({ type: "confirm", user, action })
  }

  const handleAction = async () => {
    if (!modal || modal.type !== "confirm") return
    const { user, action } = modal
    setIsActing(true)

    const endpoint = action === "checkin" ? "/api/kiosk/checkin" : "/api/kiosk/checkout"
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json() as { success: boolean; error?: string; status?: string; pointsEarned?: number; checkedInAt?: string; checkedOutAt?: string }

      if (data.success) {
        const message = action === "checkin"
          ? `チェックイン完了！ (${data.status === "EARLY" ? "早着" : data.status === "LATE" ? "遅刻" : "時間内"}, ${(data.pointsEarned ?? 0) >= 0 ? "+" : ""}${data.pointsEarned}pt)`
          : `退勤しました。お疲れさまでした！`
        setModal({ type: "result", user, action, success: true, message })
        fetchUsers()
      } else {
        setModal({ type: "result", user, action, success: false, message: data.error ?? "エラーが発生しました。" })
      }
    } catch {
      setModal({ type: "result", user, action, success: false, message: "通信エラーが発生しました。" })
    } finally {
      setIsActing(false)
    }
  }

  const closeModal = () => setModal(null)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-8 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">研究室チェックイン</h1>
            <p className="text-xs text-muted-foreground">名前をタッチしてください</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-foreground">{clock.split(" ").pop()}</p>
          <p className="text-sm text-muted-foreground">{clock.split(" ").slice(0, -1).join(" ")}</p>
        </div>
      </header>

      {/* User grid */}
      <main className="flex-1 p-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            ユーザーが見つかりません
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {users.map((user) => (
              <UserCard key={user.id} user={user} onTap={handleTap} />
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-2xl border border-border mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User info */}
            <div className="flex flex-col items-center gap-3 mb-6">
              {modal.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={modal.user.image} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-border" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary ring-4 ring-primary/20">
                  {getInitials(modal.user.name)}
                </div>
              )}
              <h2 className="text-2xl font-bold text-foreground">{modal.user.name}</h2>
            </div>

            {modal.type === "confirm" && (
              <>
                <p className="text-center text-base text-muted-foreground mb-6">
                  {modal.action === "checkin"
                    ? "チェックインしますか？"
                    : `${formatTime(modal.user.checkedInAt)} に入室中です。退勤しますか？`}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isActing}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-4 text-base font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleAction}
                    disabled={isActing}
                    className={`flex-1 rounded-xl px-4 py-4 text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 ${
                      modal.action === "checkin"
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : "bg-sky-500 hover:bg-sky-600"
                    }`}
                  >
                    {isActing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        処理中...
                      </span>
                    ) : modal.action === "checkin" ? "チェックイン" : "退勤する"}
                  </button>
                </div>
              </>
            )}

            {modal.type === "result" && (
              <>
                <div className={`flex flex-col items-center gap-3 mb-6 ${modal.success ? "text-emerald-600" : "text-destructive"}`}>
                  {modal.success ? (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                      <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                      <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  <p className="text-center text-base font-semibold">{modal.message}</p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full rounded-xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  閉じる
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
