import { getGeminiApiKey, getGeminiModelName, truncateText } from "@/lib/ai-utils"
import { GoogleAccountServiceContext } from "@/lib/google-ai-services"

type GeminiPromptMessage = {
  role: "user" | "assistant"
  content: string
}

type GeminiGenerateParams = {
  history: GeminiPromptMessage[]
  userMessage: string
  contexts: GoogleAccountServiceContext[]
}

type GeminiGenerateResult = {
  text: string
  promptTokens: number
  outputTokens: number
}

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
  }
}

type GeminiApiErrorPayload = {
  error?: {
    message?: string
    details?: Array<{
      "@type"?: string
      retryDelay?: string
    }>
  }
}

export class GeminiApiError extends Error {
  status: number
  retryAfterSeconds?: number

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message)
    this.name = "GeminiApiError"
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function parseRetryAfterSeconds(payload: GeminiApiErrorPayload): number | undefined {
  const retryInfo = payload.error?.details?.find(
    (detail) => detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
  )

  if (!retryInfo?.retryDelay) {
    return undefined
  }

  const matched = retryInfo.retryDelay.match(/^(\d+)(?:\.\d+)?s$/)

  if (!matched) {
    return undefined
  }

  const seconds = Number.parseInt(matched[1], 10)
  return Number.isFinite(seconds) ? seconds : undefined
}

function formatGoogleContext(contexts: GoogleAccountServiceContext[]): string {
  if (contexts.length === 0) {
    return "Google service context is not available."
  }

  const blocks = contexts.map((context) => {
    const calendar = context.calendarEvents.length
      ? context.calendarEvents
          .map((event) => `- ${event.start}: ${event.summary}`)
          .join("\n")
      : "- No upcoming events"

    const drive = context.driveFiles.length
      ? context.driveFiles
          .map((file) => `- ${file.name} (${file.modifiedTime || "unknown"})`)
          .join("\n")
      : "- No recent files"

    const gmail = context.gmailMessages.length
      ? context.gmailMessages
          .map((message) => `- ${message.subject} | ${message.from}`)
          .join("\n")
      : "- No recent inbox messages"

    const warnings = context.warnings.length
      ? `Warnings:\n${context.warnings.map((item) => `- ${item}`).join("\n")}`
      : ""

    return [
      `Account: ${context.displayName || "(No name)"} <${context.email}>`,
      "Calendar:",
      calendar,
      "Drive:",
      drive,
      "Gmail:",
      gmail,
      warnings,
    ]
      .filter(Boolean)
      .join("\n")
  })

  return blocks.join("\n\n")
}

function toGeminiRole(role: GeminiPromptMessage["role"]): "user" | "model" {
  return role === "assistant" ? "model" : "user"
}

export async function generateGeminiResponse(params: GeminiGenerateParams): Promise<GeminiGenerateResult> {
  const model = getGeminiModelName()
  const apiKey = getGeminiApiKey()

  const contextText = formatGoogleContext(params.contexts)
  const history = params.history.slice(-8)

  const contents = [
    ...history.map((message) => ({
      role: toGeminiRole(message.role),
      parts: [{ text: truncateText(message.content, 2000) }],
    })),
    {
      role: "user" as const,
      parts: [
        {
          text: `User question:\n${params.userMessage}\n\nGoogle references:\n${contextText}`,
        },
      ],
    },
  ]

  const body = {
    systemInstruction: {
      parts: [
        {
          text: "You are a helpful assistant for Japanese users. Use the provided Google data as reference, and if data is missing state that clearly.",
        },
      ],
    },
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    let message = `Gemini API failed with status ${res.status}`
    let retryAfterSeconds: number | undefined

    try {
      const payload = JSON.parse(text) as GeminiApiErrorPayload
      message = truncateText(payload.error?.message || message, 500)
      retryAfterSeconds = parseRetryAfterSeconds(payload)
    } catch {
      if (text) {
        message = truncateText(text, 500)
      }
    }

    throw new GeminiApiError(message, res.status, retryAfterSeconds)
  }

  const data = (await res.json()) as GeminiApiResponse
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || ""

  if (!text) {
    throw new Error("Gemini returned an empty response")
  }

  return {
    text,
    promptTokens: data.usageMetadata?.promptTokenCount || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
  }
}
