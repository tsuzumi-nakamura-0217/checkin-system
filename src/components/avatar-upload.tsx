"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

type Props = {
  currentImage: string | null
  googleImage: string | null
}

function compressImage(file: File, maxPx = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function AvatarUpload({ currentImage, googleImage }: Props) {
  const [preview, setPreview] = useState<string | null>(currentImage)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const displayImage = preview

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage({ text: "画像ファイルを選択してください", type: "error" })
      return
    }
    try {
      const dataUrl = await compressImage(file)
      setPreview(dataUrl)
      setMessage(null)
      await save(dataUrl)
    } catch {
      setMessage({ text: "画像の処理に失敗しました", type: "error" })
    }
  }

  const save = async (image: string) => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Upload failed")
      }
      setMessage({ text: "アイコンを保存しました", type: "success" })
      router.refresh()
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "保存に失敗しました", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/avatar", { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setPreview(null)
      setMessage({ text: "カスタムアイコンを削除しました", type: "success" })
      router.refresh()
    } catch {
      setMessage({ text: "削除に失敗しました", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">プロフィールアイコン</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          アップロードした画像はGoogleアカウントのアイコンより優先して表示されます。
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-medium shadow-sm ${
            message.type === "success"
              ? "bg-primary text-primary-foreground"
              : "bg-destructive text-white"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {/* Avatar preview */}
        <div className="relative shrink-0">
          {displayImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayImage}
              alt="プロフィールアイコン"
              className="h-20 w-20 rounded-2xl border-2 border-primary/20 object-cover shadow-sm"
            />
          ) : googleImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={googleImage}
              alt="Googleアイコン"
              className="h-20 w-20 rounded-2xl border-2 border-border object-cover shadow-sm opacity-60"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-border bg-secondary shadow-sm">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          {displayImage && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white shadow">
              ✓
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ""
            }}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-themed active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {saving ? "保存中..." : "画像をアップロード"}
          </button>

          {displayImage && (
            <button
              type="button"
              disabled={saving}
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-destructive/40 hover:text-destructive active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              カスタムアイコンを削除
            </button>
          )}

          <p className="text-[11px] text-muted-foreground">
            JPG / PNG / WebP など。自動的にリサイズされます。
          </p>
        </div>
      </div>
    </div>
  )
}
