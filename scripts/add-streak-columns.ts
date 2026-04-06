import { prisma } from "../src/lib/prisma"

async function main() {
  console.log("Adding streak columns to User table...")

  try {
    // We use executeRawUnsafe to add columns if they don't exist
    // LibSQL / SQLite syntax
    const columns = [
      { name: "loginStreak", type: "INTEGER NOT NULL DEFAULT 0" },
      { name: "lastLoginDate", type: "DATETIME" },
      { name: "maxLoginStreak", type: "INTEGER NOT NULL DEFAULT 0" },
      { name: "checkInStreak", type: "INTEGER NOT NULL DEFAULT 0" },
      { name: "lastCheckInDate", type: "DATETIME" },
      { name: "maxCheckInStreak", type: "INTEGER NOT NULL DEFAULT 0" },
    ]

    for (const col of columns) {
      try {
        console.log(`Adding column ${col.name}...`)
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "${col.name}" ${col.type};`)
        console.log(`Column ${col.name} added successfully.`)
      } catch (err: any) {
        if (err.message?.includes("duplicate column name") || err.message?.includes("already exists")) {
          console.log(`Column ${col.name} already exists, skipping.`)
        } else {
          throw err
        }
      }
    }

    console.log("All columns processed.")
  } catch (error) {
    console.error("Migration failed:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
