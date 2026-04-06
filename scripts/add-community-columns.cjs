const fs = require("fs")
const path = require("path")
const { createClient } = require("@libsql/client")

function readEnvValue(envText, key) {
  const line = envText
    .split(/\r?\n/)
    .find((raw) => raw.trim().startsWith(`${key}=`))

  if (!line) return undefined

  const value = line.slice(line.indexOf("=") + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

async function addColumnIfMissing(client, table, column, definition) {
  const sql = `ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition};`
  try {
    await client.execute(sql)
    console.log(`Added ${table}.${column}`)
  } catch (error) {
    const message = String(error && error.message ? error.message : error)
    if (message.includes("duplicate column name") || message.includes("already exists")) {
      console.log(`Skipped ${table}.${column} (already exists)`)
      return
    }
    throw error
  }
}

async function main() {
  const envPath = path.resolve(process.cwd(), ".env")
  const envText = fs.readFileSync(envPath, "utf8")

  const url = process.env.TURSO_DATABASE_URL || readEnvValue(envText, "TURSO_DATABASE_URL")
  const authToken = process.env.TURSO_AUTH_TOKEN || readEnvValue(envText, "TURSO_AUTH_TOKEN")

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is missing")
  }

  const client = createClient({ url, authToken })

  await addColumnIfMissing(client, "CommunityGoal", "type", "TEXT NOT NULL DEFAULT 'POINTS'")
  await addColumnIfMissing(client, "CommunityContribution", "loginStreak", "INTEGER NOT NULL DEFAULT 0")
  await addColumnIfMissing(client, "CommunityContribution", "lastLoginDate", "DATETIME")
  await addColumnIfMissing(client, "CommunityContribution", "checkinStreak", "INTEGER NOT NULL DEFAULT 0")
  await addColumnIfMissing(client, "CommunityContribution", "lastCheckinDate", "DATETIME")

  if (typeof client.close === "function") {
    await client.close()
  }

  console.log("Community columns migration finished.")
}

main().catch((error) => {
  console.error("Migration failed:", error)
  process.exitCode = 1
})
