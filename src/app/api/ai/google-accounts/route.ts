import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { getGeminiDailyRequestLimit, getJstDateKey } from "@/lib/ai-utils"

type PatchBody = {
  selectedAccountIds?: unknown
}

export const dynamic = "force-dynamic"

export async function GET() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 })
  }

  const todayKey = getJstDateKey()

  const [accounts, selections, usage, user] = await Promise.all([
    prisma.googleLinkedAccount.findMany({
      where: {
        userId: currentUser.id,
        isActive: true,
        authorizedViaSettings: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        aiAuthorizedAt: true,
        createdAt: true,
      },
      orderBy: {
        aiAuthorizedAt: "desc",
      },
    }),
    prisma.userAiGoogleSelection.findMany({
      where: { userId: currentUser.id },
      select: {
        linkedAccountId: true,
      },
    }),
    prisma.aiUsageDaily.findUnique({
      where: {
        userId_dateJst: {
          userId: currentUser.id,
          dateJst: todayKey,
        },
      },
      select: {
        requestCount: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { email: true },
    }),
  ])

  const selectedAccountIds = selections.map((item) => item.linkedAccountId)
  const limit = getGeminiDailyRequestLimit()
  const requestCount = usage?.requestCount || 0
  const loginEmail = (user?.email || "").toLowerCase()

  const loginAccountNeedsReauth = Boolean(
    loginEmail && !accounts.some((item) => item.email.toLowerCase() === loginEmail)
  )

  return NextResponse.json({
    accounts,
    selectedAccountIds,
    usage: {
      requestCount,
      limit,
      ratio: limit > 0 ? Math.min(1, requestCount / limit) : 0,
    },
    loginAccountNeedsReauth,
    loginEmail: user?.email || null,
  })
}

export async function PATCH(req: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as PatchBody | null

  if (!body || !Array.isArray(body.selectedAccountIds)) {
    return NextResponse.json({ error: "selectedAccountIds は配列で指定してください。" }, { status: 400 })
  }

  const uniqueIds = Array.from(
    new Set(
      body.selectedAccountIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    )
  )

  if (uniqueIds.length > 0) {
    const availableCount = await prisma.googleLinkedAccount.count({
      where: {
        id: { in: uniqueIds },
        userId: currentUser.id,
        isActive: true,
        authorizedViaSettings: true,
      },
    })

    if (availableCount !== uniqueIds.length) {
      return NextResponse.json({ error: "選択されたアカウントに不正なIDが含まれています。" }, { status: 400 })
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.userAiGoogleSelection.deleteMany({
      where: {
        userId: currentUser.id,
      },
    })

    if (uniqueIds.length > 0) {
      await tx.userAiGoogleSelection.createMany({
        data: uniqueIds.map((linkedAccountId) => ({
          userId: currentUser.id,
          linkedAccountId,
        })),
      })
    }
  })

  return NextResponse.json({
    success: true,
    selectedAccountIds: uniqueIds,
  })
}
