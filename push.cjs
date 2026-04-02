const { createClient } = require("@libsql/client");
const fs = require("fs");

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
  
  const sql = fs.readFileSync("migration.sql", "utf8");
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