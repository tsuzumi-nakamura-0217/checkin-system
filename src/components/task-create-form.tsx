"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CreateTaskSuccessResponse = {
  success: true
}

type CreateTaskErrorResponse = {
  success: false
  error: string
}

export function TaskCreateForm() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [estimatedHours, setEstimatedHours] = useState(1)
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim()) {
      setIsError(true)
      setMessage("タスク名は必須です。")
      return
    }

    setIsSubmitting(true)
    setIsError(false)
    setMessage(null)

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          estimatedHours,
          startAt: startAt ? new Date(startAt).toISOString() : null,
          endAt: endAt ? new Date(endAt).toISOString() : null,
        }),
      })

      const data = (await response.json()) as CreateTaskSuccessResponse | CreateTaskErrorResponse

      if (!response.ok || !data.success) {
        const errorMessage = data && !data.success ? data.error : "タスクの追加に失敗しました。"
        throw new Error(errorMessage)
      }

      setTitle("")
      setDescription("")
      setEstimatedHours(1)
      setStartAt("")
      setEndAt("")
      setMessage("タスクを追加しました。")
      router.refresh()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : "タスクの追加に失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <Label htmlFor="task-title" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">タスク名</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例: 実験ノート整理"
          maxLength={120}
          required
          className="h-12 rounded-xl border-border bg-background px-4 text-base shadow-none transition-all focus:bg-background focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">詳細（任意）</Label>
        <textarea
          id="task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-25 w-full rounded-xl border border-border bg-background px-4 py-3 text-base shadow-none outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-ring"
          placeholder="メモがあれば入力"
          maxLength={300}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="task-hours" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">見積時間（h）</Label>
          <Input
            id="task-hours"
            type="number"
            min={1}
            max={24}
            value={estimatedHours}
            onChange={(event) => setEstimatedHours(Math.max(1, Math.min(24, Number(event.target.value) || 1)))}
            className="h-12 rounded-xl border-border bg-background px-4 text-base shadow-none transition-all focus:bg-background focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Padding for layout matching if needed, or left empty */}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="task-start-at" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">開始日時</Label>
          <Input
            id="task-start-at"
            type="datetime-local"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
            className="h-12 rounded-xl border-border bg-background px-4 text-base shadow-none transition-all focus:bg-background focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-end-at" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">終了日時</Label>
          <Input
            id="task-end-at"
            type="datetime-local"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
            className="h-12 rounded-xl border-border bg-background px-4 text-base shadow-none transition-all focus:bg-background focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="h-12 w-full rounded-2xl bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary sm:w-auto"
        >
          {isSubmitting ? "追加中..." : "タスクを追加"}
        </Button>
        {message ? (
          <p className={`text-sm font-medium ${isError ? "text-destructive" : "text-primary"}`}>{message}</p>
        ) : null}
      </div>
    </form>
  )
}
