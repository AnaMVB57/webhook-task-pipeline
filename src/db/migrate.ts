import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { config } from "../config.js";

async function runMigrations() {
  console.log("[DB] Running migrations...");

  const client = postgres(config.db.url, { max: 1 });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./src/db/migrations" });

  console.log("[DB] Migrations completed successfully");
  await client.end();
}

runMigrations().catch((error) => {
  console.error("[DB] Migration failed:", error);
  process.exit(1);
});
