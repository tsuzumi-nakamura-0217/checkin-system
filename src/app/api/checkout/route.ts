import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import { buildTaskSummaryText } from "@/lib/task-summary"

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

  // 00:00 JST today is 15:00 UTC yesterday
  const dayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate, -9, 0, 0, 0))
  const nextDayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate + 1, -9, 0, 0, 0))

  const todayCheckIn = await prisma.checkIn.findFirst({
    where: {
      userId: currentUser.id,
      time: {
        gte: dayStart,
        lt: nextDayStart,
      },
    },
    orderBy: {
      time: "desc",
    },
    select: {
      id: true,
      time: true,
      checkOutTime: true,
      status: true,
      pointsEarned: true,
    },
  })

  if (!todayCheckIn) {
    return NextResponse.json(
      {
        success: false,
        error: "本日のチェックイン記録がありません。先にチェックインしてください。",
      },
      { status: 404 }
    )
  }

  if (todayCheckIn.checkOutTime) {
    return NextResponse.json(
      {
        success: false,
        error: "本日の退勤は既に記録済みです。",
        checkedOutAt: todayCheckIn.checkOutTime,
      },
      { status: 409 }
    )
  }

  const updatedCheckIn = await prisma.checkIn.update({
    where: {
      id: todayCheckIn.id,
    },
    data: {
      checkOutTime: now,
    },
    select: {
      id: true,
      time: true,
      checkOutTime: true,
      status: true,
      pointsEarned: true,
    },
  })

  const todayTasks = await prisma.task.findMany({
    where: {
      userId: currentUser.id,
      startAt: {
        gte: dayStart,
        lt: nextDayStart,
      },
    },
    orderBy: [
      {
        startAt: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      title: true,
      status: true,
      estimatedHours: true,
    },
  })

  const taskSummaryText = buildTaskSummaryText({
    date: now,
    tasks: todayTasks,
  })

  revalidatePath("/dashboard", "layout")
  return NextResponse.json({
    success: true,
    checkInId: updatedCheckIn.id,
    checkedInAt: updatedCheckIn.time,
    checkedOutAt: updatedCheckIn.checkOutTime,
    status: updatedCheckIn.status,
    pointsEarned: updatedCheckIn.pointsEarned,
    taskSummaryText,
  })
}
