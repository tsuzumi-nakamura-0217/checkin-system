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
  const isDone = task.status === "DONE"

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <li
        onClick={() => setIsOpen(true)}
        className={`group relative overflow-hidden rounded-xl border-l-[3px] border border-border p-4 transition-all hover:shadow-themed hover:-translate-y-px cursor-pointer ${isDone ? "border-l-accent bg-accent/5" : "border-l-primary bg-card"}`}
      >
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={`text-sm font-bold tracking-tight ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {task.title}
              </p>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {getTaskTypeLabel(task.type)}
              </span>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                {task.estimatedHours}h
              </span>
            </div>

            {task.description ? <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p> : null}

            {task.startAt && task.endAt ? (
              <p className="text-[11px] text-muted-foreground tabular-nums">{`予定: ${formatTaskRange(task.startAt, task.endAt)}`}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground/50">予定未設定</p>
            )}

            {isDone ? (
              <p className="text-[11px] font-bold text-accent pt-0.5">
                {`完了ポイント: ${formatPoint(task.pointsEarned ?? task.estimatedHours * 10)}pt`}
              </p>
            ) : null}
          </div>

          <div onClick={(e) => e.stopPropagation()} className="sm:ml-auto flex-shrink-0">
            <TaskStatusToggle taskId={task.id} status={task.status} />
          </div>
        </div>
      </li>

      <DialogContent className="sm:max-w-lg rounded-2xl border-border bg-card p-6 shadow-themed-lg sm:p-8">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-lg font-bold">タスクを編集</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">タスク名</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl border-border bg-background px-4 text-sm font-medium shadow-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              maxLength={120}
              required
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">詳細</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium shadow-none outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              maxLength={300}
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">見積時間 (H)</Label>
            <Input
              type="number"
              value={estimatedHours}
              onChange={(e) => {
                const next = Number(e.target.value)
                setEstimatedHours(Number.isFinite(next) ? Math.max(1, Math.min(24, next)) : 1)
              }}
              min={1}
              max={24}
              className="h-11 rounded-xl border-border bg-background px-4 text-sm font-medium shadow-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          <div className="flex items-center justify-between gap-4 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isLoading}
              className="h-10 rounded-xl text-destructive border-destructive/20 bg-destructive/5 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4 mr-1.5" />
              削除
            </Button>
            
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsOpen(false)} 
                disabled={isLoading}
                className="h-10 rounded-xl px-5 font-semibold text-muted-foreground"
              >
                キャンセル
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-10 rounded-xl gradient-primary px-6 font-bold text-white shadow-sm transition-all hover:shadow-themed"
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
