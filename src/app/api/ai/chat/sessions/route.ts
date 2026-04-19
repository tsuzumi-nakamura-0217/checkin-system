import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

type CreateSessionBody = {
  title?: unknown
}

export const dynamic = "force-dynamic"

export async function GET() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 })
  }

  const sessions = await prisma.aiChatSession.findMany({
    where: {
      userId: currentUser.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  })

  return NextResponse.json({ sessions })
}

export async function POST(req: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as CreateSessionBody | null
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 80) : ""

  const session = await prisma.aiChatSession.create({
    data: {
      userId: currentUser.id,
      title: title || "新しい会話",
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ session })
}
