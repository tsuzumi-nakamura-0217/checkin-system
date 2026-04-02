import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import { isWithinLab } from "@/lib/location-validator"
import { calculateCheckInPoints } from "@/lib/point-calculator"

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

  if (!isWithinLab(latitude, longitude)) {
    console.log("Check-in failed due to location:", { latitude, longitude });
    return NextResponse.json(
      {
        success: false,
        error: "研究室の指定範囲外です。位置情報を確認してから再度チェックインしてください。",
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

  const { isCheckInDay, targetTime } = getTargetTimeForDate(now, user)

  if (!isCheckInDay) {
    return NextResponse.json(
      {
        success: false,
        error: "本日はチェックイン対象日として設定されていません。",
      },
      { status: 403 }
    )
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

  return NextResponse.json({
    success: true,
    status,
    pointsEarned: points,
    totalPoints: updatedUser.points,
    targetTime,
    checkedInAt: now,
  })
}
