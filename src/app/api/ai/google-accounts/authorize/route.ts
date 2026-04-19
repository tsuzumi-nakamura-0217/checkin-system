import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { buildGoogleAiAuthorizationUrl } from "@/lib/google-ai-auth"

const STATE_COOKIE_NAME = "ai_google_link_state"

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const state = crypto.randomUUID()
  const payload = Buffer.from(
    JSON.stringify({
      state,
      userId: currentUser.id,
      issuedAt: Date.now(),
    }),
    "utf8"
  ).toString("base64url")

  const cookieStore = await cookies()
  cookieStore.set({
    name: STATE_COOKIE_NAME,
    value: payload,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  })

  const authUrl = buildGoogleAiAuthorizationUrl({
    origin: req.nextUrl.origin,
    state,
  })

  return NextResponse.redirect(authUrl)
}
