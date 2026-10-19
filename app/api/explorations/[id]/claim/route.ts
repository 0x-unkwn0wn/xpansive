import { NextRequest, NextResponse } from "next/server";
import { authorizationErrorResponse, claimLegacyExploration } from "@/lib/authorization";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const result = await claimLegacyExploration(request, id);
    return NextResponse.json({ ok: true, id: result.record.row.id });
  } catch (error) {
    const response = authorizationErrorResponse(error);
    return response ?? NextResponse.json({ error: "Unable to claim this exploration." }, { status: 503 });
  }
}
