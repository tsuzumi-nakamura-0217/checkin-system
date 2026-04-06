import { prisma } from "./prisma"
import { isCommunityJoinedContribution } from "./community-participation"

const JST_OFFSET = 9 * 60 * 60 * 1000

export async function incrementCommunityContribution(userId: string, points: number) {
  try {
    const now = new Date()
    // Find active goal
    const activeGoal = await prisma.communityGoal.findFirst({
      where: {
        isActive: true,
        deadline: { gte: now },
      },
      select: { id: true, type: true }
    })

    if (!activeGoal || activeGoal.type !== "POINTS") return

    const contribution = await prisma.communityContribution.findUnique({
      where: {
        userId_goalId: {
          userId,
          goalId: activeGoal.id,
        },
      },
      select: {
        lastLoginDate: true,
        lastCheckinDate: true,
      },
    })

    // 参加者のみ加点対象
    if (!isCommunityJoinedContribution(contribution)) return

    await prisma.communityContribution.update({
      where: {
        userId_goalId: {
          userId,
          goalId: activeGoal.id,
        },
      },
      data: {
        points: {
          increment: points,
        },
      },
    })
  } catch (error) {
    console.error("Error updating community contribution:", error)
  }
}

export async function updateCommunityStreak(userId: string, type: "LOGIN" | "CHECKIN") {
  try {
    const goalType = type === "LOGIN" ? "LOGIN_STREAK" : "CHECKIN_STREAK"
    const now = new Date()
    
    // Find active goal of the correct type
    const activeGoal = await prisma.communityGoal.findFirst({
      where: {
        isActive: true,
        type: goalType,
        deadline: { gte: now },
      },
      select: { id: true, createdAt: true }
    })

    if (!activeGoal) return

    // JST Date calculation
    const jstOffset = 9 * 60 * 60 * 1000
    const todayJST = new Date(now.getTime() + jstOffset)
    todayJST.setUTCHours(0, 0, 0, 0)
    
    const yesterdayJST = new Date(todayJST.getTime() - 24 * 60 * 60 * 1000)

    const contribution = await prisma.communityContribution.findUnique({
      where: {
        userId_goalId: {
          userId,
          goalId: activeGoal.id
        }
      }
    })

    const lastDate = type === "LOGIN" ? contribution?.lastLoginDate : contribution?.lastCheckinDate
    const currentStreak = type === "LOGIN" ? (contribution?.loginStreak || 0) : (contribution?.checkinStreak || 0)

    let newStreak = 1
    
    if (lastDate) {
      const lastDateJST = new Date(lastDate.getTime() + jstOffset)
      lastDateJST.setUTCHours(0, 0, 0, 0)

      if (lastDateJST.getTime() === todayJST.getTime()) {
        // Already processed today
        return
      }

      if (lastDateJST.getTime() === yesterdayJST.getTime()) {
        // Continuous streak
        newStreak = currentStreak + 1
      } else {
        // Streak broken
        newStreak = 1
      }
    }

    // 参加者のみ更新対象
    if (!isCommunityJoinedContribution(contribution)) return

    await prisma.communityContribution.update({
      where: {
        userId_goalId: {
          userId,
          goalId: activeGoal.id,
        },
      },
      data: type === "LOGIN" ? {
        loginStreak: newStreak,
        lastLoginDate: now,
      } : {
        checkinStreak: newStreak,
        lastCheckinDate: now,
      },
    })
  } catch (error) {
    console.error(`Error updating community ${type} streak:`, error)
  }
}

export async function markCommunityStreakNoCount(
  userId: string,
  type: "LOGIN" | "CHECKIN",
  baseDate: Date = new Date()
) {
  try {
    const goalType = type === "LOGIN" ? "LOGIN_STREAK" : "CHECKIN_STREAK"
    const now = new Date()

    const activeGoal = await prisma.communityGoal.findFirst({
      where: {
        isActive: true,
        type: goalType,
        deadline: { gte: now },
      },
      select: { id: true },
    })

    if (!activeGoal) return

    const todayJST = new Date(baseDate.getTime() + JST_OFFSET)
    todayJST.setUTCHours(0, 0, 0, 0)

    const contribution = await prisma.communityContribution.findUnique({
      where: {
        userId_goalId: {
          userId,
          goalId: activeGoal.id,
        },
      },
    })

    const lastDate = type === "LOGIN" ? contribution?.lastLoginDate : contribution?.lastCheckinDate
    if (lastDate) {
      const lastDateJST = new Date(lastDate.getTime() + JST_OFFSET)
      lastDateJST.setUTCHours(0, 0, 0, 0)

      if (lastDateJST.getTime() === todayJST.getTime()) {
        return
      }
    }

    // 参加者のみ更新対象
    if (!isCommunityJoinedContribution(contribution)) return

    await prisma.communityContribution.update({
      where: {
        userId_goalId: {
          userId,
          goalId: activeGoal.id,
        },
      },
      data: type === "LOGIN" ? {
        lastLoginDate: baseDate,
      } : {
        lastCheckinDate: baseDate,
      },
    })
  } catch (error) {
    console.error(`Error marking community ${type} streak as no-count:`, error)
  }
}
