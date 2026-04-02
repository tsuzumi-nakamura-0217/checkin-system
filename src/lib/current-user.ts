import { getServerSession } from "next-auth"

import { authOptions } from "@/auth"
import { prisma } from "@/lib/prisma"

type CurrentUser = {
  id: string
  name: string | null
  image: string | null
  mode: "auth" | "dev-bypass"
}

function isDevBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "true"
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions)

  if (session?.user?.id) {
    return {
      id: session.user.id,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      mode: "auth",
    }
  }

  if (session?.user?.email) {
    // セッションにemailはあるがidが含まれていない場合のフォールバック
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, image: true }
    })
    
    if (user) {
      return {
        id: user.id,
        name: user.name,
        image: user.image,
        mode: "auth",
      }
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
    },
  })

  return {
    id: user.id,
    name: user.name,
    image: user.image,
    mode: "dev-bypass",
  }
}
