import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { calculateCheckInPoints } from "@/lib/point-calculator"
import { markCommunityStreakNoCount } from "@/lib/community-utils"
import { getCurrentUser } from "@/lib/current-user"
import { markUserCheckInNoCount } from "@/lib/streak-utils"
import { buildRemoteCheckInMessage, sendSlackNotification } from "@/lib/slack"

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

export async function POST() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const now = new Date()

  // Calculate boundaries for the current JST day
  const jstOffset = 9 * 60 * 60 * 1000
  const nowJST = new Date(now.getTime() + jstOffset)
  const jstYear = nowJST.getUTCFullYear()
  const jstMonth = nowJST.getUTCMonth()
  const jstDate = nowJST.getUTCDate()

  const dayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate, -9, 0, 0, 0))
  const nextDayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate + 1, -9, 0, 0, 0))

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      name: true,
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

  // 在宅勤務: 本来のポイントの半分を付与し、ステータスは REMOTE
  // calculateCheckInPoints は早い:+10pt/分・遅刻:-10pt/分を返すため、その半分を採用する
  // （元のポイントは常に10の倍数なので半分は必ず5の倍数の整数。Math.trunc は念のため0方向へ丸め）
  const { points: fullPoints } = calculateCheckInPoints(targetTime, now)
  const remotePoints = Math.trunc(fullPoints / 2)

  const [, updatedUser] = await prisma.$transaction([
    prisma.checkIn.create({
      data: {
        userId: user.id,
        time: now,
        targetTime,
        pointsEarned: remotePoints,
        status: "REMOTE",
        latitude: null,
        longitude: null,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        points: {
          increment: remotePoints,
        },
      },
      select: {
        points: true,
      },
    }),
  ])

  await markCommunityStreakNoCount(user.id, "CHECKIN", now)
  await markUserCheckInNoCount(user.id, now)

  // Generate morning report text
  const todayTasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      startAt: {
        gte: dayStart,
        lt: nextDayStart,
      },
    },
    orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
    select: { title: true, status: true, startAt: true, endAt: true },
  })

  const checkedInTimeLabel = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(now)

  const { buildMorningReportText } = await import("@/lib/task-summary")
  const taskSummaryText = buildMorningReportText({
    date: now,
    tasks: todayTasks,
    checkedInTimeLabel,
    isRemote: true,
  })

  const slackNotified = await sendSlackNotification(
    buildRemoteCheckInMessage({
      userName: user.name,
      checkedInAt: now,
    })
  )

  revalidatePath("/dashboard", "layout")
  return NextResponse.json({
    success: true,
    status: "REMOTE",
    pointsEarned: remotePoints,
    totalPoints: updatedUser.points,
    targetTime,
    checkedInAt: now,
    taskSummaryText,
    slackNotified,
  })
}
