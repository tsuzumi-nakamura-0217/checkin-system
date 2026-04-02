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
      await navigator.clipboard.writeText(summaryText)
      return true
    } catch {
      return false
    }
  }

  const handleClick = async () => {
    if (isDisabled) return

    setIsSubmitting(true)
    setMessage(null)
    setIsError(false)

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

      if (copied) {
        setMessage(`退勤を記録しました (${checkedOutTimeLabel})。本日のタスク概要をコピーしました。`)
      } else {
        setMessage(`退勤を記録しました (${checkedOutTimeLabel})。タスク概要のコピーに失敗しました。`)
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
        className="w-full rounded-2xl border border-border bg-card px-8 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none disabled:hover:translate-y-0"
      >
        {!hasTodayCheckIn
          ? "先にチェックインしてください"
          : alreadyCheckedOut
            ? "本日の退勤記録済み"
            : isSubmitting
              ? "退勤を記録中..."
              : "退勤を記録する"}
      </button>
      {message ? (
        <p className={`text-xs ${isError ? "text-destructive" : "text-primary"}`}>{message}</p>
      ) : null}
    </div>
  )
}
