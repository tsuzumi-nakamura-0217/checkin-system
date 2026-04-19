import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { getGeminiDailyRequestLimit, getJstDateKey } from "@/lib/ai-utils"
import { buildGoogleAccountServiceContext } from "@/lib/google-ai-services"
import { GeminiApiError, generateGeminiResponse } from "@/lib/gemini"

type Params = {
  params: Promise<{
    sessionId: string
  }>
}

type Body = {
  content?: unknown
}

export async function POST(req: Request, ctx: Params) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Body | null
  const content = typeof body?.content === "string" ? body.content.trim() : ""

  if (!content) {
    return NextResponse.json({ error: "content を指定してください。" }, { status: 400 })
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
    },
  })

  if (!session) {
    return NextResponse.json({ error: "セッションが見つかりません。" }, { status: 404 })
  }

  const todayKey = getJstDateKey()
  const dailyLimit = getGeminiDailyRequestLimit()

  const usage = await prisma.aiUsageDaily.findUnique({
    where: {
      userId_dateJst: {
        userId: currentUser.id,
        dateJst: todayKey,
      },
    },
    select: {
      requestCount: true,
    },
  })

  if ((usage?.requestCount || 0) >= dailyLimit) {
    return NextResponse.json(
      {
        error: "Gemini無料枠の本日上限に達しました。時間をおいて再試行してください。",
        usage: {
          requestCount: usage?.requestCount || 0,
          limit: dailyLimit,
        },
      },
      { status: 429 }
    )
  }

  const selected = await prisma.userAiGoogleSelection.findMany({
    where: {
      userId: currentUser.id,
    },
    include: {
      linkedAccount: true,
    },
  })

  const linkedAccounts = selected
    .map((item) => item.linkedAccount)
    .filter((account) => account.isActive && account.authorizedViaSettings)

  if (linkedAccounts.length === 0) {
    return NextResponse.json(
      {
        error: "Google系サービスを参照するには設定画面でGoogleアカウントの再認証が必要です。",
      },
      { status: 403 }
    )
  }

  const historyMessages = await prisma.aiChatMessage.findMany({
    where: {
      sessionId: session.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 12,
    select: {
      role: true,
      content: true,
    },
  })

  const history = historyMessages
    .reverse()
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({
      role: item.role as "user" | "assistant",
      content: item.content,
    }))

  const userMessage = await prisma.aiChatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content,
    },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  })

  try {
    const contexts = await Promise.all(linkedAccounts.map((account) => buildGoogleAccountServiceContext(account)))

    const gemini = await generateGeminiResponse({
      history,
      userMessage: content,
      contexts,
    })

    const metadata = {
      accountRefs: contexts.map((item) => ({
        accountId: item.accountId,
        email: item.email,
      })),
      warnings: contexts.flatMap((item) => item.warnings),
    }

    const [assistantMessage, latestUsage] = await prisma.$transaction(async (tx) => {
      const createdAssistant = await tx.aiChatMessage.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: gemini.text,
          metadataJson: JSON.stringify(metadata),
        },
        select: {
          id: true,
          role: true,
          content: true,
          metadataJson: true,
          createdAt: true,
        },
      })

      await tx.aiChatSession.update({
        where: {
          id: session.id,
        },
        data: {
          updatedAt: new Date(),
          title: session.title === "新しい会話" ? content.slice(0, 30) : session.title,
        },
      })

      const updatedUsage = await tx.aiUsageDaily.upsert({
        where: {
          userId_dateJst: {
            userId: currentUser.id,
            dateJst: todayKey,
          },
        },
        create: {
          userId: currentUser.id,
          dateJst: todayKey,
          requestCount: 1,
          inputTokens: gemini.promptTokens,
          outputTokens: gemini.outputTokens,
        },
        update: {
          requestCount: {
            increment: 1,
          },
          inputTokens: {
            increment: gemini.promptTokens,
          },
          outputTokens: {
            increment: gemini.outputTokens,
          },
        },
        select: {
          requestCount: true,
        },
      })

      return [createdAssistant, updatedUsage] as const
    })

    return NextResponse.json({
      userMessage,
      assistantMessage,
      usage: {
        requestCount: latestUsage.requestCount,
        limit: dailyLimit,
      },
    })
  } catch (error) {
    if (error instanceof GeminiApiError) {
      const requestCount = usage?.requestCount || 0
      const isQuotaExceeded = error.status === 429
      const errorMessage = isQuotaExceeded
        ? "Gemini APIの利用上限に達しました。少し待ってから再試行してください。無料枠では gemini-2.5-pro が利用できない場合があるため、gemini-2.5-flash か gemini-2.0-flash を利用してください。"
        : `Gemini APIエラー: ${error.message}`

      await prisma.aiChatMessage.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: errorMessage,
        },
      })

      return NextResponse.json(
        {
          error: errorMessage,
          usage: {
            requestCount,
            limit: dailyLimit,
          },
        },
        {
          status: error.status,
          headers: error.retryAfterSeconds
            ? {
                "Retry-After": String(error.retryAfterSeconds),
              }
            : undefined,
        }
      )
    }

    console.error("[AI_CHAT_SEND]", error)

    await prisma.aiChatMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content:
          "AI応答の生成に失敗しました。Google連携状態やGemini API設定を確認して、もう一度お試しください。",
      },
    })

    return NextResponse.json(
      {
        error: "AI応答の生成に失敗しました。",
      },
      { status: 500 }
    )
  }
}
