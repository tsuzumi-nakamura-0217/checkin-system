const { createClient } = require("@libsql/client");
const fs = require("fs");
const { execSync } = require("child_process");

function loadSql() {
  const migrationFile = "migration.sql";
  if (fs.existsSync(migrationFile)) {
    return fs.readFileSync(migrationFile, "utf8");
  }

  console.log("migration.sql not found. Generating SQL from prisma/schema.prisma...");
  const generated = execSync(
    "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
    { encoding: "utf8" }
  );
  fs.writeFileSync(migrationFile, generated, "utf8");
  console.log("Generated migration.sql");
  return generated;
}

async function main() {
  const env = fs.readFileSync(".env", "utf8");
  let url = "";
  let authToken = "";
  
  env.split("\n").forEach(line => {
    if (line.startsWith("TURSO_DATABASE_URL=")) url = line.replace("TURSO_DATABASE_URL=", "").replace(/"/g, "").trim();
    if (line.startsWith("TURSO_AUTH_TOKEN=")) authToken = line.replace("TURSO_AUTH_TOKEN=", "").replace(/"/g, "").trim();
  });
  
  if (!url || !url.startsWith("libsql://")) {
    console.error("❌ Error: TURSO_DATABASE_URL is missing or invalid in .env");
    return;
  }
  
  console.log("Connecting to Turso...");
  const db = createClient({ url, authToken });
  
  const sql = loadSql();
  const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0);
  
  console.log("Executing " + statements.length + " SQL statements...");
  for (let i = 0; i < statements.length; i++) {
    try {
      await db.execute(statements[i]);
    } catch (e) {
      if (e.message && e.message.includes("already exists")) {
        // Ignore Already Exists
      } else {
        console.error("Statement failed: " + statements[i]);
        console.error(e);
      }
    }
  }
  console.log("✅ Successfully created tables in Turso!");
}

main().catch(console.error);