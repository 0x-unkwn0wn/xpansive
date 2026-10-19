import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Config } from "drizzle-kit";

function localDatabaseUrl() {
  for (const filename of [".env.local", ".env"]) {
    const filePath = path.join(process.cwd(), filename);
    if (!existsSync(filePath)) continue;
    const line = readFileSync(filePath, "utf8").split(/\r?\n/).find((value) => /^\s*DATABASE_URL\s*=/.test(value));
    const value = line?.replace(/^\s*DATABASE_URL\s*=\s*/, "").trim().replace(/^['\"]|['\"]$/g, "");
    if (value) return value;
  }
  return undefined;
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? localDatabaseUrl() ?? "postgresql://placeholder:placeholder@localhost:5432/xpansive",
  },
} satisfies Config;
