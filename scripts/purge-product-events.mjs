import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

const parsedRetentionDays = Number.parseInt(process.env.PRODUCT_EVENTS_RETENTION_DAYS ?? "180", 10);
const retentionDays = Number.isFinite(parsedRetentionDays) && parsedRetentionDays > 0 ? parsedRetentionDays : 180;
const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  const result = await sql.begin(async (transaction) => {
    const deletedEvents = await transaction`DELETE FROM product_events WHERE created_at < ${cutoff} RETURNING id`;
    const deletedFeedback = await transaction`DELETE FROM feedback_submissions WHERE created_at < ${cutoff} RETURNING id`;
    return { events: deletedEvents.length, feedback: deletedFeedback.length };
  });

  console.log(`Purged ${result.events} product events and ${result.feedback} feedback submissions older than ${retentionDays} days.`);
} finally {
  await sql.end();
}
