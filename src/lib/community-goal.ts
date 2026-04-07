const JST_OFFSET_MS = 9 * 60 * 60 * 1000

export function getStartOfTodayJst(baseDate: Date = new Date()): Date {
  const jstNow = new Date(baseDate.getTime() + JST_OFFSET_MS)
  const year = jstNow.getUTCFullYear()
  const month = jstNow.getUTCMonth()
  const day = jstNow.getUTCDate()

  return new Date(Date.UTC(year, month, day, -9, 0, 0, 0))
}

export function parseDateInputAsEndOfDayJst(dateInput: string): Date {
  const [year, month, day] = dateInput.split("-").map((v) => Number(v))

  if (!year || !month || !day) {
    return new Date(dateInput)
  }

  return new Date(Date.UTC(year, month - 1, day, 14, 59, 59, 999))
}
