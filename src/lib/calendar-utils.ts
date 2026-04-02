export function startOfWeekMonday(date: Date): Date {
  const base = new Date(date)
  const day = base.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  base.setDate(base.getDate() + diffToMonday)
  base.setHours(0, 0, 0, 0)
  return base
}

export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function parseWeekDateParam(value: string | string[] | undefined): Date | null {
  if (!value || Array.isArray(value)) return null

  const matched = /^\d{4}-\d{2}-\d{2}$/.test(value)

  if (!matched) return null

  const parsed = new Date(`${value}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

export function formatTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
