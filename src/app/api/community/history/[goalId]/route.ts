import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ goalId: string }> }
) {
  try {
    const params = await context.params
    const goalId = params.goalId

    const goal = await prisma.communityGoal.findUnique({
      where: { id: goalId },
      include: {
        contributions: {
          where: { points: { gt: 0 } },
          orderBy: { points: "desc" },
          select: {
            points: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          take: 20
        },
        _count: {
          select: { comments: true }
        }
      }
    })

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    // Calculate total points for this specific goal
    const totalPointsResult = await prisma.communityContribution.aggregate({
      where: { goalId },
      _sum: { points: true }
    })
    const totalPoints = totalPointsResult._sum.points || 0

    const formattedLeaderboard = goal.contributions.map(item => ({
      ...item.user,
      points: item.points
    }))

    return NextResponse.json({
      goal,
      totalPoints,
      leaderboard: formattedLeaderboard
    })
  } catch (error) {
    console.error("Error fetching goal detail:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
