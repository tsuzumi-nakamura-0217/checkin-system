import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

const MAX_SIZE_BYTES = 1024 * 1024 // 1MB

export async function POST(req: Request) {
  const currentUser = await getCurrentUser()
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { image } = body as { image: string }

  if (!image || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image" }, { status: 400 })
  }

  const base64 = image.split(",")[1] ?? ""
  if (Buffer.byteLength(base64, "base64") > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image too large (max 1MB)" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: { customImage: image },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const currentUser = await getCurrentUser()
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: { customImage: null },
  })

  return NextResponse.json({ ok: true })
}
