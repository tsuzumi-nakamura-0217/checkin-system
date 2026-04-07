"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string | null
    image: string | null
  } | null
  readCount: number
  isReadByMe: boolean
}

interface ChatSectionProps {
  goalId?: string
  readOnly?: boolean
}

export function ChatSection({ goalId, readOnly = false }: ChatSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchComments = async () => {
    try {
      const url = goalId
        ? `/api/community/comments?goalId=${goalId}`
        : "/api/community/comments"
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
        
        // Also get current user ID if not set
        if (!currentUserId && data.length > 0) {
          // This is a shortcut: we'll find a message marked as isReadByMe
          // and use its user ID if it matches the current user logic in API.
          // Better approach: fetch /api/auth/session if needed, but let's see.
        }

        // Mark unread messages as read
        const unreadIds = data
          .filter((c: Comment) => !c.isReadByMe && c.user?.id !== currentUserId)
          .map((c: Comment) => c.id)

        if (unreadIds.length > 0 && !readOnly) {
          markAsRead(unreadIds)
        }
      }
    } catch (error) {
      console.error("Failed to fetch comments", error)
    } finally {
      setIsFetching(false)
    }
  }

  const markAsRead = async (commentIds: string[]) => {
    try {
      await fetch("/api/community/comments/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentIds }),
      })
    } catch (error) {
      console.error("Failed to mark as read", error)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/session")
      const session = await res.json()
      if (session?.user?.id) {
        setCurrentUserId(session.user.id)
      }
    } catch (error) {
      console.error("Failed to fetch session", error)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    fetchComments()
    
    // Only poll for live chat
    if (!readOnly) {
      const interval = setInterval(fetchComments, 10000)
      return () => clearInterval(interval)
    }
  }, [goalId, currentUserId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isLoading) return

    setIsLoading(true)
    try {
      const res = await fetch("/api/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment, goalId }),
      })

      if (res.ok) {
        const comment = await res.json()
        setComments((prev) => [comment, ...prev])
        setNewComment("")
        toast.success("コメントを投稿しました")
      } else {
        toast.error("投稿に失敗しました")
      }
    } catch (error) {
      toast.error("エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="flex flex-col border-none bg-card shadow-themed h-[500px]">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-bold tracking-tight text-foreground">
          Community Chat
        </CardTitle>
        <div className="flex items-center gap-2">
          {isFetching && <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            {isFetching ? "Syncing..." : "Live"}
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto px-4 py-0 space-y-4 scroll-smooth" ref={scrollRef}>
        <div className="flex flex-col-reverse gap-4 pb-4">
          {comments.map((comment) => {
            const isMine = comment.user?.id === currentUserId
            const showReadCount = isMine && comment.readCount > 0

            return (
              <div key={comment.id} className={cn("flex items-start gap-3 group", isMine && "flex-row-reverse")}>
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-primary/10">
                  {comment.user?.image ? (
                    <Image src={comment.user.image} alt="User" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className={cn("min-w-0 flex-1", isMine && "flex flex-col items-end")}>
                  <div className={cn("flex items-baseline gap-2", isMine && "flex-row-reverse")}>
                    <p className="text-sm font-bold text-foreground truncate">{comment.user?.name || "Anonymous"}</p>
                    <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest shrink-0">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ja })}
                    </p>
                  </div>
                  <div className="flex items-end gap-2 mt-1">
                    {showReadCount && (
                      <p className="text-[10px] font-bold text-primary/60 mb-1">既読 {comment.readCount}</p>
                    )}
                    <div className={cn(
                      "inline-block rounded-2xl px-3.5 py-2 shadow-sm transition-all group-hover:shadow-md",
                      isMine 
                        ? "rounded-tr-none bg-primary text-primary-foreground" 
                        : "rounded-tl-none bg-secondary/70 group-hover:bg-secondary text-foreground",
                      !isMine && !comment.isReadByMe && "border-l-2 border-primary bg-primary/5"
                    )}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {comments.length === 0 && !isFetching && (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center opacity-40">
              <div className="mb-3 rounded-2xl bg-primary/10 p-4 text-primary">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <p className="text-sm font-bold tracking-tight">最初のメッセージを投稿しよう！</p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-4 border-t border-border bg-card/50">
        {readOnly ? (
          <p className="w-full text-center text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-2">
            この目標は終了しました。チャットは閲覧のみ可能です。
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
            <Input
              placeholder="メッセージを入力..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isLoading}
              className="flex-1 rounded-xl border-border bg-background shadow-sm focus-visible:ring-primary/20"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !newComment.trim()} 
              className="rounded-xl gradient-primary shadow-themed-primary transition-all hover:scale-105 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  )
}
