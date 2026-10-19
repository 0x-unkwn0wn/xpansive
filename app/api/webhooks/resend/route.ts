import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invitations } from "@/lib/db/schema";

export const runtime = "nodejs";

function verifySignature(payload: string, request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatures = request.headers.get("svix-signature")?.split(" ") ?? [];
  if (!secret || !id || !timestamp || !signatures.length) return false;
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() - timestampNumber * 1000) > 5 * 60 * 1000) return false;
  const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const signingSecret = Buffer.from(encodedSecret.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const expected = createHmac("sha256", signingSecret).update(`${id}.${timestamp}.${payload}`).digest("base64");
  return signatures.some((value) => {
    const [, candidate] = value.split(",");
    if (!candidate) return false;
    const expectedBuffer = Buffer.from(expected);
    const candidateBuffer = Buffer.from(candidate);
    return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
  });
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  if (!verifySignature(payload, request)) return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  try {
    const event = JSON.parse(payload) as { type?: string; data?: { email_id?: unknown } };
    const providerMessageId = event.data?.email_id;
    if (typeof providerMessageId !== "string") return NextResponse.json({ ok: true });
    const status = event.type === "email.delivered" ? "delivered" : event.type === "email.delivery_delayed" ? "delayed" : event.type === "email.bounced" ? "bounced" : event.type === "email.failed" || event.type === "email.suppressed" || event.type === "email.complained" ? "failed" : event.type === "email.sent" ? "accepted" : null;
    if (!status) return NextResponse.json({ ok: true });
    const db = getDb();
    const invitation = (await db.select({ id: invitations.id, deliveryStatus: invitations.deliveryStatus }).from(invitations).where(eq(invitations.providerMessageId, providerMessageId)).limit(1))[0];
    if (!invitation || (invitation.deliveryStatus === "delivered" && status !== "delivered")) return NextResponse.json({ ok: true });
    const now = new Date();
    await db.update(invitations).set({ deliveryStatus: status, deliveredAt: status === "delivered" ? now : undefined, providerError: status === "bounced" || status === "failed" ? event.type : null, deliveryUpdatedAt: now }).where(eq(invitations.id, invitation.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to process webhook." }, { status: 400 });
  }
}
