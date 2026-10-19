import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { adminAuditLog, authMagicLinks, authRateLimits, authSessions, betaAccess, commercialPlans, explorations, explorationNodes, feedbackSubmissions, invitations, productEvents, users, waitlistEntries, waitlistRateLimits } from "@/lib/db/schema";

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  if (!database) {
    client = postgres(url, { max: 1, prepare: false });
    database = drizzle(client, { schema: { adminAuditLog, authMagicLinks, authRateLimits, authSessions, betaAccess, commercialPlans, explorations, explorationNodes, feedbackSubmissions, invitations, productEvents, users, waitlistEntries, waitlistRateLimits } });
  }
  return database;
}
