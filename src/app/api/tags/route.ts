import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import { DEFAULT_TAG_COLOR, isValidTagColor } from "@/lib/tags"

const MAX_TAG_NAME_LENGTH = 30

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  )
}

export async function GET() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const tags = await prisma.tag.findMany({
    where: { userId: currentUser.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  })

  return NextResponse.json({ success: true, tags })
}

type CreateTagRequestBody = {
  name?: unknown
  color?: unknown
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as CreateTagRequestBody | null

  if (!body) {
    return NextResponse.json({ success: false, error: "リクエスト本文が不正です。" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""

  if (!name) {
    return NextResponse.json({ success: false, error: "タグ名は必須です。" }, { status: 400 })
  }

  if (name.length > MAX_TAG_NAME_LENGTH) {
    return NextResponse.json(
      { success: false, error: `タグ名は${MAX_TAG_NAME_LENGTH}文字以内で入力してください。` },
      { status: 400 }
    )
  }

  const color = isValidTagColor(body.color) ? body.color : DEFAULT_TAG_COLOR

  try {
    const tag = await prisma.tag.create({
      data: {
        userId: currentUser.id,
        name,
        color,
      },
      select: { id: true, name: true, color: true },
    })

    revalidatePath("/dashboard", "layout")
    return NextResponse.json({ success: true, tag })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { success: false, error: "同じ名前のタグが既に存在します。" },
        { status: 409 }
      )
    }
    throw error
  }
}
