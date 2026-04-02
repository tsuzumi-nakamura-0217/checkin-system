"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

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
    <Button
      type="button"
      variant={isDone ? "secondary" : "outline"}
      size="sm"
      disabled={isSubmitting}
      onClick={handleToggle}
      className="rounded-full"
    >
      {isSubmitting ? "更新中..." : isDone ? "ステータス: 完了" : "ステータス: 未完了"}
    </Button>
  )
}
