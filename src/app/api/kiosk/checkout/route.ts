import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { prisma } from "@/lib/prisma"
import { getClientIp, isLabNetwork } from "@/lib/location-validator"
import { buildCheckOutMessage, sendSlackNotification } from "@/lib/slack"

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

  const todayCheckIn = await prisma.checkIn.findFirst({
    where: { userId: body.userId, time: { gte: dayStart, lt: nextDayStart } },
    orderBy: { time: "desc" },
    select: {
      id: true, time: true, checkOutTime: true, status: true, pointsEarned: true,
      user: { select: { name: true } },
    },
  })

  if (!todayCheckIn) {
    return NextResponse.json({ success: false, error: "本日のチェックイン記録がありません。" }, { status: 404 })
  }

  if (todayCheckIn.checkOutTime) {
    return NextResponse.json({ success: false, error: "本日の退勤は既に記録済みです。" }, { status: 409 })
  }

  const updatedCheckIn = await prisma.checkIn.update({
    where: { id: todayCheckIn.id },
    data: { checkOutTime: now },
    select: { id: true, time: true, checkOutTime: true, status: true, pointsEarned: true },
  })

  if (updatedCheckIn.checkOutTime) {
    await sendSlackNotification(
      buildCheckOutMessage({
        userName: todayCheckIn.user?.name ?? null,
        checkedOutAt: updatedCheckIn.checkOutTime,
        isRemote: updatedCheckIn.status === "REMOTE",
      })
    )
  }

  revalidatePath("/dashboard", "layout")
  return NextResponse.json({
    success: true,
    checkInId: updatedCheckIn.id,
    checkedInAt: updatedCheckIn.time,
    checkedOutAt: updatedCheckIn.checkOutTime,
    status: updatedCheckIn.status,
    pointsEarned: updatedCheckIn.pointsEarned,
  })
}
