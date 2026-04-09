"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { buildMorningReportText } from "@/lib/task-summary"

type TodayTaskReportItem = {
  title: string
  status: string
  estimatedHours: number | null
}

type TodayTaskReportButtonProps = {
  todayTasks: TodayTaskReportItem[]
  checkedInTimeLabel: string | null
  isRemote?: boolean
}

export function TodayTaskReportButton({ todayTasks, checkedInTimeLabel, isRemote }: TodayTaskReportButtonProps) {
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
    const summaryText = buildMorningReportText({
      date: new Date(),
      tasks: todayTasks.map((task) => ({
        title: task.title,
        status: task.status,
        estimatedHours: task.estimatedHours,
      })),
      checkedInTimeLabel,
      isRemote,
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
  }, [todayTasks, checkedInTimeLabel, isRemote])

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopyReport}
        className="flex items-center gap-1.5 rounded-xl gradient-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-themed"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
        報告コピー
      </button>
      {feedback ? (
        <span
          aria-live="polite"
          className={`rounded-lg px-2 py-1 text-[10px] font-bold animate-fade-in ${feedback === "success" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}
        >
          {feedback === "success" ? "✓ コピー完了" : "コピー失敗"}
        </span>
      ) : null}
    </div>
  )
}
