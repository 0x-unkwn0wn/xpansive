import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

const parsedRetentionDays = Number.parseInt(process.env.PRODUCT_EVENTS_RETENTION_DAYS ?? "180", 10);
const retentionDays = Number.isFinite(parsedRetentionDays) && parsedRetentionDays > 0 ? parsedRetentionDays : 180;
const eventCutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
const authCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  const result = await sql.begin(async (transaction) => {
    const events = await transaction`DELETE FROM product_events WHERE created_at < ${eventCutoff} RETURNING id`;
    const feedback = await transaction`DELETE FROM feedback_submissions WHERE created_at < ${eventCutoff} RETURNING id`;
    const sessions = await transaction`DELETE FROM auth_sessions WHERE expires_at < now() RETURNING token_hash`;
    const links = await transaction`DELETE FROM auth_magic_links WHERE expires_at < now() OR used_at < ${authCutoff} RETURNING token_hash`;
    const authLimits = await transaction`DELETE FROM auth_rate_limits WHERE updated_at < ${authCutoff} RETURNING key`;
    const waitlistLimits = await transaction`DELETE FROM waitlist_rate_limits WHERE updated_at < ${authCutoff} RETURNING key`;
    return { events: events.length, feedback: feedback.length, sessions: sessions.length, links: links.length, authLimits: authLimits.length, waitlistLimits: waitlistLimits.length };
  });

  console.log(`Purged ${result.events} events, ${result.feedback} feedback rows, ${result.sessions} sessions, ${result.links} magic links and ${result.authLimits + result.waitlistLimits} rate-limit rows.`);
} finally {
  await sql.end();
}
