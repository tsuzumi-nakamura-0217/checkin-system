import { NextRequest, NextResponse } from "next/server"
import { buildCommunityParticipantWhere } from "@/lib/community-participation"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ goalId: string }> }
) {
  try {
    const params = await context.params
    const goalId = params.goalId

    const goalBase = await prisma.communityGoal.findUnique({
      where: { id: goalId },
      select: { id: true, type: true },
    })

    if (!goalBase) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const targetField =
      goalBase.type === "LOGIN_STREAK" ? "loginStreak" :
      goalBase.type === "CHECKIN_STREAK" ? "checkinStreak" :
      "points"

    const goal = await prisma.communityGoal.findUnique({
      where: { id: goalId },
      include: {
        contributions: {
          where: {
            ...buildCommunityParticipantWhere(goalId),
            [targetField]: { gt: 0 },
          },
          orderBy: { [targetField]: "desc" },
          select: {
            points: true,
            loginStreak: true,
            checkinStreak: true,
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

    // Calculate total value for this specific goal
    const totalPointsResult = await prisma.communityContribution.aggregate({
      where: buildCommunityParticipantWhere(goalId),
      _sum: { [targetField]: true }
    })
    const totalPoints = totalPointsResult._sum[targetField] || 0

    const formattedLeaderboard = goal.contributions.map(item => ({
      ...item.user,
      points: (item as any)[targetField] || 0
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
