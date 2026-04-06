"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface GoalProgressProps {
  title: string
  currentPoints: number
  targetPoints: number
  deadline: string
  isHistorical?: boolean
  type?: "POINTS" | "LOGIN_STREAK" | "CHECKIN_STREAK"
}

export function GoalProgress({ title, currentPoints, targetPoints, deadline, isHistorical, type = "POINTS" }: GoalProgressProps) {
  const percentage = Math.min(Math.round((currentPoints / targetPoints) * 100), 100)
  const remainingPoints = Math.max(targetPoints - currentPoints, 0)
  
  const unit = type === "POINTS" ? "pts" : "日"
  const unitName = type === "POINTS" ? "ポイント" : "日分"
  
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  const isExpired = daysLeft <= 0 || isHistorical

  return (
    <Card className="overflow-hidden border-none bg-card shadow-themed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold tracking-tight text-foreground">
            {title}
          </CardTitle>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary uppercase tracking-wider">
            Community Goal
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-black tracking-tighter text-foreground">
                {currentPoints.toLocaleString()}
                <span className="ml-1 text-sm font-medium text-muted-foreground">/ {targetPoints.toLocaleString()} {unit}</span>
              </p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {isExpired ? (
                  percentage >= 100 ? (
                    <span className="font-bold text-green-500">目標達成しました！おめでとうございます！</span>
                  ) : (
                    <span className="font-bold text-muted-foreground">目標未達成で終了しました。</span>
                  )
                ) : (
                  <>あと <span className="font-bold text-foreground">{remainingPoints.toLocaleString()} {unit}</span> で目標達成！</>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">{isExpired ? "ステータス" : "期限まで"}</p>
              <p className={cn(
                "text-lg font-bold",
                isExpired ? (percentage >= 100 ? "text-green-500" : "text-muted-foreground") : "text-foreground"
              )}>
                {isExpired ? (percentage >= 100 ? "SUCCESS" : "CLOSED") : (daysLeft > 0 ? `残り ${daysLeft} 日` : "期間終了")}
              </p>
            </div>
          </div>

          <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary/50">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                isExpired && percentage < 100 ? "bg-muted-foreground/30" : "gradient-primary"
              )}
              style={{ width: `${percentage}%` }}
            />
            {percentage > 0 && (
              <div 
                className="absolute top-0 h-full w-1 bg-white/20 blur-[1px]" 
                style={{ left: `${percentage}%` }}
              />
            )}
          </div>
          
          <div className="flex justify-between text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <span>0%</span>
            <span>{isExpired ? "最終結果: " : ""}{percentage}% 達成</span>
            <span>100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
