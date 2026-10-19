import { NextRequest, NextResponse } from "next/server";
import { revokeSession, sessionCookieName } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/authorization";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try { requireSameOrigin(request); } catch { return NextResponse.json({ error: "Invalid request origin." }, { status: 403 }); }
  await revokeSession(request.cookies.get(sessionCookieName)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
