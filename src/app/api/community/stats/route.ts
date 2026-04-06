import { NextResponse } from "next/server"
import {
  buildCommunityParticipantWhere,
  isCommunityJoinedContribution,
} from "@/lib/community-participation"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

export async function GET() {
  try {
    const user = await getCurrentUser()
    const now = new Date()

    // Get active goal first
    const activeGoal = await prisma.communityGoal.findFirst({
      where: {
        isActive: true,
        deadline: { gte: now },
      },
    })

    if (!activeGoal) {
      return NextResponse.json({ 
        totalPoints: 0, 
        leaderboard: [],
        type: "POINTS",
        participantCount: 0,
        isJoined: false,
      })
    }

    // Determine target field based on goal type
    const targetField = 
      activeGoal.type === "LOGIN_STREAK" ? "loginStreak" :
      activeGoal.type === "CHECKIN_STREAK" ? "checkinStreak" : 
      "points"

    // Aggregate total
    const participantWhere = buildCommunityParticipantWhere(activeGoal.id)

    const [totalAggregation, participantCount, currentUserContribution] = await Promise.all([
      prisma.communityContribution.aggregate({
        where: participantWhere,
        _sum: { [targetField]: true },
      }),
      prisma.communityContribution.count({
        where: participantWhere,
      }),
      user?.id
        ? prisma.communityContribution.findUnique({
            where: {
              userId_goalId: {
                userId: user.id,
                goalId: activeGoal.id,
              },
            },
            select: {
              lastLoginDate: true,
              lastCheckinDate: true,
            },
          })
        : Promise.resolve(null),
    ])

    const totalValue = totalAggregation._sum[targetField] || 0

    // Get leaderboard
    const contributions = await prisma.communityContribution.findMany({
      where: { 
        ...participantWhere,
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
      id: c.userId,
      name: c.user.name || "Anonymous",
      image: c.user.image,
      points: (c as any)[targetField] || 0,
    }))

    return NextResponse.json({
      totalPoints: totalValue,
      leaderboard,
      type: activeGoal.type,
      participantCount,
      isJoined: isCommunityJoinedContribution(currentUserContribution),
    })
  } catch (error) {
    console.error("Error fetching community stats:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
