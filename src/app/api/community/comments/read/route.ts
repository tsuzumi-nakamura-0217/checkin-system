import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { commentIds } = await req.json()
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return NextResponse.json({ error: "commentIds array is required" }, { status: 400 })
    }

    // Use upsert to handle duplicates safely on any connector
    await Promise.all(
      commentIds.map(id => 
        prisma.communityCommentRead.upsert({
          where: {
            commentId_userId: {
              commentId: id,
              userId: user.id
            }
          },
          update: {}, // No change if already read
          create: {
            commentId: id,
            userId: user.id
          }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking comments as read:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
