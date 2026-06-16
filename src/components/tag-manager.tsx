"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Pencil, Plus, Tags, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TAG_COLORS, DEFAULT_TAG_COLOR, getTagColorPreset } from "@/lib/tags"
import type { TagItem } from "@/components/tag-badge"

type TagManagerProps = {
  tags: TagItem[]
  triggerClassName?: string
}

const DEFAULT_TRIGGER_CLASS =
  "h-11 w-full sm:w-auto rounded-xl border-border px-5 text-sm font-bold shadow-sm transition-all hover:shadow-themed flex items-center justify-center gap-2"

type TagMutationResponse =
  | { success: true; tag: TagItem }
  | { success: false; error: string }

function ColorDots({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TAG_COLORS.map((preset) => (
        <button
          key={preset.key}
          type="button"
          onClick={() => onChange(preset.key)}
          title={preset.label}
          className={`size-6 rounded-full ${preset.dot} ring-offset-2 ring-offset-card transition-all ${
            value === preset.key ? "ring-2 ring-foreground/40" : ""
          }`}
        />
      ))}
    </div>
  )
}

export function TagManager({ tags, triggerClassName }: TagManagerProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [list, setList] = useState<TagItem[]>(tags)

  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(DEFAULT_TAG_COLOR)
  const [isAdding, setIsAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState(DEFAULT_TAG_COLOR)
  const [isSaving, setIsSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setList(tags)
    } else {
      setEditingId(null)
      setError(null)
      setIsAdding(false)
      setNewName("")
      setNewColor(DEFAULT_TAG_COLOR)
    }
    setIsOpen(open)
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) {
      setError("タグ名を入力してください。")
      return
    }
    setIsAdding(true)
    setError(null)
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newColor }),
      })
      const data = (await response.json()) as TagMutationResponse
      if (!response.ok || !data.success) {
        setError(data && !data.success ? data.error : "タグの作成に失敗しました。")
        return
      }
      setList((prev) => [...prev, data.tag].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName("")
      setNewColor(DEFAULT_TAG_COLOR)
      router.refresh()
    } catch {
      setError("タグの作成に失敗しました。")
    } finally {
      setIsAdding(false)
    }
  }

  const startEditing = (tag: TagItem) => {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
    setError(null)
  }

  const handleSave = async (tagId: string) => {
    const name = editName.trim()
    if (!name) {
      setError("タグ名を入力してください。")
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: editColor }),
      })
      const data = (await response.json()) as TagMutationResponse
      if (!response.ok || !data.success) {
        setError(data && !data.success ? data.error : "タグの更新に失敗しました。")
        return
      }
      setList((prev) =>
        prev
          .map((tag) => (tag.id === tagId ? data.tag : tag))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingId(null)
      router.refresh()
    } catch {
      setError("タグの更新に失敗しました。")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (tag: TagItem) => {
    if (!window.confirm(`タグ「${tag.name}」を削除しますか？タスクからも外れます。`)) return
    setError(null)
    try {
      const response = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" })
      if (!response.ok) {
        setError("タグの削除に失敗しました。")
        return
      }
      setList((prev) => prev.filter((item) => item.id !== tag.id))
      if (editingId === tag.id) setEditingId(null)
      router.refresh()
    } catch {
      setError("タグの削除に失敗しました。")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className={triggerClassName ?? DEFAULT_TRIGGER_CLASS}
          >
            <Tags className="h-4 w-4" />
            タグを管理
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg rounded-2xl border-border bg-card p-6 shadow-themed-lg sm:p-8">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-lg font-bold">タグを管理</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 新規追加 */}
          <div className="space-y-2 rounded-xl border border-border bg-background/70 p-3">
            <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">新しいタグ</p>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="例: 実験"
              maxLength={30}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-none outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
            <ColorDots value={newColor} onChange={setNewColor} />
            <button
              type="button"
              onClick={handleCreate}
              disabled={isAdding}
              className="inline-flex h-8 items-center gap-1 rounded-lg gradient-primary px-3 text-xs font-bold text-white shadow-sm transition-all hover:shadow-themed disabled:opacity-60"
            >
              <Plus className="size-3.5" />
              {isAdding ? "追加中..." : "追加"}
            </button>
          </div>

          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}

          {/* 一覧 */}
          {list.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">タグがありません。</p>
          ) : (
            <ul className="space-y-1.5">
              {list.map((tag) => {
                const preset = getTagColorPreset(tag.color)
                const isEditing = editingId === tag.id
                return (
                  <li
                    key={tag.id}
                    className="rounded-xl border border-border bg-card px-3 py-2"
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          maxLength={30}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-none outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                        />
                        <ColorDots value={editColor} onChange={setEditColor} />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSave(tag.id)}
                            disabled={isSaving}
                            className="inline-flex h-8 items-center gap-1 rounded-lg gradient-primary px-3 text-xs font-bold text-white shadow-sm disabled:opacity-60"
                          >
                            <Check className="size-3.5" />
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3.5" />
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <span className={`size-3 shrink-0 rounded-full ${preset.dot}`} />
                          <span className="truncate text-sm font-semibold text-foreground">{tag.name}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditing(tag)}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                            title="編集"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tag)}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-destructive transition-all hover:bg-destructive/10"
                            title="削除"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
