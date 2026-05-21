import { NextResponse } from "next/server"
import { headers } from "next/headers"

import { prisma } from "@/lib/prisma"
import { getClientIp, isLabNetwork } from "@/lib/location-validator"

export async function GET() {
  const headersList = await headers()
  const clientIp = getClientIp(headersList)

  if (!isLabNetwork(clientIp)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const jstOffset = 9 * 60 * 60 * 1000
  const nowJST = new Date(now.getTime() + jstOffset)
  const jstYear = nowJST.getUTCFullYear()
  const jstMonth = nowJST.getUTCMonth()
  const jstDate = nowJST.getUTCDate()
  const dayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate, -9, 0, 0, 0))
  const nextDayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate + 1, -9, 0, 0, 0))
  const windowStart = new Date(dayStart.getTime() - 48 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      customImage: true,
      points: true,
      checkIns: {
        where: {
          time: { gte: windowStart, lt: nextDayStart },
        },
        select: {
          time: true,
          checkOutTime: true,
          status: true,
          pointsEarned: true,
        },
        orderBy: { time: "desc" },
        take: 2,
      },
    },
    orderBy: { name: "asc" },
  })

  const result = users.map((u) => {
    const todayCheckIn = u.checkIns.find((c) => c.time >= dayStart) ?? null
    const overnightCheckIn = !todayCheckIn
      ? (u.checkIns.find((c) => !c.checkOutTime) ?? null)
      : null

    const checkIn = todayCheckIn ?? overnightCheckIn

    let todayStatus: "unchecked" | "checked_in" | "checked_out" | "overnight"
    if (todayCheckIn) {
      todayStatus = todayCheckIn.checkOutTime ? "checked_out" : "checked_in"
    } else if (overnightCheckIn) {
      todayStatus = "overnight"
    } else {
      todayStatus = "unchecked"
    }

    return {
      id: u.id,
      name: u.username ?? u.name,
      image: u.customImage ?? u.image,
      points: u.points,
      todayStatus,
      checkedInAt: checkIn?.time ?? null,
      checkedOutAt: checkIn?.checkOutTime ?? null,
      checkInStatus: checkIn?.status ?? null,
      pointsEarned: checkIn?.pointsEarned ?? null,
    }
  })

  return NextResponse.json({ users: result })
}
