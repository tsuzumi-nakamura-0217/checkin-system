"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type TaskStatus = "TODO" | "DONE" | string

type TaskStatusToggleProps = {
  taskId: string
  status: TaskStatus
}

type UpdateTaskStatusSuccessResponse = {
  success: true
}

type UpdateTaskStatusErrorResponse = {
  success: false
  error: string
}

export function TaskStatusToggle({ taskId, status }: TaskStatusToggleProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDone = status === "DONE"

  const handleToggle = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: isDone ? "TODO" : "DONE",
        }),
      })

      const data = (await response.json()) as
        | UpdateTaskStatusSuccessResponse
        | UpdateTaskStatusErrorResponse

      if (!response.ok || !data.success) {
        const message = data && !data.success ? data.error : "タスク更新に失敗しました。"
        throw new Error(message)
      }

      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <button
      type="button"
      disabled={isSubmitting}
      onClick={handleToggle}
      className={`group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50 ${
        isDone
          ? "border-accent/30 bg-accent/8 text-accent hover:bg-accent/15"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
      }`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
        isDone
          ? "border-accent bg-accent text-white"
          : "border-muted-foreground/30 bg-background group-hover:border-primary/50"
      }`}>
        {isDone && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {isSubmitting ? "更新中..." : isDone ? "完了" : "未完了"}
    </button>
  )
}
