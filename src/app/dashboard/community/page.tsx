"use client"

import { useState, useEffect } from "react"
import { GoalProgress } from "@/components/community/goal-progress"
import { Leaderboard } from "@/components/community/leaderboard"
import { ChatSection } from "@/components/community/chat-section"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<"current" | "history">("current")
  const [goal, setGoal] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [participation, setParticipation] = useState<{ hasActiveGoal: boolean; isJoined: boolean }>({
    hasActiveGoal: false,
    isJoined: false,
  })
  const [history, setHistory] = useState<any[]>([])
  const [selectedHistoryGoal, setSelectedHistoryGoal] = useState<any>(null)
  const [historyDetail, setHistoryDetail] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isParticipationSubmitting, setIsParticipationSubmitting] = useState(false)

  // Goal Form State
  const [title, setTitle] = useState("")
  const [statusType, setStatusType] = useState<"POINTS" | "LOGIN_STREAK" | "CHECKIN_STREAK">("POINTS")
  const [targetPoints, setTargetPoints] = useState("")
  const [deadline, setDeadline] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const fetchData = async () => {
    try {
      const [goalRes, statsRes, participationRes] = await Promise.all([
        fetch("/api/community/goal"),
        fetch("/api/community/stats"),
        fetch("/api/community/participation"),
      ])
      
      if (goalRes.ok) setGoal(await goalRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
      if (participationRes.ok) {
        const participationData = await participationRes.json()
        setParticipation({
          hasActiveGoal: Boolean(participationData.hasActiveGoal),
          isJoined: Boolean(participationData.isJoined),
        })
      }
    } catch (error) {
      console.error("Failed to fetch community data", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleParticipation = async () => {
    if (!goal) return

    setIsParticipationSubmitting(true)
    try {
      const method = participation.isJoined ? "DELETE" : "POST"
      const res = await fetch("/api/community/participation", { method })

      if (!res.ok) {
        toast.error("参加状態の更新に失敗しました")
        return
      }

      toast.success(participation.isJoined ? "ミッションから離脱しました" : "ミッションに参加しました")
      await fetchData()
    } catch (error) {
      toast.error("参加状態の更新中にエラーが発生しました")
    } finally {
      setIsParticipationSubmitting(false)
    }
  }

  // Trigger login streak update on dashboard visit
  const triggerLoginStreak = async () => {
    try {
      await fetch("/api/community/streak", { method: "POST" })
    } catch (e) {
      console.error("Failed to trigger login streak", e)
    }
  }

  useEffect(() => {
    fetchData()
    triggerLoginStreak()
  }, [])

  const fetchHistory = async () => {
    setIsHistoryLoading(true)
    try {
      const res = await fetch("/api/community/history")
      if (res.ok) setHistory(await res.json())
    } catch (error) {
      console.error("Failed to fetch history", error)
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const fetchHistoryDetail = async (goalId: string) => {
    try {
      const res = await fetch(`/api/community/history/${goalId}`)
      if (res.ok) setHistoryDetail(await res.json())
    } catch (error) {
      console.error("Failed to fetch history detail", error)
    }
  }

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory()
    }
  }, [activeTab])

  useEffect(() => {
    if (selectedHistoryGoal) {
      fetchHistoryDetail(selectedHistoryGoal.id)
    } else {
      setHistoryDetail(null)
    }
  }, [selectedHistoryGoal])

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/community/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          targetPoints, 
          deadline,
          type: statusType
        })
      })

      if (res.ok) {
        toast.success("ミッションを設定しました")
        setIsDialogOpen(false)
        setTitle("")
        setTargetPoints("")
        setDeadline("")
        fetchData()
      } else {
        toast.error("ミッションの設定に失敗しました")
      }
    } catch (error) {
      toast.error("エラーが発生しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">コミュニティ</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            参加メンバーで協力してミッション達成を目指しましょう
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-secondary/50 rounded-xl mr-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setActiveTab("current")
                setSelectedHistoryGoal(null)
              }}
              className={cn(
                "rounded-lg px-4 font-bold text-xs transition-all",
                activeTab === "current" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              現在
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveTab("history")}
              className={cn(
                "rounded-lg px-4 font-bold text-xs transition-all",
                activeTab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              履歴
            </Button>
          </div>

          {activeTab === "current" && goal ? (
            <Button
              variant={participation.isJoined ? "outline" : "default"}
              disabled={isParticipationSubmitting}
              onClick={handleParticipation}
              className={cn(
                "rounded-xl px-4 font-bold text-xs",
                participation.isJoined ? "border-border" : "gradient-primary shadow-themed-primary"
              )}
            >
              {isParticipationSubmitting
                ? "更新中..."
                : participation.isJoined
                  ? "参加をやめる"
                  : "ミッションに参加する"}
            </Button>
          ) : null}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button className="rounded-xl gradient-primary shadow-themed-primary transition-all hover:scale-105 active:scale-95" />}>
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              ミッションを設定する
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tight">新しいミッションを設定</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateGoal} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">ミッション名</Label>
                  <Input 
                    id="title" 
                    placeholder="例: みんなで打ち上げに行こう！" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    required 
                    className="rounded-xl bg-secondary/50 border-none h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">ミッションタイプ</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { id: "POINTS", label: "ポイント", icon: "✨" },
                      { id: "LOGIN_STREAK", label: "ログイン", icon: "🔑" },
                      { id: "CHECKIN_STREAK", label: "チェックイン", icon: "📍" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setStatusType(t.id as any)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1",
                          statusType === t.id 
                            ? "border-primary bg-primary/5 text-primary" 
                            : "border-secondary bg-secondary/30 text-muted-foreground hover:border-secondary-foreground/20"
                        )}
                      >
                        <span className="text-xl">{t.icon}</span>
                        <span className="text-[10px] font-bold">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    目標値 ({statusType === "POINTS" ? "pts" : "日"})
                  </Label>
                  <Input 
                    id="points" 
                    type="number" 
                    placeholder={statusType === "POINTS" ? "2500" : "50"} 
                    value={targetPoints} 
                    onChange={(e) => setTargetPoints(e.target.value)} 
                    required 
                    className="rounded-xl bg-secondary/50 border-none h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">期限</Label>
                  <Input 
                    id="deadline" 
                    type="date" 
                    value={deadline} 
                    onChange={(e) => setDeadline(e.target.value)} 
                    required 
                    className="rounded-xl bg-secondary/50 border-none h-11"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl gradient-primary font-bold shadow-themed-primary transition-all hover:scale-[1.02] active:scale-[0.98]">
                    {isSubmitting ? "設定中..." : "ミッションを公開する"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {activeTab === "current" ? (
        <>
          {goal ? (
            <>
              <GoalProgress 
                title={goal.title}
                currentPoints={stats?.totalPoints || 0}
                targetPoints={goal.targetPoints}
                deadline={goal.deadline}
                type={stats?.type}
              />
              <p className="-mt-4 text-xs font-medium text-muted-foreground">
                参加者: {stats?.participantCount ?? 0} 人
                {!participation.isJoined ? " ・ 参加するとあなたの実績が集計に反映されます" : " ・ あなたは参加中です"}
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-3xl bg-secondary/10 opacity-60">
              <div className="mb-4 rounded-2xl bg-primary/10 p-5 text-primary">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold tracking-tight">アクティブなミッションがありません</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-[300px]">
                「ミッションを設定する」ボタンから最初のプロジェクトを始めましょう。
              </p>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            <Leaderboard data={stats?.leaderboard || []} />
            <ChatSection goalId={goal?.id} readOnly={!goal} />
          </div>
        </>
      ) : (
        <div className="space-y-8">
          {selectedHistoryGoal ? (
            <>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedHistoryGoal(null)}
                  className="rounded-xl border-border px-3"
                >
                  ← 履歴一覧へ戻る
                </Button>
                <h2 className="text-xl font-black">{selectedHistoryGoal.title}</h2>
              </div>
              
              <GoalProgress 
                title={selectedHistoryGoal.title}
                currentPoints={historyDetail?.totalPoints || 0}
                targetPoints={selectedHistoryGoal.targetPoints}
                deadline={selectedHistoryGoal.deadline}
                isHistorical={true}
                type={selectedHistoryGoal.type}
              />
              
              <div className="grid gap-8 lg:grid-cols-2">
                <Leaderboard data={historyDetail?.leaderboard || []} />
                <ChatSection goalId={selectedHistoryGoal.id} readOnly />
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {isHistoryLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 w-full animate-pulse rounded-3xl bg-secondary/30" />
                ))
              ) : history.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-3xl bg-secondary/10 opacity-60">
                   <p className="text-sm font-medium text-muted-foreground">過去のミッション履歴はありません。</p>
                </div>
              ) : (
                history.map((h) => (
                  <div 
                    key={h.id} 
                    onClick={() => setSelectedHistoryGoal(h)}
                    className="group relative cursor-pointer overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        {new Date(h.completedAt).toLocaleDateString()}
                      </span>
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30 group-hover:bg-primary transition-colors" />
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-foreground line-clamp-1 mb-1">{h.title}</h3>
                    <p className="text-xs font-bold text-muted-foreground mb-4">
                      {h.targetPoints.toLocaleString()} pts ミッション
                    </p>
                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      詳細を見る →
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
