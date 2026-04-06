import { prisma } from "./prisma"

const JST_OFFSET = 9 * 60 * 60 * 1000

export async function markUserCheckInNoCount(userId: string, baseDate: Date = new Date()) {
  try {
    let user: any
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          lastCheckInDate: true,
        },
      })
    } catch (e) {
      console.warn("Skipping no-count check-in marker due to missing columns in DB.")
      return
    }

    if (!user) return

    const todayJST = new Date(baseDate.getTime() + JST_OFFSET)
    todayJST.setUTCHours(0, 0, 0, 0)

    if (user.lastCheckInDate) {
      const lastCheckInJST = new Date(user.lastCheckInDate.getTime() + JST_OFFSET)
      lastCheckInJST.setUTCHours(0, 0, 0, 0)

      if (lastCheckInJST.getTime() === todayJST.getTime()) {
        return
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastCheckInDate: baseDate,
      } as any,
    })
  } catch (error) {
    console.error("Error marking no-count check-in day:", error)
  }
}

export async function updateUserLoginStreak(userId: string) {
  try {
    let user: any;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          loginStreak: true,
          maxLoginStreak: true,
          lastLoginDate: true,
        },
      })
    } catch (e) {
      // If columns are missing, skip streak update for now
      console.warn("Skipping personal login streak update due to missing columns in DB.")
      return
    }

    if (!user) return

    const now = new Date()
    const todayJST = new Date(now.getTime() + JST_OFFSET)
    todayJST.setUTCHours(0, 0, 0, 0)

    if (user.lastLoginDate) {
      const lastLoginJST = new Date(user.lastLoginDate.getTime() + JST_OFFSET)
      lastLoginJST.setUTCHours(0, 0, 0, 0)

      if (lastLoginJST.getTime() === todayJST.getTime()) {
        // Already logged in today
        return
      }

      const yesterdayJST = new Date(todayJST.getTime() - 24 * 60 * 60 * 1000)
      let newStreak = 1

      if (lastLoginJST.getTime() === yesterdayJST.getTime()) {
        newStreak = user.loginStreak + 1
      } else {
        newStreak = 1
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          loginStreak: newStreak,
          lastLoginDate: now,
          maxLoginStreak: Math.max(user.maxLoginStreak, newStreak),
        } as any,
      })
    } else {
      // First login
      await prisma.user.update({
        where: { id: userId },
        data: {
          loginStreak: 1,
          lastLoginDate: now,
          maxLoginStreak: 1,
        } as any,
      })
    }
  } catch (error) {
    console.error("Error updating user login streak:", error)
  }
}

export async function updateUserCheckInStreak(userId: string, status: string) {
  try {
    if (status !== "EARLY" && status !== "ON_TIME") {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            checkInStreak: 0,
          } as any,
        })
      } catch (e) {
        // Skip if column missing
      }
      return
    }

    let user: any;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          checkInStreak: true,
          maxCheckInStreak: true,
          lastCheckInDate: true,
          checkInMon: true,
          checkInTue: true,
          checkInWed: true,
          checkInThu: true,
          checkInFri: true,
          checkInSat: true,
          checkInSun: true,
        },
      })
    } catch (e) {
      console.warn("Skipping personal check-in streak update due to missing columns in DB.")
      return
    }

    if (!user) return

    const now = new Date()
    const todayJST = new Date(now.getTime() + JST_OFFSET)
    todayJST.setUTCHours(0, 0, 0, 0)

    if (user.lastCheckInDate) {
      const lastCheckInJST = new Date(user.lastCheckInDate.getTime() + JST_OFFSET)
      lastCheckInJST.setUTCHours(0, 0, 0, 0)

      if (lastCheckInJST.getTime() === todayJST.getTime()) {
        // Already checked in today
        return
      }

      // Find the previous required check-in day
      let previousRequiredDayJST = new Date(todayJST.getTime() - 24 * 60 * 60 * 1000)
      for (let i = 0; i < 14; i++) {
        const dayOfWeek = previousRequiredDayJST.getUTCDay()
        const isRequired = 
          (dayOfWeek === 1 && user.checkInMon) ||
          (dayOfWeek === 2 && user.checkInTue) ||
          (dayOfWeek === 3 && user.checkInWed) ||
          (dayOfWeek === 4 && user.checkInThu) ||
          (dayOfWeek === 5 && user.checkInFri) ||
          (dayOfWeek === 6 && user.checkInSat) ||
          (dayOfWeek === 0 && user.checkInSun)
        
        if (isRequired) break
        previousRequiredDayJST = new Date(previousRequiredDayJST.getTime() - 24 * 60 * 60 * 1000)
      }

      let newStreak = 1
      if (lastCheckInJST.getTime() === previousRequiredDayJST.getTime()) {
        newStreak = user.checkInStreak + 1
      } else {
        newStreak = 1
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          checkInStreak: newStreak,
          lastCheckInDate: now,
          maxCheckInStreak: Math.max(user.maxCheckInStreak, newStreak),
        } as any,
      })
    } else {
      // First valid check-in (EARLY or ON_TIME)
      await prisma.user.update({
        where: { id: userId },
        data: {
          checkInStreak: 1,
          lastCheckInDate: now,
          maxCheckInStreak: 1,
        } as any,
      })
    }
  } catch (error) {
    console.error("Error updating user check-in streak:", error)
  }
}
