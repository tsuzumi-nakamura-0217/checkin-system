"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type CheckInButtonProps = {
  checkedIn: boolean
}

type CheckInSuccessResponse = {
  success: true
  status: "EARLY" | "LATE" | "ON_TIME" | "REMOTE"
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
    if (!navigator.geolocation) {
      reject(new Error("このブラウザは位置情報取得に対応していません。"))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      let message = "位置情報の取得に失敗しました。"

      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = "位置情報の利用が許可されていません。ブラウザの設定から許可してください。"
          break
        case error.POSITION_UNAVAILABLE:
          message = "位置情報を取得できません。OSの位置情報設定がオンになっているか確認してください。"
          break
        case error.TIMEOUT:
          message = "位置情報の取得がタイムアウトしました。もう一度お試しください。"
          break
      }
      reject(new Error(message))
    }, {
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

function toStatusLabel(status: "EARLY" | "LATE" | "ON_TIME" | "REMOTE"): string {
  if (status === "EARLY") return "早着"
  if (status === "LATE") return "遅刻"
  if (status === "REMOTE") return "在宅勤務"
  return "時間内"
}

export function CheckInButton({ checkedIn }: CheckInButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRemoteSubmitting, setIsRemoteSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [showRemoteConfirm, setShowRemoteConfirm] = useState(false)

  const copySummaryToClipboard = async (summaryText: string): Promise<boolean> => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(summaryText)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const [reportTextToCopy, setReportTextToCopy] = useState<string | null>(null)

  const handleClick = async () => {
    if (checkedIn || isSubmitting) return

    setIsSubmitting(true)
    setMessage(null)
    setIsError(false)
    setReportTextToCopy(null)

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

      const copied = await copySummaryToClipboard(data.taskSummaryText)
      setReportTextToCopy(data.taskSummaryText)

      setMessage(
        `チェックイン完了: ${toStatusLabel(data.status)} (${toPointLabel(data.pointsEarned)}pt)` +
        (copied ? "。報告をコピーしました。" : "")
      )
      router.refresh()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : "チェックインに失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoteCheckIn = async () => {
    if (checkedIn || isRemoteSubmitting) return

    setIsRemoteSubmitting(true)
    setMessage(null)
    setIsError(false)
    setShowRemoteConfirm(false)
    setReportTextToCopy(null)

    try {
      const response = await fetch("/api/checkin/remote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = (await response.json()) as CheckInSuccessResponse | CheckInErrorResponse

      if (!response.ok || !data.success) {
        const errorMessage = data && !data.success ? data.error : "チェックインに失敗しました。"
        throw new Error(errorMessage)
      }

      const copied = await copySummaryToClipboard(data.taskSummaryText)
      setReportTextToCopy(data.taskSummaryText)

      setMessage(
        `在宅勤務チェックイン完了 (0pt)` + (copied ? "。報告をコピーしました。" : "")
      )
      router.refresh()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : "チェックインに失敗しました。")
    } finally {
      setIsRemoteSubmitting(false)
    }
  }

  const isBusy = isSubmitting || isRemoteSubmitting

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={checkedIn || isBusy}
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

      {/* 在宅勤務チェックイン */}
      {!checkedIn && !isBusy && !showRemoteConfirm && (
        <button
          type="button"
          onClick={() => setShowRemoteConfirm(true)}
          className="w-full rounded-lg px-4 py-2 text-center text-xs font-medium text-muted-foreground border border-dashed border-border bg-background/60 transition-all duration-200 hover:border-primary/30 hover:text-primary hover:bg-primary/5"
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            在宅勤務でチェックイン
          </span>
        </button>
      )}

      {/* 確認ダイアログ */}
      {showRemoteConfirm && !checkedIn && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 animate-fade-in">
          <p className="text-xs text-amber-800 font-medium">
            在宅勤務としてチェックインしますか？
          </p>
          <p className="text-[10px] text-amber-600">
            ※ 到着時刻によるポイント加減算はありません（0pt）
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRemoteCheckIn}
              disabled={isRemoteSubmitting}
              className="flex-1 rounded-md px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {isRemoteSubmitting ? "処理中..." : "確定する"}
            </button>
            <button
              type="button"
              onClick={() => setShowRemoteConfirm(false)}
              className="flex-1 rounded-md px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-300 bg-white hover:bg-amber-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {message ? (
        <div className="flex flex-col gap-2">
          <p className={`text-xs font-medium ${isError ? "text-destructive" : "text-accent"}`}>{message}</p>
          {!isError && reportTextToCopy && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(reportTextToCopy)
                  setMessage(message.replace("。", "。 ") + "報告をコピーしました。")
                } catch {
                  setMessage(message.replace("。", "。 ") + "コピーに失敗しました。")
                }
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition-all hover:bg-primary/20 animate-fade-in"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              報告用テキストをコピー
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
