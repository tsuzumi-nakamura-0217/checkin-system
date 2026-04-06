import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const goalId = searchParams.get("goalId")
    const now = new Date()

    let effectiveGoalId = goalId

    if (!effectiveGoalId) {
      const activeGoal = await prisma.communityGoal.findFirst({
        where: {
          isActive: true,
          deadline: { gte: now },
        },
        select: { id: true }
      })
      effectiveGoalId = activeGoal?.id || null
    }

    if (!effectiveGoalId) {
      return NextResponse.json([])
    }

    const user = await getCurrentUser()

    const comments = await prisma.communityComment.findMany({
      where: { goalId: effectiveGoalId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: { readReceipts: true }
        },
        readReceipts: user ? {
          where: { userId: user.id },
          select: { id: true }
        } : false
      },
    })

    const formattedComments = comments.map(comment => ({
      ...comment,
      readCount: comment._count.readReceipts,
      isReadByMe: user ? (comment.readReceipts?.length ?? 0) > 0 : false,
      readReceipts: undefined,
      _count: undefined
    }))

    return NextResponse.json(formattedComments)
  } catch (error) {
    console.error("Error fetching community comments:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content } = await req.json()
    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const now = new Date()
    // Get active goal
    const activeGoal = await prisma.communityGoal.findFirst({
      where: {
        isActive: true,
        deadline: { gte: now },
      },
      select: { id: true }
    })

    const comment = await prisma.communityComment.create({
      data: {
        content,
        userId: user.id,
        goalId: activeGoal?.id || null,
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error("Error posting community comment:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
