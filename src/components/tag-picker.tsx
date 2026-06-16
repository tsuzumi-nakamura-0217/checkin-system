"use client"

import { useState } from "react"
import { Check, Plus, X } from "lucide-react"

import { TAG_COLORS, DEFAULT_TAG_COLOR, getTagColorPreset } from "@/lib/tags"
import type { TagItem } from "@/components/tag-badge"

type TagPickerProps = {
  tags: TagItem[]
  selectedIds: string[]
  onSelectedChange: (ids: string[]) => void
  onTagCreated: (tag: TagItem) => void
}

type CreateTagResponse =
  | { success: true; tag: TagItem }
  | { success: false; error: string }

export function TagPicker({ tags, selectedIds, onSelectedChange, onTagCreated }: TagPickerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(DEFAULT_TAG_COLOR)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onSelectedChange(selectedIds.filter((id) => id !== tagId))
    } else {
      onSelectedChange([...selectedIds, tagId])
    }
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) {
      setError("タグ名を入力してください。")
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newColor }),
      })
      const data = (await response.json()) as CreateTagResponse

      if (!response.ok || !data.success) {
        setError(data && !data.success ? data.error : "タグの作成に失敗しました。")
        return
      }

      onTagCreated(data.tag)
      onSelectedChange([...selectedIds, data.tag.id])
      setNewName("")
      setNewColor(DEFAULT_TAG_COLOR)
      setIsCreating(false)
    } catch {
      setError("タグの作成に失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && !isCreating ? (
          <p className="text-[11px] text-muted-foreground/70">タグはまだありません。下から追加できます。</p>
        ) : null}

        {tags.map((tag) => {
          const preset = getTagColorPreset(tag.color)
          const isSelected = selectedIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold transition-all ${
                isSelected
                  ? preset.badge
                  : "border-border bg-background text-muted-foreground hover:bg-secondary"
              }`}
            >
              {isSelected ? (
                <Check className="size-3" />
              ) : (
                <span className={`size-2 rounded-full ${preset.dot}`} />
              )}
              <span className="max-w-[10rem] truncate">{tag.name}</span>
            </button>
          )
        })}
      </div>

      {isCreating ? (
        <div className="space-y-2 rounded-xl border border-border bg-background/70 p-3">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="新しいタグ名"
            maxLength={30}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-none outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setNewColor(preset.key)}
                title={preset.label}
                className={`size-6 rounded-full ${preset.dot} ring-offset-2 ring-offset-background transition-all ${
                  newColor === preset.key ? "ring-2 ring-foreground/40" : ""
                }`}
              />
            ))}
          </div>
          {error ? <p className="text-[11px] font-medium text-destructive">{error}</p> : null}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting}
              className="inline-flex h-8 items-center gap-1 rounded-lg gradient-primary px-3 text-xs font-bold text-white shadow-sm transition-all hover:shadow-themed disabled:opacity-60"
            >
              <Plus className="size-3.5" />
              {isSubmitting ? "追加中..." : "追加"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false)
                setError(null)
                setNewName("")
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] font-bold text-muted-foreground transition-all hover:bg-secondary"
        >
          <Plus className="size-3" />
          新規タグ
        </button>
      )}
    </div>
  )
}
