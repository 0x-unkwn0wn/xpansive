import { NextRequest, NextResponse } from "next/server";
import { getProductAggregates } from "@/lib/product-events";
import { authorizationErrorResponse, requireAdmin } from "@/lib/authorization";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try { await requireAdmin(request); return NextResponse.json(await getProductAggregates()); }
  catch (error) { const authResponse = authorizationErrorResponse(error); if (authResponse) return authResponse; return NextResponse.json({ error: "Unable to load aggregate results." }, { status: 503 }); }
}
