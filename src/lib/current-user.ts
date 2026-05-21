import { getServerSession } from "next-auth"
import { cache } from "react"

import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"

type CurrentUser = {
  id: string
  name: string | null
  username: string | null
  image: string | null
  customImage: string | null
  mode: "auth" | "dev-bypass"
}

function isDevBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "true"
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getServerSession(authOptions)

  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { customImage: true, username: true },
    })
    return {
      id: session.user.id,
      name: session.user.name ?? null,
      username: dbUser?.username ?? null,
      image: session.user.image ?? null,
      customImage: dbUser?.customImage ?? null,
      mode: "auth",
    }
  }

  if (!isDevBypassEnabled()) {
    return null
  }

  const email = process.env.DEV_BYPASS_USER_EMAIL ?? "dev-user@example.com"
  const name = process.env.DEV_BYPASS_USER_NAME ?? "Dev User"

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      role: "USER",
    },
    select: {
      id: true,
      name: true,
      image: true,
      customImage: true,
      username: true,
    },
  })

  return {
    id: user.id,
    name: user.name,
    username: user.username ?? null,
    image: user.image,
    customImage: user.customImage ?? null,
    mode: "dev-bypass",
  }
})
