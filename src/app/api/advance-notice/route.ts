import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

type AdvanceNoticeBody = {
  type: string
  date: string
  newTargetTime?: string
  reason: string
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as AdvanceNoticeBody | null

  if (!body) {
    return NextResponse.json({ success: false, error: "リクエスト本文が不正です。" }, { status: 400 })
  }

  const { type, date, newTargetTime, reason } = body

  if (type !== "LATE" && type !== "ABSENT") {
    return NextResponse.json({ success: false, error: "不正な申告タイプです。" }, { status: 400 })
  }

  if (!date || !reason?.trim()) {
    return NextResponse.json({ success: false, error: "対象日と理由は必須です。" }, { status: 400 })
  }

  if (type === "LATE" && !newTargetTime) {
    return NextResponse.json({ success: false, error: "遅刻予定時刻の入力は必須です。" }, { status: 400 })
  }

  const targetDate = new Date(date)
  if (Number.isNaN(targetDate.getTime())) {
    return NextResponse.json({ success: false, error: "無効な日付です。" }, { status: 400 })
  }
  
  targetDate.setHours(0, 0, 0, 0)

  const now = new Date()
  const deadline = new Date(targetDate)
  deadline.setDate(deadline.getDate() - 1)
  deadline.setHours(23, 59, 59, 999)

  if (now > deadline) {
    return NextResponse.json(
      { success: false, error: "事前申告の締切（前日23:59）を過ぎています。" },
      { status: 400 }
    )
  }

  const existing = await prisma.exceptionRequest.findFirst({
    where: {
      userId: currentUser.id,
      date: targetDate,
    },
  })

  if (existing) {
    return NextResponse.json(
      { success: false, error: "指定された日付には既に申告が存在します。" },
      { status: 409 }
    )
  }

  await prisma.exceptionRequest.create({
    data: {
      userId: currentUser.id,
      type,
      date: targetDate,
      newTargetTime: type === "LATE" ? newTargetTime : null,
      reason: reason.trim(),
      status: "APPROVED",
    },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ success: false, error: "IDが指定されていません。" }, { status: 400 })
  }

  const exception = await prisma.exceptionRequest.findUnique({
    where: { id },
  })

  if (!exception || exception.userId !== currentUser.id) {
    return NextResponse.json(
      { success: false, error: "対象のデータが見つからないか、権限がありません。" },
      { status: 404 }
    )
  }

  const now = new Date()
  const deadline = new Date(exception.date)
  deadline.setDate(deadline.getDate() - 1)
  deadline.setHours(23, 59, 59, 999)

  if (now > deadline) {
    return NextResponse.json(
      { success: false, error: "締切を過ぎているため取り消しできません。" },
      { status: 400 }
    )
  }

  await prisma.exceptionRequest.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
