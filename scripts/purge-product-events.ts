import { lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { feedbackSubmissions, productEvents } from "@/lib/db/schema";
import { getProductEventsRetentionDays } from "@/lib/product-events";

const retentionDays = getProductEventsRetentionDays();
const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
const db = getDb();
const deletedEvents = await db.delete(productEvents).where(lt(productEvents.createdAt, cutoff)).returning({ id: productEvents.id });
const deletedFeedback = await db.delete(feedbackSubmissions).where(lt(feedbackSubmissions.createdAt, cutoff)).returning({ id: feedbackSubmissions.id });
console.log(`Purged ${deletedEvents.length} product events and ${deletedFeedback.length} feedback submissions older than ${retentionDays} days.`);
