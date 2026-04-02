"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type CheckInButtonProps = {
  checkedIn: boolean
}

type CheckInSuccessResponse = {
  success: true
  status: "EARLY" | "LATE" | "ON_TIME"
  pointsEarned: number
  totalPoints: number
  targetTime: string
  checkedInAt: string
}

type CheckInErrorResponse = {
  success: false
  error: string
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })
  })
}

function toPointLabel(points: number): string {
  if (points > 0) {
    return `+${points}`
  }
  return String(points)
}

function toStatusLabel(status: "EARLY" | "LATE" | "ON_TIME"): string {
  if (status === "EARLY") return "早着"
  if (status === "LATE") return "遅刻"
  return "時間内"
}

export function CheckInButton({ checkedIn }: CheckInButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const handleClick = async () => {
    if (checkedIn || isSubmitting) return

    if (!("geolocation" in navigator)) {
      setIsError(true)
      setMessage("このブラウザは位置情報取得に対応していません。")
      return
    }

    setIsSubmitting(true)
    setMessage(null)
    setIsError(false)

    try {
      const position = await getCurrentPosition()

      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      })

      const data = (await response.json()) as CheckInSuccessResponse | CheckInErrorResponse

      if (!response.ok || !data.success) {
        const errorMessage = data && !data.success ? data.error : "チェックインに失敗しました。"
        throw new Error(errorMessage)
      }

      setMessage(
        `チェックイン完了: ${toStatusLabel(data.status)} (${toPointLabel(data.pointsEarned)}pt)`
      )
      router.refresh()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : "チェックインに失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={checkedIn || isSubmitting}
        className={`w-full rounded-xl px-8 py-3.5 text-center text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100 ${
          checkedIn
            ? "bg-accent/10 text-accent border border-accent/20"
            : isSubmitting
              ? "bg-muted text-muted-foreground"
              : "gradient-primary text-white shadow-themed animate-pulse-soft hover:shadow-themed-lg"
        }`}
      >
        {checkedIn ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            本日はチェックイン済み
          </span>
        ) : isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            位置情報を確認中...
          </span>
        ) : (
          "チェックインする"
        )}
      </button>
      {message ? (
        <p className={`text-xs font-medium ${isError ? "text-destructive" : "text-accent"}`}>{message}</p>
      ) : null}
    </div>
  )
}
