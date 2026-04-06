import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Get active goal first
    const activeGoal = await prisma.communityGoal.findFirst({
      where: { isActive: true },
    })

    if (!activeGoal) {
      return NextResponse.json({ 
        totalPoints: 0, 
        leaderboard: [],
        type: "POINTS" 
      })
    }

    // Determine target field based on goal type
    const targetField = 
      activeGoal.type === "LOGIN_STREAK" ? "loginStreak" :
      activeGoal.type === "CHECKIN_STREAK" ? "checkinStreak" : 
      "points"

    // Aggregate total
    const totalAggregation = await prisma.communityContribution.aggregate({
      where: { goalId: activeGoal.id },
      _sum: { [targetField]: true }
    })

    const totalValue = totalAggregation._sum[targetField] || 0

    // Get leaderboard
    const contributions = await prisma.communityContribution.findMany({
      where: { 
        goalId: activeGoal.id,
        [targetField]: { gt: 0 }
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: { [targetField]: "desc" },
      take: 10,
    })

    const leaderboard = contributions.map((c) => ({
      name: c.user.name || "Anonymous",
      image: c.user.image,
      points: (c as any)[targetField] || 0,
    }))

    return NextResponse.json({
      totalPoints: totalValue,
      leaderboard,
      type: activeGoal.type
    })
  } catch (error) {
    console.error("Error fetching community stats:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
