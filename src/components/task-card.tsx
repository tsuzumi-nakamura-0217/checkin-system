"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TaskStatusToggle } from "@/components/task-status-toggle"
import { formatPoint, formatTaskRange, getTaskTypeLabel } from "@/lib/dashboard-data"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [estimatedHours, setEstimatedHours] = useState(task.estimatedHours)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, estimatedHours })
      })

      if (response.ok) {
        startTransition(() => {
          setIsOpen(false)
          router.refresh()
        })
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
        startTransition(() => {
          setIsOpen(false)
          router.refresh()
        })
      } else {
        alert("削除に失敗しました")
      }
    } catch {
      alert("エラーが発生しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setTitle(task.title)
        setDescription(task.description || "")
        setEstimatedHours(task.estimatedHours)
      }, 300)
    }
    setIsOpen(open)
  }

  const isLoading = isSubmitting || isPending

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <li
            className={`group relative overflow-hidden rounded-2xl border border-border p-5 transition-all hover:shadow-md cursor-pointer ${task.status === "DONE" ? "bg-secondary" : "bg-card"}`}
          />
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1 w-full">
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

            {task.description ? <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p> : null}

            {task.startAt && task.endAt ? (
              <p className="text-xs text-muted-foreground">{`予定: ${formatTaskRange(task.startAt, task.endAt)}`}</p>
            ) : (
              <p className="text-xs text-muted-foreground">予定未設定</p>
            )}

            {task.status === "DONE" ? (
              <p className="text-xs font-medium text-primary pt-1">
                {`完了ポイント: ${formatPoint(task.pointsEarned ?? task.estimatedHours * 10)}pt`}
              </p>
            ) : null}
          </div>

          <div onClick={(e) => e.stopPropagation()} className="sm:ml-auto">
            <TaskStatusToggle taskId={task.id} status={task.status} />
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg rounded-3xl border-border bg-card p-6 shadow-lg sm:p-8">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl">タスクを編集</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">タスク名</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 rounded-xl border-border bg-background px-4 text-base shadow-none transition-all focus:bg-background focus:ring-2 focus:ring-ring"
              maxLength={120}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">詳細</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] w-full rounded-xl border border-border bg-background px-4 py-3 text-base shadow-none outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-ring"
              maxLength={300}
            />
          </div>
          
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">見積時間 (H)</Label>
              <Input
                type="number"
                value={estimatedHours}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setEstimatedHours(Number.isFinite(next) ? Math.max(1, Math.min(24, next)) : 1)
                }}
                min={1}
                max={24}
                className="h-12 rounded-xl border-border bg-background px-4 text-base shadow-none transition-all focus:bg-background focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-4 pt-4 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isLoading}
              className="h-11 rounded-full text-destructive border-border hover:bg-destructive hover:text-white"
            >
              <Trash2 className="size-4 mr-2" />
              削除
            </Button>
            
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsOpen(false)} 
                disabled={isLoading}
                className="h-11 rounded-full px-6 font-medium text-muted-foreground"
              >
                キャンセル
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-11 rounded-full bg-primary px-8 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
              >
                {isLoading ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

