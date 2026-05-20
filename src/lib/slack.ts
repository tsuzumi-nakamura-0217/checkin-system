type CheckInStatus = "EARLY" | "LATE" | "ON_TIME" | "REMOTE"

function getWebhookUrl(): string | null {
  return process.env.SLACK_WEBHOOK_URL ?? null
}

export async function sendSlackNotification(text: string): Promise<boolean> {
  const webhookUrl = getWebhookUrl()
  if (!webhookUrl) return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      console.error("Slack webhook failed:", response.status, body)
      return false
    }
    return true
  } catch (error) {
    console.error("Slack webhook error:", error)
    return false
  } finally {
    clearTimeout(timeout)
  }
}

function formatTimeJST(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date)
}

function statusLabel(status: CheckInStatus): string {
  if (status === "EARLY") return "早着"
  if (status === "LATE") return "遅刻"
  if (status === "REMOTE") return "在宅"
  return "時間内"
}

function pointLabel(points: number): string {
  if (points > 0) return `+${points}pt`
  if (points < 0) return `${points}pt`
  return "±0pt"
}

function displayName(name: string | null | undefined): string {
  const trimmed = name?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : "メンバー"
}

export function buildCheckInMessage(params: {
  userName: string | null
  status: CheckInStatus
  pointsEarned: number
  checkedInAt: Date
}): string {
  const { userName, status, pointsEarned, checkedInAt } = params
  return `✅ ${displayName(userName)} さんがチェックインしました (${statusLabel(status)} ${formatTimeJST(checkedInAt)} ${pointLabel(pointsEarned)})`
}

export function buildRemoteCheckInMessage(params: {
  userName: string | null
  checkedInAt: Date
}): string {
  const { userName, checkedInAt } = params
  return `🏠 ${displayName(userName)} さんが在宅勤務でチェックインしました (${formatTimeJST(checkedInAt)})`
}

export function buildCheckOutMessage(params: {
  userName: string | null
  checkedOutAt: Date
  isRemote: boolean
}): string {
  const { userName, checkedOutAt, isRemote } = params
  const suffix = isRemote ? " 🏠" : ""
  return `🚪 ${displayName(userName)} さんが退勤しました (${formatTimeJST(checkedOutAt)})${suffix}`
}
