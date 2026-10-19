import assert from "node:assert/strict";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { createSession, revokeSession } from "@/lib/auth";
import { AdminRequiredError, requireAdmin } from "@/lib/authorization";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

if (!process.env.DATABASE_URL) {
  const env = fs.readFileSync(".env.local", "utf8");
  const line = env.split(/\r?\n/).find((entry) => entry.startsWith("DATABASE_URL="));
  if (line) process.env.DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
}

async function main() {
  const db = getDb();
  const id = randomBytes(16).toString("hex");
  const email = `admin-access-${id}@example.invalid`;
  await db.insert(users).values({ id, email, emailVerifiedAt: new Date(), role: "user" });
  const session = await createSession(id);
  const request = () => new Request("http://localhost:3000/api/beta/waitlist", { headers: { Cookie: `xpansive-session=${session}` } });
  try {
    await assert.rejects(() => requireAdmin(request()), AdminRequiredError, "a normal user must not pass admin authorization");
    await db.update(users).set({ role: "admin" }).where(eq(users.id, id));
    const admin = await requireAdmin(request());
    assert.equal(admin.id, id, "an explicit admin role must pass server authorization");
    console.log("Administrative role authorization passed.");
  } finally {
    await revokeSession(session);
    await db.delete(users).where(eq(users.id, id));
  }
}

main().then(() => process.exit(0)).catch((error: unknown) => { console.error(error); process.exit(1); });
