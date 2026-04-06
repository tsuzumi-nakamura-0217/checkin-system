import Link from "next/link"
import { prisma } from "@/lib/prisma"

export async function CommunitySummaryCard() {
  const goal = await prisma.communityGoal.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  })

  if (!goal) return null

  const totalPointsResult = await prisma.user.aggregate({
    _sum: { points: true },
  })
  const currentPoints = totalPointsResult._sum.points || 0
  const percentage = Math.min(Math.round((currentPoints / goal.targetPoints) * 100), 100)

  return (
    <Link href="/dashboard/community" className="block group">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-themed hover:border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-foreground">{goal.title}</p>
          </div>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full">
            {percentage}% 達成
          </p>
        </div>
        
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div 
            className="h-full rounded-full gradient-primary transition-all duration-1000" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Community Goal</p>
          <p className="text-[10px] font-bold text-foreground">
            {currentPoints.toLocaleString()} / {goal.targetPoints.toLocaleString()} pt
          </p>
        </div>
      </section>
    </Link>
  )
}
