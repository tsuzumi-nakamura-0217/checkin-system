import { GoogleLinkedAccount } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { refreshGoogleAccessToken } from "@/lib/google-ai-auth"
import { truncateText } from "@/lib/ai-utils"

type CalendarEventSummary = {
  summary: string
  start: string
}

type DriveFileSummary = {
  name: string
  mimeType: string
  modifiedTime: string
  webViewLink: string | null
}

type GmailMessageSummary = {
  subject: string
  from: string
  date: string
  snippet: string
}

export type GoogleAccountServiceContext = {
  accountId: string
  email: string
  displayName: string | null
  calendarEvents: CalendarEventSummary[]
  driveFiles: DriveFileSummary[]
  gmailMessages: GmailMessageSummary[]
  warnings: string[]
}

const ACCESS_TOKEN_REFRESH_BUFFER_SECONDS = 60

function hasAccessTokenExpired(account: GoogleLinkedAccount): boolean {
  if (!account.accessToken) {
    return true
  }

  if (!account.expiresAt) {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  return account.expiresAt <= now + ACCESS_TOKEN_REFRESH_BUFFER_SECONDS
}

async function ensureValidAccessToken(account: GoogleLinkedAccount): Promise<string> {
  if (!hasAccessTokenExpired(account)) {
    return account.accessToken as string
  }

  const refreshed = await refreshGoogleAccessToken(account.refreshToken)

  if (!refreshed.access_token) {
    throw new Error("Google access token refresh failed")
  }

  const expiresAt = refreshed.expires_in
    ? Math.floor(Date.now() / 1000) + refreshed.expires_in
    : account.expiresAt

  await prisma.googleLinkedAccount.update({
    where: { id: account.id },
    data: {
      accessToken: refreshed.access_token,
      expiresAt,
      grantedScopes: refreshed.scope || account.grantedScopes,
      isActive: true,
    },
  })

  return refreshed.access_token
}

async function fetchCalendarEvents(accessToken: string): Promise<CalendarEventSummary[]> {
  const now = new Date().toISOString()
  const params = new URLSearchParams({
    maxResults: "5",
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: now,
  })

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Calendar API failed: ${res.status}`)
  }

  const data = (await res.json()) as {
    items?: Array<{
      summary?: string
      start?: { dateTime?: string; date?: string }
    }>
  }

  return (data.items || []).map((event) => ({
    summary: truncateText(event.summary || "(タイトルなし)", 80),
    start: event.start?.dateTime || event.start?.date || "",
  }))
}

async function fetchDriveFiles(accessToken: string): Promise<DriveFileSummary[]> {
  const params = new URLSearchParams({
    pageSize: "5",
    orderBy: "modifiedTime desc",
    fields: "files(name,mimeType,modifiedTime,webViewLink)",
    q: "trashed = false",
  })

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Drive API failed: ${res.status}`)
  }

  const data = (await res.json()) as {
    files?: Array<{
      name?: string
      mimeType?: string
      modifiedTime?: string
      webViewLink?: string
    }>
  }

  return (data.files || []).map((file) => ({
    name: truncateText(file.name || "(名前なし)", 80),
    mimeType: file.mimeType || "",
    modifiedTime: file.modifiedTime || "",
    webViewLink: file.webViewLink || null,
  }))
}

function readHeader(payload: { name: string; value: string }[], headerName: string): string {
  const found = payload.find((item) => item.name.toLowerCase() === headerName.toLowerCase())
  return found?.value || ""
}

async function fetchGmailMessages(accessToken: string): Promise<GmailMessageSummary[]> {
  const listParams = new URLSearchParams({
    maxResults: "5",
    q: "in:inbox newer_than:30d",
  })

  const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!listRes.ok) {
    throw new Error(`Gmail list API failed: ${listRes.status}`)
  }

  const listed = (await listRes.json()) as {
    messages?: Array<{ id: string }>
  }

  const messageIds = (listed.messages || []).map((message) => message.id).slice(0, 3)

  const detailed = await Promise.all(
    messageIds.map(async (id) => {
      const params = new URLSearchParams({
        format: "metadata",
        metadataHeaders: "Subject",
      })
      params.append("metadataHeaders", "From")
      params.append("metadataHeaders", "Date")

      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      )

      if (!res.ok) {
        return null
      }

      const message = (await res.json()) as {
        snippet?: string
        payload?: {
          headers?: Array<{ name: string; value: string }>
        }
      }

      const headers = message.payload?.headers || []

      return {
        subject: truncateText(readHeader(headers, "Subject") || "(件名なし)", 100),
        from: truncateText(readHeader(headers, "From") || "", 100),
        date: readHeader(headers, "Date") || "",
        snippet: truncateText(message.snippet || "", 120),
      }
    })
  )

  return detailed.filter((item): item is GmailMessageSummary => item !== null)
}

export async function buildGoogleAccountServiceContext(
  account: GoogleLinkedAccount
): Promise<GoogleAccountServiceContext> {
  const warnings: string[] = []

  let accessToken = ""

  try {
    accessToken = await ensureValidAccessToken(account)
  } catch {
    await prisma.googleLinkedAccount.update({
      where: { id: account.id },
      data: { isActive: false },
    })

    return {
      accountId: account.id,
      email: account.email,
      displayName: account.displayName,
      calendarEvents: [],
      driveFiles: [],
      gmailMessages: [],
      warnings: [
        `アカウント ${account.email} のトークン更新に失敗したため再認証が必要です。`,
      ],
    }
  }

  const [calendarResult, driveResult, gmailResult] = await Promise.allSettled([
    fetchCalendarEvents(accessToken),
    fetchDriveFiles(accessToken),
    fetchGmailMessages(accessToken),
  ])

  const calendarEvents = calendarResult.status === "fulfilled" ? calendarResult.value : []
  const driveFiles = driveResult.status === "fulfilled" ? driveResult.value : []
  const gmailMessages = gmailResult.status === "fulfilled" ? gmailResult.value : []

  if (calendarResult.status === "rejected") {
    warnings.push(`Calendar参照に失敗: ${account.email}`)
  }
  if (driveResult.status === "rejected") {
    warnings.push(`Drive参照に失敗: ${account.email}`)
  }
  if (gmailResult.status === "rejected") {
    warnings.push(`Gmail参照に失敗: ${account.email}`)
  }

  return {
    accountId: account.id,
    email: account.email,
    displayName: account.displayName,
    calendarEvents,
    driveFiles,
    gmailMessages,
    warnings,
  }
}
