import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

type Params = {
  params: Promise<{
    sessionId: string
  }>
}

type PatchBody = {
  title?: unknown
}

export async function GET(_req: Request, ctx: Params) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 })
  }

  const { sessionId } = await ctx.params

  const session = await prisma.aiChatSession.findFirst({
    where: {
      id: sessionId,
      userId: currentUser.id,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          role: true,
          content: true,
          metadataJson: true,
          createdAt: true,
        },
      },
    },
  })

  if (!session) {
    return NextResponse.json({ error: "セッションが見つかりません。" }, { status: 404 })
  }

  return NextResponse.json({ session })
}

export async function PATCH(req: Request, ctx: Params) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 })
  }

  const { sessionId } = await ctx.params
  const body = (await req.json().catch(() => null)) as PatchBody | null

  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 80) : ""

  if (!title) {
    return NextResponse.json({ error: "title を指定してください。" }, { status: 400 })
  }

  const session = await prisma.aiChatSession.findFirst({
    where: {
      id: sessionId,
      userId: currentUser.id,
    },
    select: { id: true },
  })

  if (!session) {
    return NextResponse.json({ error: "セッションが見つかりません。" }, { status: 404 })
  }

  const updated = await prisma.aiChatSession.update({
    where: {
      id: session.id,
    },
    data: {
      title,
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ session: updated })
}

export async function DELETE(_req: Request, ctx: Params) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 })
  }

  const { sessionId } = await ctx.params

  const session = await prisma.aiChatSession.findFirst({
    where: {
      id: sessionId,
      userId: currentUser.id,
    },
    select: {
      id: true,
    },
  })

  if (!session) {
    return NextResponse.json({ error: "セッションが見つかりません。" }, { status: 404 })
  }

  await prisma.aiChatSession.delete({
    where: {
      id: session.id,
    },
  })

  return NextResponse.json({ success: true })
}
