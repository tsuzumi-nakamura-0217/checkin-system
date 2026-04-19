export function getJstDateKey(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  return formatter.format(date)
}

export function getGeminiDailyRequestLimit(): number {
  const raw = process.env.GEMINI_DAILY_REQUEST_LIMIT
  const parsed = Number(raw)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 80
  }

  return Math.floor(parsed)
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL_NAME?.trim() || "gemini-2.0-flash"
}

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim()

  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  return key
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}
