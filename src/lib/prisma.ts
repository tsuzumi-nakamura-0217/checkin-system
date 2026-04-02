import { PrismaClient } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function isConfiguredTursoUrl(url: string | undefined): url is string {
  if (!url) return false
  if (!url.startsWith("libsql://")) return false
  if (url.includes("your-db-name-your-account.turso.io")) return false
  return true
}

function shouldUseTurso() {
  return isConfiguredTursoUrl(process.env.TURSO_DATABASE_URL)
}

function getTursoDatabaseUrl(): string {
  const databaseUrl = process.env.TURSO_DATABASE_URL
  if (!isConfiguredTursoUrl(databaseUrl)) {
    throw new Error("TURSO_DATABASE_URL is not configured")
  }
  return databaseUrl
}

function createPrismaClient() {
  if (!shouldUseTurso()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TURSO_DATABASE_URL must be configured in production")
    }
    // Local fallback for development when Turso credentials are not configured.
    return new PrismaClient()
  }

  const adapter = new PrismaLibSql({
    url: getTursoDatabaseUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
