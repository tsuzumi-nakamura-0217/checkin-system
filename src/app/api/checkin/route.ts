import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import { isWithinLab, getDistanceFromLatLonInM } from "@/lib/location-validator"
import { calculateCheckInPoints } from "@/lib/point-calculator"
import { incrementCommunityContribution } from "@/lib/community-utils"
import { markUserCheckInNoCount, updateUserCheckInStreak } from "@/lib/streak-utils"

type CheckInRequestBody = {
  latitude?: unknown
  longitude?: unknown
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
}

function getTargetTimeForDate(
  date: Date,
  user: {
    targetTimeMon: string | null
    targetTimeTue: string | null
    targetTimeWed: string | null
    targetTimeThu: string | null
    targetTimeFri: string | null
    targetTimeSat: string | null
    targetTimeSun: string | null
    checkInMon: boolean
    checkInTue: boolean
    checkInWed: boolean
    checkInThu: boolean
    checkInFri: boolean
    checkInSat: boolean
    checkInSun: boolean
  }
): { isCheckInDay: boolean; targetTime: string } {
  // Convert current time to JST for determining the day of week
  const jstOffset = 9 * 60 * 60 * 1000
  const nowJST = new Date(date.getTime() + jstOffset)
  const day = nowJST.getUTCDay()

  if (day === 1) return { isCheckInDay: user.checkInMon, targetTime: user.targetTimeMon ?? "09:00" }
  if (day === 2) return { isCheckInDay: user.checkInTue, targetTime: user.targetTimeTue ?? "09:00" }
  if (day === 3) return { isCheckInDay: user.checkInWed, targetTime: user.targetTimeWed ?? "09:00" }
  if (day === 4) return { isCheckInDay: user.checkInThu, targetTime: user.targetTimeThu ?? "09:00" }
  if (day === 5) return { isCheckInDay: user.checkInFri, targetTime: user.targetTimeFri ?? "09:00" }
  if (day === 6) return { isCheckInDay: user.checkInSat, targetTime: user.targetTimeSat ?? "09:00" }
  if (day === 0) return { isCheckInDay: user.checkInSun, targetTime: user.targetTimeSun ?? "09:00" }

  return { isCheckInDay: false, targetTime: "09:00" }
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as CheckInRequestBody | null

  if (!body) {
    return NextResponse.json({ success: false, error: "リクエスト本文が不正です。" }, { status: 400 })
  }

  const { latitude, longitude } = body

  if (!isNumberInRange(latitude, -90, 90) || !isNumberInRange(longitude, -180, 180)) {
    return NextResponse.json(
      { success: false, error: "緯度・経度の形式が不正です。" },
      { status: 400 }
    )
  }

  // Temporary debug: compute distance info for diagnosis
  const labLatStr = process.env.LAB_LATITUDE
  const labLonStr = process.env.LAB_LONGITUDE
  const radStr = process.env.ALLOWED_RADIUS_METERS
  const debugInfo = {
    userLat: latitude,
    userLon: longitude,
    labLatSet: !!labLatStr,
    labLonSet: !!labLonStr,
    labLat: labLatStr ? parseFloat(labLatStr) : null,
    labLon: labLonStr ? parseFloat(labLonStr) : null,
    allowedRadius: radStr ? parseFloat(radStr) : 100,
    distance: labLatStr && labLonStr
      ? getDistanceFromLatLonInM(latitude, longitude, parseFloat(labLatStr), parseFloat(labLonStr))
      : null,
  }

  if (!isWithinLab(latitude, longitude)) {
    console.log("Check-in failed due to location:", debugInfo);
    return NextResponse.json(
      {
        success: false,
        error: "研究室の指定範囲外です。位置情報を確認してから再度チェックインしてください。",
        debug: debugInfo,
      },
      { status: 403 }
    )
  } else {
    console.log("Check-in location validated:", { latitude, longitude });
  }

  const now = new Date()
  
  // Calculate boundaries for the current JST day
  const jstOffset = 9 * 60 * 60 * 1000
  const nowJST = new Date(now.getTime() + jstOffset)
  const jstYear = nowJST.getUTCFullYear()
  const jstMonth = nowJST.getUTCMonth()
  const jstDate = nowJST.getUTCDate()

  // 00:00 JST today is 15:00 UTC yesterday
  const dayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate, -9, 0, 0, 0))
  const nextDayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate + 1, -9, 0, 0, 0))

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      points: true,
      targetTimeMon: true,
      targetTimeTue: true,
      targetTimeWed: true,
      targetTimeThu: true,
      targetTimeFri: true,
      targetTimeSat: true,
      targetTimeSun: true,
      checkInMon: true,
      checkInTue: true,
      checkInWed: true,
      checkInThu: true,
      checkInFri: true,
      checkInSat: true,
      checkInSun: true,
    },
  })

  if (!user) {
    return NextResponse.json({ success: false, error: "ユーザーが見つかりません。" }, { status: 404 })
  }

  const alreadyCheckedInToday = await prisma.checkIn.findFirst({
    where: {
      userId: user.id,
      time: {
        gte: dayStart,
        lt: nextDayStart,
      },
    },
    select: {
      id: true,
      time: true,
      pointsEarned: true,
      status: true,
    },
  })

  if (alreadyCheckedInToday) {
    return NextResponse.json(
      {
        success: false,
        error: "本日は既にチェックイン済みです。",
        checkedInAt: alreadyCheckedInToday.time,
      },
      { status: 409 }
    )
  }

  const { isCheckInDay, targetTime: defaultTargetTime } = getTargetTimeForDate(now, user)

  if (!isCheckInDay) {
    return NextResponse.json(
      {
        success: false,
        error: "本日はチェックイン対象日として設定されていません。",
      },
      { status: 403 }
    )
  }

  // 事前申告（遅刻）がある場合、申告された出勤予定時刻を目標時刻として使用する
  let targetTime = defaultTargetTime
  const lateException = await prisma.exceptionRequest.findFirst({
    where: {
      userId: user.id,
      type: "LATE",
      status: "APPROVED",
      date: {
        gte: dayStart,
        lt: nextDayStart,
      },
    },
  })

  if (lateException?.newTargetTime) {
    targetTime = lateException.newTargetTime
  }

  const { points, status } = calculateCheckInPoints(targetTime, now)

  const [, updatedUser] = await prisma.$transaction([
    prisma.checkIn.create({
      data: {
        userId: user.id,
        time: now,
        targetTime,
        pointsEarned: points,
        status,
        latitude,
        longitude,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        points: {
          increment: points,
        },
      },
      select: {
        points: true,
      },
    }),
  ])

  // Update community goal contribution
  if (points > 0) {
    await incrementCommunityContribution(user.id, points)
  }
  
  // Update streak if active goal is CHECKIN_STREAK
  const { markCommunityStreakNoCount, updateCommunityStreak } = await import("@/lib/community-utils")
  if (lateException) {
    await markCommunityStreakNoCount(user.id, "CHECKIN", now)
  } else {
    await updateCommunityStreak(user.id, "CHECKIN")
  }

  // 事前申告（遅刻）日は連続時間内をノーカウント扱い
  if (lateException) {
    await markUserCheckInNoCount(user.id, now)
  } else {
    await updateUserCheckInStreak(user.id, status)
  }

  revalidatePath("/dashboard", "layout")
  return NextResponse.json({
    success: true,
    status,
    pointsEarned: points,
    totalPoints: updatedUser.points,
    targetTime,
    checkedInAt: now,
  })
}
