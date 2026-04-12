"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type CheckOutButtonProps = {
  hasTodayCheckIn: boolean
  alreadyCheckedOut: boolean
}

type CheckOutSuccessResponse = {
  success: true
  checkedOutAt: string
  taskSummaryText: string
}

type CheckOutErrorResponse = {
  success: false
  error: string
}

export function CheckOutButton({
  hasTodayCheckIn,
  alreadyCheckedOut,
}: CheckOutButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const isDisabled = !hasTodayCheckIn || alreadyCheckedOut || isSubmitting

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
    if (isDisabled) return

    setIsSubmitting(true)
    setMessage(null)
    setIsError(false)
    setReportTextToCopy(null)

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
      })

      const data = (await response.json()) as CheckOutSuccessResponse | CheckOutErrorResponse

      if (!response.ok || !data.success) {
        const errorMessage = data && !data.success ? data.error : "退勤記録に失敗しました。"
        throw new Error(errorMessage)
      }

      const checkedOutTimeLabel = new Intl.DateTimeFormat("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(data.checkedOutAt))

      const copied = await copySummaryToClipboard(data.taskSummaryText)
      setReportTextToCopy(data.taskSummaryText)

      if (copied) {
        setMessage(`退勤を記録しました (${checkedOutTimeLabel})。タスク概要をコピーしました。`)
      } else {
        setMessage(`退勤を記録しました (${checkedOutTimeLabel})。`)
      }

      router.refresh()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : "退勤記録に失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`w-full rounded-xl border px-8 py-3.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 ${
          alreadyCheckedOut
            ? "border-accent/20 bg-accent/8 text-accent"
            : "border-border bg-card text-foreground shadow-sm hover:shadow-themed hover:border-primary/20 active:scale-[0.99]"
        }`}
      >
        {!hasTodayCheckIn
          ? "先にチェックインしてください"
          : alreadyCheckedOut
            ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                本日の退勤記録済み
              </span>
            )
            : isSubmitting
              ? "退勤を記録中..."
              : "退勤を記録する"}
      </button>
      {message ? (
        <div className="flex flex-col gap-2">
          <p className={`text-xs font-medium ${isError ? "text-destructive" : "text-accent"}`}>{message}</p>
          {!isError && reportTextToCopy && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(reportTextToCopy)
                  setMessage(message.replace("。", "。 ") + "タスク概要をコピーしました。")
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
