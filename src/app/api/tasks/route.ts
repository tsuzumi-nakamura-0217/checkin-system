import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import { calculateEstimatedHoursFromRange } from "@/lib/point-calculator"

type CreateTaskRequestBody = {
  title?: unknown
  description?: unknown
  type?: unknown
  startAt?: unknown
  endAt?: unknown
}

const ALLOWED_TASK_TYPES = new Set(["DAILY", "WEEKLY", "MONTHLY"])

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (typeof value !== "string") {
    return undefined
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as CreateTaskRequestBody | null

  if (!body) {
    return NextResponse.json({ success: false, error: "リクエスト本文が不正です。" }, { status: 400 })
  }

  const title = typeof body.title === "string" ? body.title.trim() : ""

  if (!title) {
    return NextResponse.json({ success: false, error: "タスク名は必須です。" }, { status: 400 })
  }

  const description = typeof body.description === "string" ? body.description.trim() : ""

  const type =
    typeof body.type === "string" && ALLOWED_TASK_TYPES.has(body.type)
      ? body.type
      : "DAILY"

  const startAt = parseOptionalDate(body.startAt)
  const endAt = parseOptionalDate(body.endAt)

  if (startAt === undefined || endAt === undefined) {
    return NextResponse.json(
      { success: false, error: "startAt / endAt はISO日時文字列で指定してください。" },
      { status: 400 }
    )
  }

  if (startAt && endAt && endAt <= startAt) {
    return NextResponse.json(
      { success: false, error: "endAt は startAt より後にしてください。" },
      { status: 400 }
    )
  }

  const estimatedHours = calculateEstimatedHoursFromRange(startAt, endAt) ?? 0

  const task = await prisma.task.create({
    data: {
      userId: currentUser.id,
      title,
      description: description || null,
      estimatedHours,
      type,
      status: "TODO",
      startAt,
      endAt,
    },
    select: {
      id: true,
      title: true,
      description: true,
      estimatedHours: true,
      type: true,
      status: true,
      startAt: true,
      endAt: true,
      createdAt: true,
    },
  })

  revalidatePath("/dashboard", "layout")
  return NextResponse.json({
    success: true,
    task,
  })
}
