export const GOOGLE_AI_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
] as const

type GoogleOAuthConfig = {
  clientId: string
  clientSecret: string
}

type GoogleTokenResponse = {
  access_token: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  token_type?: string
  id_token?: string
}

type GoogleUserInfo = {
  sub: string
  email?: string
  name?: string
  picture?: string
}

function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || ""
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || ""

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET is not configured")
  }

  return {
    clientId,
    clientSecret,
  }
}

export function getGoogleAiRedirectUri(origin: string): string {
  const explicit = process.env.GOOGLE_AI_REDIRECT_URI?.trim()

  if (explicit) {
    return explicit
  }

  return `${origin}/api/ai/google-accounts/callback`
}

export function buildGoogleAiAuthorizationUrl(params: { origin: string; state: string }): string {
  const { clientId } = getGoogleOAuthConfig()
  const redirectUri = getGoogleAiRedirectUri(params.origin)

  const search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    include_granted_scopes: "false",
    prompt: "consent select_account",
    scope: GOOGLE_AI_SCOPES.join(" "),
    state: params.state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${search.toString()}`
}

export async function exchangeGoogleAuthorizationCode(params: {
  code: string
  origin: string
}): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleOAuthConfig()
  const redirectUri = getGoogleAiRedirectUri(params.origin)

  const body = new URLSearchParams({
    code: params.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to exchange Google auth code: ${res.status} ${text}`)
  }

  return (await res.json()) as GoogleTokenResponse
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleOAuthConfig()

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  })

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to refresh Google access token: ${res.status} ${text}`)
  }

  return (await res.json()) as GoogleTokenResponse
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (res.ok) {
    return (await res.json()) as GoogleUserInfo
  }

  throw new Error("Failed to fetch Google user info")
}

export function parseGoogleIdToken(idToken: string): GoogleUserInfo | null {
  const chunks = idToken.split(".")

  if (chunks.length < 2) {
    return null
  }

  try {
    const payload = Buffer.from(chunks[1], "base64url").toString("utf8")
    const decoded = JSON.parse(payload) as GoogleUserInfo

    if (!decoded.sub) {
      return null
    }

    return decoded
  } catch {
    return null
  }
}
