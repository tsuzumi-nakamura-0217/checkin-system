import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import { isValidTagColor } from "@/lib/tags"

const MAX_TAG_NAME_LENGTH = 30

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  )
}

type UpdateTagRequestBody = {
  name?: unknown
  color?: unknown
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ tagId: string }> }
) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const { tagId } = await context.params

  if (!tagId) {
    return NextResponse.json({ success: false, error: "tagId が必要です。" }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as UpdateTagRequestBody | null

  if (!body) {
    return NextResponse.json({ success: false, error: "リクエスト本文が不正です。" }, { status: 400 })
  }

  const tag = await prisma.tag.findFirst({
    where: { id: tagId, userId: currentUser.id },
    select: { id: true },
  })

  if (!tag) {
    return NextResponse.json({ success: false, error: "タグが見つかりません。" }, { status: 404 })
  }

  const dataToUpdate: { name?: string; color?: string } = {}

  if (typeof body.name === "string") {
    const trimmed = body.name.trim()
    if (!trimmed) {
      return NextResponse.json({ success: false, error: "タグ名は必須です。" }, { status: 400 })
    }
    if (trimmed.length > MAX_TAG_NAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: `タグ名は${MAX_TAG_NAME_LENGTH}文字以内で入力してください。` },
        { status: 400 }
      )
    }
    dataToUpdate.name = trimmed
  }

  if (body.color !== undefined) {
    if (!isValidTagColor(body.color)) {
      return NextResponse.json({ success: false, error: "色の指定が不正です。" }, { status: 400 })
    }
    dataToUpdate.color = body.color
  }

  try {
    const updatedTag = await prisma.tag.update({
      where: { id: tagId },
      data: dataToUpdate,
      select: { id: true, name: true, color: true },
    })

    revalidatePath("/dashboard", "layout")
    return NextResponse.json({ success: true, tag: updatedTag })
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ tagId: string }> }
) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.json({ success: false, error: "認証が必要です。" }, { status: 401 })
  }

  const { tagId } = await context.params

  if (!tagId) {
    return NextResponse.json({ success: false, error: "tagId が必要です。" }, { status: 400 })
  }

  const tag = await prisma.tag.findFirst({
    where: { id: tagId, userId: currentUser.id },
    select: { id: true },
  })

  if (!tag) {
    return NextResponse.json({ success: false, error: "タグが見つかりません。" }, { status: 404 })
  }

  // TaskTag は onDelete: Cascade のため、タグ付与のみ消えてタスク自体は残る
  await prisma.tag.delete({ where: { id: tagId } })

  revalidatePath("/dashboard", "layout")
  return NextResponse.json({ success: true })
}
