import { prisma } from "./prisma"

export async function incrementCommunityContribution(userId: string, points: number) {
  try {
    // Find active goal
    const activeGoal = await prisma.communityGoal.findFirst({
      where: { isActive: true },
      select: { id: true, type: true }
    })

    if (!activeGoal || activeGoal.type !== "POINTS") return

    // Update or Create contribution
    await prisma.communityContribution.upsert({
      where: {
        userId_goalId: {
          userId,
          goalId: activeGoal.id
        }
      },
      update: {
        points: {
          increment: points
        }
      },
      create: {
        userId,
        goalId: activeGoal.id,
        points: points
      }
    })
  } catch (error) {
    console.error("Error updating community contribution:", error)
  }
}

export async function updateCommunityStreak(userId: string, type: "LOGIN" | "CHECKIN") {
  try {
    const goalType = type === "LOGIN" ? "LOGIN_STREAK" : "CHECKIN_STREAK"
    
    // Find active goal of the correct type
    const activeGoal = await prisma.communityGoal.findFirst({
      where: { isActive: true, type: goalType },
      select: { id: true, createdAt: true }
    })

    if (!activeGoal) return

    // JST Date calculation
    const now = new Date()
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

    await prisma.communityContribution.upsert({
      where: {
        userId_goalId: {
          userId,
          goalId: activeGoal.id
        }
      },
      update: type === "LOGIN" ? {
        loginStreak: newStreak,
        lastLoginDate: now
      } : {
        checkinStreak: newStreak,
        lastCheckinDate: now
      },
      create: type === "LOGIN" ? {
        userId,
        goalId: activeGoal.id,
        loginStreak: newStreak,
        lastLoginDate: now
      } : {
        userId,
        goalId: activeGoal.id,
        checkinStreak: newStreak,
        lastCheckinDate: now
      }
    })
  } catch (error) {
    console.error(`Error updating community ${type} streak:`, error)
  }
}
