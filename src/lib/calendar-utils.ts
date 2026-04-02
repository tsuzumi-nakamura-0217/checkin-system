export function startOfWeekMonday(date: Date): Date {
  const jstOffset = 9 * 60 * 60 * 1000
  const dateJST = new Date(date.getTime() + jstOffset)
  
  const day = dateJST.getUTCDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  
  // Apply diff to JST date
  dateJST.setUTCDate(dateJST.getUTCDate() + diffToMonday)
  
  const jstYear = dateJST.getUTCFullYear()
  const jstMonth = dateJST.getUTCMonth()
  const jstDate = dateJST.getUTCDate()

  return new Date(Date.UTC(jstYear, jstMonth, jstDate, -9, 0, 0, 0))
}

export function toDayKey(date: Date): string {
  const jstOffset = 9 * 60 * 60 * 1000
  const dateJST = new Date(date.getTime() + jstOffset)
  
  return `${dateJST.getUTCFullYear()}-${String(dateJST.getUTCMonth() + 1).padStart(2, "0")}-${String(dateJST.getUTCDate()).padStart(2, "0")}`
}

export function parseWeekDateParam(value: string | string[] | undefined): Date | null {
  if (!value || Array.isArray(value)) return null

  const matched = /^\d{4}-\d{2}-\d{2}$/.test(value)

  if (!matched) return null

  // Value is like "2023-01-01". We want to parse it as midnight JST.
  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0))

  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

export function formatTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
