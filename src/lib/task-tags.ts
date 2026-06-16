import { prisma } from "@/lib/prisma"

export function sanitizeTagIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids = value.filter((id): id is string => typeof id === "string" && id.length > 0)
  return Array.from(new Set(ids))
}

// 指定されたタグIDのうち、本人が所有するものだけに絞り込む
export async function resolveOwnedTagIds(userId: string, tagIds: string[]): Promise<string[]> {
  if (tagIds.length === 0) return []
  const ownedTags = await prisma.tag.findMany({
    where: { id: { in: tagIds }, userId },
    select: { id: true },
  })
  return ownedTags.map((tag) => tag.id)
}
