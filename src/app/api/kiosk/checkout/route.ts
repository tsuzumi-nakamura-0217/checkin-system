import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { prisma } from "@/lib/prisma"
import { isLabNetwork } from "@/lib/location-validator"

function getClientIp(headersList: { get(name: string): string | null }): string | null {
  for (const name of ["x-forwarded-for", "x-vercel-forwarded-for", "x-real-ip", "cf-connecting-ip"]) {
    const val = headersList.get(name)
    if (val) return val.split(",")[0]?.trim() ?? null
  }
  return null
}

function isKioskAuthorized(request: Request, clientIp: string | null): boolean {
  const kioskToken = process.env.KIOSK_TOKEN
  if (kioskToken) {
    return request.headers.get("x-kiosk-token") === kioskToken
  }
  return isLabNetwork(clientIp)
}

export async function POST(request: Request) {
  const headersList = await headers()
  const clientIp = getClientIp(headersList)

  if (!isKioskAuthorized(request, clientIp)) {
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
    select: { id: true, time: true, checkOutTime: true, status: true, pointsEarned: true },
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
