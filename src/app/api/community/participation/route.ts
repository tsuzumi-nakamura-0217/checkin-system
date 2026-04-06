import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import {
  COMMUNITY_JOIN_MARKER_DATE,
  isCommunityJoinedContribution,
} from "@/lib/community-participation"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const activeGoal = await prisma.communityGoal.findFirst({
      where: {
        isActive: true,
        deadline: { gte: now },
      },
      select: { id: true, type: true, title: true },
    })

    if (!activeGoal) {
      return NextResponse.json({ hasActiveGoal: false, isJoined: false, goalId: null })
    }

    const contribution = await prisma.communityContribution.findUnique({
      where: {
        userId_goalId: {
          userId: user.id,
          goalId: activeGoal.id,
        },
      },
      select: {
        updatedAt: true,
        lastLoginDate: true,
        lastCheckinDate: true,
      },
    })

    return NextResponse.json({
      hasActiveGoal: true,
      isJoined: isCommunityJoinedContribution(contribution),
      goalId: activeGoal.id,
      goalType: activeGoal.type,
      goalTitle: activeGoal.title,
      joinedAt: contribution?.updatedAt ?? null,
    })
  } catch (error) {
    console.error("Error fetching participation status:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const activeGoal = await prisma.communityGoal.findFirst({
      where: {
        isActive: true,
        deadline: { gte: now },
      },
      select: { id: true, type: true },
    })

    if (!activeGoal) {
      return NextResponse.json({ error: "Active mission not found" }, { status: 404 })
    }

    const existingContribution = await prisma.communityContribution.findUnique({
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

    const alreadyJoined = isCommunityJoinedContribution(existingContribution)

    const joined = alreadyJoined
      ? await prisma.communityContribution.findUnique({
          where: {
            userId_goalId: {
              userId: user.id,
              goalId: activeGoal.id,
            },
          },
          select: { userId: true, goalId: true },
        })
      : await prisma.communityContribution.upsert({
          where: {
            userId_goalId: {
              userId: user.id,
              goalId: activeGoal.id,
            },
          },
          update: {
            points: 0,
            loginStreak: 0,
            checkinStreak: 0,
            lastLoginDate: COMMUNITY_JOIN_MARKER_DATE,
            lastCheckinDate: COMMUNITY_JOIN_MARKER_DATE,
          },
          create: {
            userId: user.id,
            goalId: activeGoal.id,
            points: 0,
            loginStreak: 0,
            checkinStreak: 0,
            lastLoginDate: COMMUNITY_JOIN_MARKER_DATE,
            lastCheckinDate: COMMUNITY_JOIN_MARKER_DATE,
          },
          select: { userId: true, goalId: true },
        })

    return NextResponse.json({ success: true, joined, alreadyJoined })
  } catch (error) {
    console.error("Error joining mission:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const activeGoal = await prisma.communityGoal.findFirst({
      where: {
        isActive: true,
        deadline: { gte: now },
      },
      select: { id: true },
    })

    if (!activeGoal) {
      return NextResponse.json({ error: "Active mission not found" }, { status: 404 })
    }

    await prisma.communityContribution.deleteMany({
      where: {
        userId: user.id,
        goalId: activeGoal.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error leaving mission:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
