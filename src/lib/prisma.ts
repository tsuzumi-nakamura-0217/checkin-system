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
  if (!isConfiguredTursoUrl(process.env.TURSO_DATABASE_URL)) {
    return false
  }

  // In development, default to local SQLite to keep prisma db push and runtime aligned.
  if (process.env.NODE_ENV !== "production") {
    return process.env.USE_TURSO_IN_DEV === "true"
  }

  return true
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
