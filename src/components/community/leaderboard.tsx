"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface UserContribution {
  id: string
  name: string | null
  image: string | null
  points: number
}

interface LeaderboardProps {
  data?: UserContribution[]
}

export function Leaderboard({ data: initialData }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<UserContribution[]>(initialData || [])
  const [isLoading, setIsLoading] = useState(!initialData)

  useEffect(() => {
    if (initialData) {
      setLeaderboard(initialData)
      setIsLoading(false)
      return
    }

    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/community/stats")
        if (res.ok) {
          const data = await res.json()
          setLeaderboard(data.leaderboard)
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
  }, [initialData])

  return (
    <Card className="border-none bg-card shadow-themed">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-bold tracking-tight text-foreground">
          Top Contributors
        </CardTitle>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
          </svg>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
             <p className="py-4 text-center text-sm font-medium text-muted-foreground animate-pulse">
               読み込み中...
             </p>
          ) : leaderboard.length === 0 ? (
            <p className="py-4 text-center text-sm font-medium text-muted-foreground">
              まだ貢献者がいません。
            </p>
          ) : (
            leaderboard.map((user, index) => (
              <div key={user.id} className="group flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black shadow-sm transition-transform group-hover:scale-110",
                    index === 0 ? "gradient-primary text-white" : 
                    index === 1 ? "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300" :
                    index === 2 ? "bg-amber-600/20 text-amber-600 dark:text-amber-500" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-9 w-9 overflow-hidden rounded-xl border-2 border-primary/10 transition-shadow group-hover:shadow-md">
                      {user.image ? (
                        <Image src={user.image} alt={user.name || "User"} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-tight text-foreground">{user.name || "Anonymous"}</p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none mt-0.5">Contributor</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black tracking-[0.1em] text-primary transition-shadow group-hover:drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]">
                    {user.points.toLocaleString()}
                    <span className="ml-1 font-bold text-muted-foreground/60 uppercase">pts</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
