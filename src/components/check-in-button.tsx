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
        className="w-full rounded-2xl bg-primary px-8 py-4 text-center text-[1rem] font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100"
      >
        {checkedIn ? "本日はチェックイン済み" : isSubmitting ? "位置情報を確認中..." : "チェックインする"}
      </button>
      {message ? (
        <p className={`text-xs ${isError ? "text-destructive" : "text-primary"}`}>{message}</p>
      ) : null}
    </div>
  )
}
