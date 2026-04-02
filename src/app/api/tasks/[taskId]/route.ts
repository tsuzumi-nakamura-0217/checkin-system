import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

type UpdateTaskStatusRequestBody = {
  status?: unknown
}

function calculateTaskCompletionPoints(estimatedHours: number) {
  return estimatedHours * 10
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const params = await context.params
  const taskId = params.taskId

  if (!taskId) {
    return NextResponse.json({ success: false, error: "taskId が必要です。" }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as UpdateTaskStatusRequestBody | null

  if (!body || (body.status !== "TODO" && body.status !== "DONE")) {
    return NextResponse.json(
      { success: false, error: "status は TODO または DONE で指定してください。" },
      { status: 400 }
    )
  }

  const targetStatus = body.status

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: currentUser.id,
    },
    select: {
      id: true,
      userId: true,
      status: true,
      estimatedHours: true,
      pointsEarned: true,
    },
  })

  if (!task) {
    return NextResponse.json({ success: false, error: "タスクが見つかりません。" }, { status: 404 })
  }

  if (task.status === targetStatus) {
    const currentUserPoints = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { points: true },
    })

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
      },
      totalPoints: currentUserPoints?.points ?? 0,
    })
  }

  if (targetStatus === "DONE") {
    const points = task.pointsEarned ?? calculateTaskCompletionPoints(task.estimatedHours)

    const [updatedTask, updatedUser] = await prisma.$transaction([
      prisma.task.update({
        where: { id: task.id },
        data: {
          status: "DONE",
          completedAt: new Date(),
          pointsEarned: points,
        },
        select: {
          id: true,
          status: true,
          completedAt: true,
          pointsEarned: true,
        },
      }),
      prisma.user.update({
        where: { id: task.userId },
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
      task: updatedTask,
      totalPoints: updatedUser.points,
    })
  }

  const pointsToRevert = task.pointsEarned ?? calculateTaskCompletionPoints(task.estimatedHours)

  const [updatedTask, updatedUser] = await prisma.$transaction([
    prisma.task.update({
      where: { id: task.id },
      data: {
        status: "TODO",
        completedAt: null,
        pointsEarned: null,
      },
      select: {
        id: true,
        status: true,
        completedAt: true,
        pointsEarned: true,
      },
    }),
    prisma.user.update({
      where: { id: task.userId },
      data: {
        points: {
          decrement: pointsToRevert,
        },
      },
      select: {
        points: true,
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    task: updatedTask,
    totalPoints: updatedUser.points,
  })
}

type UpdateTaskRequestBody = {
  title?: unknown
  description?: unknown
  estimatedHours?: unknown
  startAt?: unknown
  endAt?: unknown
}

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

export async function PUT(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const params = await context.params
  const taskId = params.taskId

  if (!taskId) {
    return NextResponse.json({ success: false, error: "taskId が必要です。" }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as UpdateTaskRequestBody | null

  if (!body) {
    return NextResponse.json({ success: false, error: "リクエスト本文が不正です。" }, { status: 400 })
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: currentUser.id,
    },
  })

  if (!task) {
    return NextResponse.json({ success: false, error: "タスクが見つかりません。" }, { status: 404 })
  }

  const dataToUpdate: {
    title?: string
    description?: string | null
    estimatedHours?: number
    startAt?: Date | null
    endAt?: Date | null
  } = {}

  if (typeof body.title === "string") {
    const trimmed = body.title.trim()
    if (trimmed) {
      dataToUpdate.title = trimmed
    }
  }

  if (typeof body.description === "string") {
    dataToUpdate.description = body.description.trim() || null
  }

  if (typeof body.estimatedHours === "number" && Number.isFinite(body.estimatedHours)) {
    let rounded = Math.floor(body.estimatedHours)
    if (rounded < 1) rounded = 1
    if (rounded > 24) rounded = 24
    dataToUpdate.estimatedHours = rounded
  }

  if ("startAt" in body) {
    const parsedStartAt = parseOptionalDate(body.startAt)
    if (parsedStartAt !== undefined) {
      dataToUpdate.startAt = parsedStartAt
    }
  }

  if ("endAt" in body) {
    const parsedEndAt = parseOptionalDate(body.endAt)
    if (parsedEndAt !== undefined) {
      dataToUpdate.endAt = parsedEndAt
    }
  }

  const startAtToCheck = "startAt" in dataToUpdate ? dataToUpdate.startAt : task.startAt
  const endAtToCheck = "endAt" in dataToUpdate ? dataToUpdate.endAt : task.endAt

  if (startAtToCheck && endAtToCheck && endAtToCheck <= startAtToCheck) {
    return NextResponse.json(
      { success: false, error: "endAt は startAt より後にしてください。" },
      { status: 400 }
    )
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: dataToUpdate,
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

  return NextResponse.json({
    success: true,
    task: updatedTask,
  })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const params = await context.params
  const taskId = params.taskId

  if (!taskId) {
    return NextResponse.json({ success: false, error: "taskId が必要です。" }, { status: 400 })
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: currentUser.id,
    },
  })

  if (!task) {
    return NextResponse.json({ success: false, error: "タスクが見つかりません。" }, { status: 404 })
  }

  await prisma.task.delete({
    where: { id: taskId },
  })

  return NextResponse.json({ success: true })
}
