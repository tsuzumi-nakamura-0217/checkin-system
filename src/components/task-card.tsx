"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TaskStatusToggle } from "@/components/task-status-toggle"
import { formatPoint, formatTaskRange, getTaskTypeLabel } from "@/lib/dashboard-data"

type Task = {
  id: string
  title: string
  description: string | null
  estimatedHours: number
  type: string
  status: string
  startAt: Date | null
  endAt: Date | null
  pointsEarned: number | null
}

type TaskCardProps = {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [estimatedHours, setEstimatedHours] = useState(task.estimatedHours)
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUpdate = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, estimatedHours })
      })

      if (response.ok) {
        setIsEditing(false)
        router.refresh()
      } else {
        alert("更新に失敗しました")
      }
    } catch {
      alert("エラーが発生しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("このタスクを削除しますか？")) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        router.refresh()
      } else {
        alert("削除に失敗しました")
      }
    } catch {
      alert("エラーが発生しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isEditing) {
    return (
      <li className="relative space-y-4 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div>
          <label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">タスク名</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            maxLength={120}
          />
        </div>
        <div>
          <label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">詳細</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 min-h-15 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            maxLength={300}
          />
        </div>
        <div>
          <label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">見積時間 (H)</label>
          <input
            type="number"
            value={estimatedHours}
            onChange={(e) => {
              const next = Number(e.target.value)
              setEstimatedHours(Number.isFinite(next) ? Math.max(1, Math.min(24, next)) : 1)
            }}
            min={1}
            max={24}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-1/3"
          />
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button 
            type="button" 
            onClick={() => setIsEditing(false)} 
            disabled={isSubmitting}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
          >
            キャンセル
          </button>
          <button 
            type="button" 
            onClick={handleUpdate}
            disabled={isSubmitting}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:bg-muted"
          >
            保存
          </button>
        </div>
      </li>
    )
  }

  return (
    <li
      className={`group relative overflow-hidden rounded-2xl border border-border p-5 transition-all hover:shadow-md ${task.status === "DONE" ? "bg-secondary" : "bg-card"}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-base font-semibold tracking-tight ${task.status === "DONE" ? "text-muted-foreground line-through" : "text-foreground"}`}
            >
              {task.title}
            </p>
            <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {getTaskTypeLabel(task.type)}
            </span>
            <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {task.estimatedHours}h
            </span>
          </div>

          {task.description ? <p className="text-sm text-muted-foreground">{task.description}</p> : null}

          {task.startAt && task.endAt ? (
            <p className="text-xs text-muted-foreground">{`予定: ${formatTaskRange(task.startAt, task.endAt)}`}</p>
          ) : (
            <p className="text-xs text-muted-foreground">予定未設定</p>
          )}

          {task.status === "DONE" ? (
            <p className="text-xs font-medium text-primary">
              {`完了ポイント: ${formatPoint(task.pointsEarned ?? task.estimatedHours * 10)}pt`}
            </p>
          ) : null}
          
          <div className="flex items-center gap-1.5 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsEditing(true)}
              aria-label="タスクを編集"
              title="編集"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleDelete}
              disabled={isSubmitting}
              aria-label="タスクを削除"
              title="削除"
              className="text-destructive hover:bg-secondary hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        <TaskStatusToggle taskId={task.id} status={task.status} />
      </div>
    </li>
  )
}
