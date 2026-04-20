export function calculateCheckInPoints(targetTime: string, actualTime: Date): { points: number, status: 'EARLY' | 'LATE' | 'ON_TIME' } {
  // DBの targetTime ("09:00" など) を Date に変換して比較するロジック
  const [targetHour, targetMin] = targetTime.split(':').map(Number);

  // Create targetDate representing the given targetTime in JST today
  const jstOffset = 9 * 60 * 60 * 1000;
  const actualJST = new Date(actualTime.getTime() + jstOffset);

  const jstYear = actualJST.getUTCFullYear();
  const jstMonth = actualJST.getUTCMonth();
  const jstDate = actualJST.getUTCDate();

  // Create absolute UTC timestamp for that JST target time
  // e.g. 09:00 JST is 00:00 UTC
  const targetDate = new Date(Date.UTC(jstYear, jstMonth, jstDate, targetHour - 9, targetMin, 0, 0));

  const diffInMs = actualTime.getTime() - targetDate.getTime();
  // 秒数は切り捨てて無視し、分単位で計算する
  const diffInMinutes = Math.trunc(diffInMs / (1000 * 60));

  if (diffInMinutes < 0) {
    // 早く到着した場合: 1分ごとに +10ポイント
    const earlyMinutes = Math.abs(diffInMinutes);
    return { points: earlyMinutes * 10, status: 'EARLY' };
  } else if (diffInMinutes > 0) {
    // 遅刻した場合: 1分ごとに -10ポイント
    return { points: -(diffInMinutes * 10), status: 'LATE' };
  } else {
    // ぴったり到着
    return { points: 0, status: 'ON_TIME' };
  }
}

function toValidDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function calculateTaskDurationMinutes(
  startAt: Date | string | null | undefined,
  endAt: Date | string | null | undefined,
): number | null {
  const start = toValidDate(startAt)
  const end = toValidDate(endAt)
  if (!start || !end) return null

  const diffMs = end.getTime() - start.getTime()
  if (diffMs <= 0) return null

  return Math.floor(diffMs / (60 * 1000))
}

export function calculateEstimatedHoursFromRange(
  startAt: Date | string | null | undefined,
  endAt: Date | string | null | undefined,
): number | null {
  const minutes = calculateTaskDurationMinutes(startAt, endAt)
  if (minutes == null) return null

  return Math.round((minutes / 60) * 10) / 10
}

export function calculateTaskCompletionPointsFromRange(
  startAt: Date | string | null | undefined,
  endAt: Date | string | null | undefined,
): number {
  const minutes = calculateTaskDurationMinutes(startAt, endAt)
  if (minutes == null) return 0

  return Math.floor(minutes / 30) * 5
}

export function calculateTaskCompletionPoints(estimatedHours: number): number {
  // 0.5hごとに+1ポイント
  return Math.floor(estimatedHours / 0.5) * 5;
}
