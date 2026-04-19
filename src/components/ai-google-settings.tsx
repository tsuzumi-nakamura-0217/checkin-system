"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

type LinkedAccount = {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  aiAuthorizedAt: string
  createdAt: string
}

type Usage = {
  requestCount: number
  limit: number
  ratio: number
}

type AccountsResponse = {
  accounts: LinkedAccount[]
  selectedAccountIds: string[]
  usage: Usage
  loginAccountNeedsReauth: boolean
  loginEmail: string | null
}

export function AiGoogleSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<AccountsResponse | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchAccounts = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch("/api/ai/google-accounts", { cache: "no-store" })
      if (!res.ok) {
        throw new Error("failed")
      }

      const nextData = (await res.json()) as AccountsResponse
      setData(nextData)
      setSelectedIds(nextData.selectedAccountIds)
    } catch {
      setMessage({ type: "error", text: "Google連携設定の読み込みに失敗しました。" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts().catch(() => undefined)
  }, [])

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const state = search.get("googleLink")

    if (!state) {
      return
    }

    if (state === "success") {
      setMessage({ type: "success", text: "Googleアカウントの再認証が完了しました。" })
      fetchAccounts().catch(() => undefined)
    } else {
      setMessage({ type: "error", text: `Google再認証に失敗しました (${state})` })
    }

    search.delete("googleLink")
    const nextQuery = search.toString()
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`
    window.history.replaceState({}, "", nextUrl)
  }, [])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      return [...prev, id]
    })
  }

  const handleSaveSelection = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/ai/google-accounts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedAccountIds: selectedIds }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || "save_failed")
      }

      setMessage({ type: "success", text: "デフォルト利用アカウントを更新しました。" })
      await fetchAccounts()
    } catch (error) {
      const text = error instanceof Error ? error.message : "保存に失敗しました。"
      setMessage({ type: "error", text })
    } finally {
      setSaving(false)
    }
  }

  const handleUnlink = async (accountId: string) => {
    const ok = window.confirm("このGoogleアカウント連携を解除しますか？")

    if (!ok) {
      return
    }

    setMessage(null)

    try {
      const res = await fetch(`/api/ai/google-accounts/${accountId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || "解除に失敗しました。")
      }

      setMessage({ type: "success", text: "Googleアカウント連携を解除しました。" })
      await fetchAccounts()
    } catch (error) {
      const text = error instanceof Error ? error.message : "解除に失敗しました。"
      setMessage({ type: "error", text })
    }
  }

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-sm text-destructive">設定データを表示できませんでした。</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI向けGoogle連携</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            ログイン済みのGoogleアカウントでも、Google系サービス参照にはこの画面での再認証が必要です。
          </p>
        </div>
        <Link
          href="/api/ai/google-accounts/authorize"
          prefetch={false}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Googleアカウントを追加
        </Link>
      </div>

      {data.loginAccountNeedsReauth ? (
        <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          現在ログイン中のアカウント（{data.loginEmail || "不明"}）は、AI参照に未連携です。必要なら「Googleアカウントを追加」から再認証してください。
        </div>
      ) : null}

      {message ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-background/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">Gemini 利用状況</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              本日 {data.usage.requestCount} / {data.usage.limit} 回
            </p>
          </div>
          <p className="text-xs text-muted-foreground">上限到達前に警告表示</p>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.round(data.usage.ratio * 100))}%` }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-background/60">
        {data.accounts.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">連携済みアカウントはまだありません。</div>
        ) : (
          <ul className="divide-y divide-border">
            {data.accounts.map((account) => (
              <li key={account.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(account.id)}
                    onChange={() => handleToggle(account.id)}
                    className="h-4 w-4 rounded border-border"
                  />
                  {account.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={account.avatarUrl} alt={account.email} className="h-9 w-9 rounded-full border border-border object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold">
                      {account.email[0]?.toUpperCase() || "G"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{account.displayName || "Google Account"}</p>
                    <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground">
                    再認証: {new Date(account.aiAuthorizedAt).toLocaleDateString("ja-JP")}
                  </span>
                  <Button variant="destructive" size="xs" onClick={() => handleUnlink(account.id)}>
                    解除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSaveSelection} disabled={saving}>
          {saving ? "保存中..." : "選択を保存"}
        </Button>
      </div>
    </div>
  )
}
