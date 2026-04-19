import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

type Params = {
  params: Promise<{
    accountId: string
  }>
}

export async function DELETE(_req: NextRequest, ctx: Params) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 })
  }

  const { accountId } = await ctx.params

  const account = await prisma.googleLinkedAccount.findFirst({
    where: {
      id: accountId,
      userId: currentUser.id,
    },
    select: {
      id: true,
    },
  })

  if (!account) {
    return NextResponse.json({ error: "アカウントが見つかりません。" }, { status: 404 })
  }

  await prisma.googleLinkedAccount.delete({
    where: {
      id: account.id,
    },
  })

  return NextResponse.json({ success: true })
}
