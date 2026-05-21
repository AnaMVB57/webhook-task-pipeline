import { defineConfig } from "drizzle-kit";
import { config } from "./src/config"

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: config.db.url,
  },
});