"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Bot, MessageSquarePlus, SendHorizontal, Sparkles, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SessionListItem = {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  messages: Array<{
    role: string
    content: string
    createdAt: string
  }>
}

type SessionDetail = {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  messages: Array<{
    id: string
    role: string
    content: string
    metadataJson: string | null
    createdAt: string
  }>
}

type UsageStatus = {
  requestCount: number
  limit: number
}

type MessageMetadata = {
  accountRefs?: Array<{ accountId: string; email: string }>
  warnings?: string[]
}

type AiChatPanelProps = {
  mode?: "page" | "sidebar"
  className?: string
  onClose?: () => void
}

function parseMetadata(raw: string | null): MessageMetadata | null {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as MessageMetadata
  } catch {
    return null
  }
}

export function AiChatPanel({ mode = "page", className, onClose }: AiChatPanelProps) {
  const isSidebar = mode === "sidebar"
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [usage, setUsage] = useState<UsageStatus | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const activeSessionTitle = useMemo(() => {
    return activeSession?.title || "新しい会話"
  }, [activeSession])

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true)

    try {
      const res = await fetch("/api/ai/chat/sessions", { cache: "no-store" })
      if (!res.ok) {
        throw new Error("会話一覧の取得に失敗しました。")
      }

      const data = (await res.json()) as { sessions: SessionListItem[] }
      setSessions(data.sessions)

      setActiveSessionId((prev) => {
        const stillExists = data.sessions.some((session) => session.id === prev)
        if (!prev || !stillExists) {
          return data.sessions[0]?.id || null
        }
        return prev
      })
    } catch (error) {
      const text = error instanceof Error ? error.message : "会話一覧の取得に失敗しました。"
      setMessage({ type: "error", text })
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  const loadSessionDetail = useCallback(async (sessionId: string) => {
    setLoadingMessages(true)

    try {
      const res = await fetch(`/api/ai/chat/sessions/${sessionId}`, { cache: "no-store" })
      if (!res.ok) {
        throw new Error("会話の読み込みに失敗しました。")
      }

      const data = (await res.json()) as { session: SessionDetail }
      setActiveSession(data.session)
    } catch (error) {
      const text = error instanceof Error ? error.message : "会話の読み込みに失敗しました。"
      setMessage({ type: "error", text })
      setActiveSession(null)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const handleCreateSession = async () => {
    setMessage(null)

    try {
      const res = await fetch("/api/ai/chat/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        throw new Error("新規会話の作成に失敗しました。")
      }

      const data = (await res.json()) as { session: { id: string } }
      setActiveSessionId(data.session.id)
      await loadSessions()
      await loadSessionDetail(data.session.id)
    } catch (error) {
      const text = error instanceof Error ? error.message : "新規会話の作成に失敗しました。"
      setMessage({ type: "error", text })
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    const ok = window.confirm("この会話を削除しますか？")

    if (!ok) {
      return
    }

    setMessage(null)

    try {
      const res = await fetch(`/api/ai/chat/sessions/${sessionId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("会話の削除に失敗しました。")
      }

      setMessage({ type: "success", text: "会話を削除しました。" })

      if (activeSessionId === sessionId) {
        setActiveSessionId(null)
        setActiveSession(null)
      }

      await loadSessions()
    } catch (error) {
      const text = error instanceof Error ? error.message : "会話の削除に失敗しました。"
      setMessage({ type: "error", text })
    }
  }

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = messagesContainerRef.current

    if (!container) {
      return
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    })
  }, [])

  const handleSend = async (event: FormEvent) => {
    event.preventDefault()

    if (!activeSessionId || !draft.trim() || sending) {
      return
    }

    setSending(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/ai/chat/sessions/${activeSessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: draft }),
      })

      const data = (await res.json().catch(() => null)) as
        | {
            error?: string
            usage?: UsageStatus
          }
        | {
            usage: UsageStatus
          }
        | null

      if (!res.ok) {
        const text = data && "error" in data && data.error ? data.error : "送信に失敗しました。"
        setMessage({ type: "error", text })

        if (data && "usage" in data && data.usage) {
          setUsage(data.usage)
        }
        return
      }

      if (data && "usage" in data && data.usage) {
        setUsage(data.usage)
      }

      setDraft("")
      await Promise.all([loadSessionDetail(activeSessionId), loadSessions()])
    } catch {
      setMessage({ type: "error", text: "送信中にエラーが発生しました。" })
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    loadSessions().catch(() => undefined)
  }, [loadSessions])

  useEffect(() => {
    if (!activeSessionId) {
      setActiveSession(null)
      return
    }

    loadSessionDetail(activeSessionId).catch(() => undefined)
  }, [activeSessionId, loadSessionDetail])

  useEffect(() => {
    scrollToBottom("auto")
  }, [activeSession?.messages, activeSessionId, loadingMessages, scrollToBottom])

  const statusCards = (
    <>
      {usage ? (
        <div className="rounded-2xl border border-primary/15 bg-primary/8 px-4 py-2 text-xs text-primary sm:text-sm">
          Gemini利用回数: {usage.requestCount} / {usage.limit}
        </div>
      ) : null}

      {message ? (
        <div
          className={cn(
            "rounded-2xl px-4 py-2 text-xs font-semibold sm:text-sm",
            message.type === "success"
              ? "border border-accent/40 bg-accent/12 text-accent-foreground"
              : "border border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {message.text}
        </div>
      ) : null}
    </>
  )

  const chatSection = (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        isSidebar
          ? "rounded-none"
          : "min-h-[68vh] rounded-3xl border border-border/80 bg-card/95 shadow-themed"
      )}
    >
      <header className="relative overflow-hidden border-b border-border/80 px-4 py-4 sm:px-5">
        <div className="absolute inset-0 bg-linear-to-r from-primary/12 via-primary/4 to-accent/10" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] text-primary/80 uppercase">
              <Sparkles className="h-3 w-3" />
              Gemini style
            </p>
            <h2 className="mt-1 truncate text-base font-bold text-foreground sm:text-lg">{activeSessionTitle}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
              Google系サービスの参照対象は、設定画面で再認証済みのアカウントのみです。
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {activeSessionId ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => handleDeleteSession(activeSessionId)}
                aria-label="現在の会話を削除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}

            {isSidebar && onClose ? (
              <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="チャットを閉じる">
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div
        ref={messagesContainerRef}
        className={cn(
          "flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5",
          isSidebar ? "min-h-0" : "min-h-[52vh]"
        )}
      >
        {!activeSessionId ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/80 p-5 text-sm text-muted-foreground">
            上の「新規」から会話を開始してください。
          </div>
        ) : loadingMessages ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : activeSession?.messages.length ? (
          activeSession.messages.map((item) => {
            const isUser = item.role === "user"
            const metadata = parseMetadata(item.metadataJson)

            return (
              <article
                key={item.id}
                className={cn(
                  "max-w-[90%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                  isUser
                    ? "ml-auto gradient-primary text-primary-foreground"
                    : "mr-auto border border-border/90 bg-background/90 text-foreground"
                )}
              >
                <p
                  className={cn(
                    "mb-1 text-[10px] font-bold tracking-[0.16em] uppercase",
                    isUser ? "text-primary-foreground/80" : "text-primary/75"
                  )}
                >
                  {isUser ? "You" : "Gemini"}
                </p>
                <p className={cn("whitespace-pre-wrap", isUser ? "text-primary-foreground" : "text-foreground")}>
                  {item.content}
                </p>

                {!isUser && metadata?.accountRefs?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {metadata.accountRefs.map((ref) => (
                      <span
                        key={`${item.id}-${ref.accountId}`}
                        className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {ref.email}
                      </span>
                    ))}
                  </div>
                ) : null}

                {!isUser && metadata?.warnings?.length ? (
                  <ul className="mt-2 space-y-1 text-[11px] text-amber-700">
                    {metadata.warnings.map((warning, idx) => (
                      <li key={`${item.id}-warning-${idx}`}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            )
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-background/80 p-5 text-sm text-muted-foreground">
            最初の質問を送信すると、会話がここに表示されます。
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-border/80 bg-card/70 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 rounded-2xl border border-border/90 bg-background/85 p-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Geminiに質問してみましょう"
            disabled={!activeSessionId || sending}
            className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!activeSessionId || sending || !draft.trim()}
            aria-label="送信"
          >
            {sending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/90 border-t-transparent" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </section>
  )

  if (isSidebar) {
    return (
      <div className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-card", className)}>
        <div className="space-y-2 border-b border-border/80 bg-card/95 px-4 py-3">
          {statusCards}

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button size="xs" onClick={handleCreateSession} className="shrink-0">
              <MessageSquarePlus className="h-3.5 w-3.5" />
              新規
            </Button>

            {loadingSessions ? (
              <div className="flex h-7 w-full items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : sessions.length === 0 ? (
              <span className="text-xs text-muted-foreground">会話がありません。</span>
            ) : (
              sessions.map((session) => {
                const isActive = session.id === activeSessionId

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setActiveSessionId(session.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      isActive
                        ? "border-primary/35 bg-primary/12 text-primary"
                        : "border-border bg-background/80 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {session.title || "新しい会話"}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {chatSection}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {statusCards}

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-border/80 bg-card/95 p-4 shadow-themed">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Bot className="h-4 w-4 text-primary" />
              会話一覧
            </p>
            <Button size="xs" onClick={handleCreateSession}>
              <MessageSquarePlus className="h-3.5 w-3.5" />
              新規
            </Button>
          </div>

          {loadingSessions ? (
            <div className="flex h-28 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">会話がありません。</p>
          ) : (
            <ul className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId
                return (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => setActiveSessionId(session.id)}
                      className={cn(
                        "w-full rounded-2xl border px-3 py-2 text-left transition-colors",
                        isActive
                          ? "border-primary/30 bg-primary/10"
                          : "border-border bg-background/70 hover:bg-secondary"
                      )}
                    >
                      <p className="truncate text-sm font-semibold text-foreground">{session.title || "新しい会話"}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {session.messages[0]?.content || "まだメッセージがありません。"}
                      </p>
                    </button>
                    <div className="mt-1 flex justify-end">
                      <Button size="xs" variant="ghost" onClick={() => handleDeleteSession(session.id)}>
                        削除
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {chatSection}
      </div>
    </div>
  )
}
