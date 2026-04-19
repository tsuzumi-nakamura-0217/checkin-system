import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleUserInfo,
  GOOGLE_AI_SCOPES,
  parseGoogleIdToken,
} from "@/lib/google-ai-auth"
import { prisma } from "@/lib/prisma"

const STATE_COOKIE_NAME = "ai_google_link_state"

function buildSettingsRedirect(req: NextRequest, status: string): NextResponse {
  const url = new URL("/dashboard/settings", req.url)
  url.searchParams.set("googleLink", status)
  return NextResponse.redirect(url)
}

function decodeStateCookie(value: string | undefined): { state: string; userId: string; issuedAt: number } | null {
  if (!value) {
    return null
  }

  try {
    const raw = Buffer.from(value, "base64url").toString("utf8")
    const parsed = JSON.parse(raw) as { state?: string; userId?: string; issuedAt?: number }

    if (!parsed.state || !parsed.userId || !parsed.issuedAt) {
      return null
    }

    return {
      state: parsed.state,
      userId: parsed.userId,
      issuedAt: parsed.issuedAt,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const state = req.nextUrl.searchParams.get("state")
  const code = req.nextUrl.searchParams.get("code")

  if (!state || !code) {
    return buildSettingsRedirect(req, "missing_params")
  }

  const cookieStore = await cookies()
  const stateCookie = decodeStateCookie(cookieStore.get(STATE_COOKIE_NAME)?.value)
  cookieStore.delete(STATE_COOKIE_NAME)

  if (!stateCookie) {
    return buildSettingsRedirect(req, "state_missing")
  }

  const stateAgeMs = Date.now() - stateCookie.issuedAt
  if (stateCookie.state !== state || stateCookie.userId !== currentUser.id || stateAgeMs > 10 * 60 * 1000) {
    return buildSettingsRedirect(req, "state_invalid")
  }

  try {
    const token = await exchangeGoogleAuthorizationCode({
      code,
      origin: req.nextUrl.origin,
    })

    const profileFromToken = token.id_token ? parseGoogleIdToken(token.id_token) : null

    let profile = profileFromToken
    try {
      profile = await fetchGoogleUserInfo(token.access_token)
    } catch {
      // Fallback to id_token payload when userinfo endpoint is unavailable.
    }

    if (!profile?.sub || !profile?.email) {
      return buildSettingsRedirect(req, "profile_missing")
    }

    const existing = await prisma.googleLinkedAccount.findUnique({
      where: {
        userId_googleSub: {
          userId: currentUser.id,
          googleSub: profile.sub,
        },
      },
      select: {
        id: true,
        refreshToken: true,
      },
    })

    const refreshToken = token.refresh_token || existing?.refreshToken

    if (!refreshToken) {
      return buildSettingsRedirect(req, "refresh_token_missing")
    }

    const expiresAt = token.expires_in
      ? Math.floor(Date.now() / 1000) + token.expires_in
      : null

    const linked = await prisma.googleLinkedAccount.upsert({
      where: {
        userId_googleSub: {
          userId: currentUser.id,
          googleSub: profile.sub,
        },
      },
      update: {
        email: profile.email,
        displayName: profile.name || null,
        avatarUrl: profile.picture || null,
        refreshToken,
        accessToken: token.access_token,
        expiresAt,
        grantedScopes: token.scope || GOOGLE_AI_SCOPES.join(" "),
        authorizedViaSettings: true,
        aiAuthorizedAt: new Date(),
        isActive: true,
      },
      create: {
        userId: currentUser.id,
        googleSub: profile.sub,
        email: profile.email,
        displayName: profile.name || null,
        avatarUrl: profile.picture || null,
        refreshToken,
        accessToken: token.access_token,
        expiresAt,
        grantedScopes: token.scope || GOOGLE_AI_SCOPES.join(" "),
        authorizedViaSettings: true,
        aiAuthorizedAt: new Date(),
        isActive: true,
      },
      select: {
        id: true,
      },
    })

    await prisma.userAiGoogleSelection.upsert({
      where: {
        userId_linkedAccountId: {
          userId: currentUser.id,
          linkedAccountId: linked.id,
        },
      },
      update: {},
      create: {
        userId: currentUser.id,
        linkedAccountId: linked.id,
      },
    })

    return buildSettingsRedirect(req, "success")
  } catch (error) {
    console.error("[AI_GOOGLE_CALLBACK]", error)
    return buildSettingsRedirect(req, "failed")
  }
}
