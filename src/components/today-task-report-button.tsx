"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { buildTaskSummaryText } from "@/lib/task-summary"

type TodayTaskReportItem = {
  title: string
  status: string
  estimatedHours: number | null
}

type TodayTaskReportButtonProps = {
  todayTasks: TodayTaskReportItem[]
}

export function TodayTaskReportButton({ todayTasks }: TodayTaskReportButtonProps) {
  const feedbackTimerRef = useRef<number | null>(null)
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null)

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  const handleCopyReport = useCallback(async () => {
    const summaryText = buildTaskSummaryText({
      date: new Date(),
      tasks: todayTasks.map((task) => ({
        title: task.title,
        status: task.status,
        estimatedHours: task.estimatedHours,
      })),
    })

    try {
      await navigator.clipboard.writeText(summaryText)
      setFeedback("success")
    } catch {
      setFeedback("error")
    }

    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
    }

    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null)
      feedbackTimerRef.current = null
    }, 2400)
  }, [todayTasks])

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopyReport}
        className="rounded-full bg-primary px-3 py-1 text-xs font-semibold tracking-wide text-primary-foreground transition-colors hover:bg-primary"
      >
        今日のタスクを報告
      </button>
      {feedback ? (
        <span
          aria-live="polite"
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${feedback === "success" ? "bg-primary text-primary-foreground" : "bg-destructive text-white"}`}
        >
          {feedback === "success" ? "コピーしました" : "コピー失敗"}
        </span>
      ) : null}
    </div>
  )
}
