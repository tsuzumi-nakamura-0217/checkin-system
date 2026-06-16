import { getTagColorPreset } from "@/lib/tags"

export type TagItem = {
  id: string
  name: string
  color: string
}

type TagBadgeProps = {
  tag: TagItem
  className?: string
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  const preset = getTagColorPreset(tag.color)
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${preset.badge} ${className ?? ""}`}
    >
      <span className="truncate">{tag.name}</span>
    </span>
  )
}
