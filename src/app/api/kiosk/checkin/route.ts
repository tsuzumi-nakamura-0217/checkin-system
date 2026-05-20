import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { prisma } from "@/lib/prisma"
import { getClientIp, isLabNetwork } from "@/lib/location-validator"
import { calculateCheckInPoints } from "@/lib/point-calculator"
import { incrementCommunityContribution } from "@/lib/community-utils"
import { markUserCheckInNoCount, updateUserCheckInStreak } from "@/lib/streak-utils"
import { buildCheckInMessage, sendSlackNotification } from "@/lib/slack"

function getTargetTimeForDate(
  date: Date,
  user: {
    targetTimeMon: string | null; targetTimeTue: string | null; targetTimeWed: string | null
    targetTimeThu: string | null; targetTimeFri: string | null; targetTimeSat: string | null
    targetTimeSun: string | null; checkInMon: boolean; checkInTue: boolean; checkInWed: boolean
    checkInThu: boolean; checkInFri: boolean; checkInSat: boolean; checkInSun: boolean
  }
): { isCheckInDay: boolean; targetTime: string } {
  const jstOffset = 9 * 60 * 60 * 1000
  const day = new Date(date.getTime() + jstOffset).getUTCDay()
  if (day === 1) return { isCheckInDay: user.checkInMon, targetTime: user.targetTimeMon ?? "09:00" }
  if (day === 2) return { isCheckInDay: user.checkInTue, targetTime: user.targetTimeTue ?? "09:00" }
  if (day === 3) return { isCheckInDay: user.checkInWed, targetTime: user.targetTimeWed ?? "09:00" }
  if (day === 4) return { isCheckInDay: user.checkInThu, targetTime: user.targetTimeThu ?? "09:00" }
  if (day === 5) return { isCheckInDay: user.checkInFri, targetTime: user.targetTimeFri ?? "09:00" }
  if (day === 6) return { isCheckInDay: user.checkInSat, targetTime: user.targetTimeSat ?? "09:00" }
  return { isCheckInDay: user.checkInSun, targetTime: user.targetTimeSun ?? "09:00" }
}

export async function POST(request: Request) {
  const headersList = await headers()
  const clientIp = getClientIp(headersList)

  if (!isLabNetwork(clientIp)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as { userId?: string } | null
  if (!body?.userId) {
    return NextResponse.json({ success: false, error: "userId が必要です。" }, { status: 400 })
  }

  const now = new Date()
  const jstOffset = 9 * 60 * 60 * 1000
  const nowJST = new Date(now.getTime() + jstOffset)
  const jstYear = nowJST.getUTCFullYear()
  const jstMonth = nowJST.getUTCMonth()
  const jstDate = nowJST.getUTCDate()
  const dayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate, -9, 0, 0, 0))
  const nextDayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate + 1, -9, 0, 0, 0))

  const user = await prisma.user.findUnique({
    where: { id: body.userId },
    select: {
      id: true, name: true, points: true,
      targetTimeMon: true, targetTimeTue: true, targetTimeWed: true, targetTimeThu: true,
      targetTimeFri: true, targetTimeSat: true, targetTimeSun: true,
      checkInMon: true, checkInTue: true, checkInWed: true, checkInThu: true,
      checkInFri: true, checkInSat: true, checkInSun: true,
    },
  })

  if (!user) {
    return NextResponse.json({ success: false, error: "ユーザーが見つかりません。" }, { status: 404 })
  }

  const alreadyCheckedIn = await prisma.checkIn.findFirst({
    where: { userId: user.id, time: { gte: dayStart, lt: nextDayStart } },
    select: { id: true, time: true },
  })

  if (alreadyCheckedIn) {
    return NextResponse.json({ success: false, error: "本日は既にチェックイン済みです。" }, { status: 409 })
  }

  const { isCheckInDay, targetTime: defaultTargetTime } = getTargetTimeForDate(now, user)

  if (!isCheckInDay) {
    return NextResponse.json({ success: false, error: "本日はチェックイン対象日ではありません。" }, { status: 403 })
  }

  let targetTime = defaultTargetTime
  const lateException = await prisma.exceptionRequest.findFirst({
    where: { userId: user.id, type: "LATE", status: "APPROVED", date: { gte: dayStart, lt: nextDayStart } },
  })
  if (lateException?.newTargetTime) {
    targetTime = lateException.newTargetTime
  }

  const { points, status } = calculateCheckInPoints(targetTime, now)

  const [, updatedUser] = await prisma.$transaction([
    prisma.checkIn.create({
      data: { userId: user.id, time: now, targetTime, pointsEarned: points, status, latitude: null, longitude: null },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { points: { increment: points } },
      select: { points: true },
    }),
  ])

  if (points > 0) {
    await incrementCommunityContribution(user.id, points)
  }

  const { markCommunityStreakNoCount, updateCommunityStreak } = await import("@/lib/community-utils")
  if (lateException) {
    await markCommunityStreakNoCount(user.id, "CHECKIN", now)
    await markUserCheckInNoCount(user.id, now)
  } else {
    await updateCommunityStreak(user.id, "CHECKIN")
    await updateUserCheckInStreak(user.id, status)
  }

  await sendSlackNotification(
    buildCheckInMessage({
      userName: user.name,
      status,
      pointsEarned: points,
      checkedInAt: now,
    })
  )

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
