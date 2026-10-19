import { NextRequest, NextResponse } from "next/server";
import { getAdminWaitlist } from "@/lib/admin";
import { authorizationErrorResponse, requireAdmin } from "@/lib/authorization";

export const runtime = "nodejs";

function dateParam(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const params = request.nextUrl.searchParams;
    const page = Math.min(10_000, Math.max(1, Number(params.get("page") ?? 1) || 1));
    const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize") ?? 25) || 25));
    const from = dateParam(params.get("from"));
    const to = dateParam(params.get("to"));
    if (from === null || to === null) return NextResponse.json({ error: "Invalid date filter." }, { status: 400 });
    if (to) to.setHours(23, 59, 59, 999);
    const status = params.get("status")?.trim() || undefined;
    if (status && !["pending", "invited", "joined"].includes(status)) return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
    const search = params.get("search")?.trim().slice(0, 100) || undefined;
    return NextResponse.json(await getAdminWaitlist({ page, pageSize, status, from: from ?? undefined, to: to ?? undefined, search }));
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Unable to load beta administration." }, { status: 503 });
  }
}
