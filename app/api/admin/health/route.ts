import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authorizationErrorResponse, requireAdmin } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "warning" | "error";

type HealthCheck = {
  status: CheckStatus;
  detail: string;
};

function configurationCheck(): HealthCheck {
  const production = process.env.NODE_ENV === "production";
  const appUrl = process.env.AUTH_APP_URL?.trim();
  const validAppUrl = Boolean(appUrl) && (!production || /^https:\/\//i.test(appUrl!));
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const required = [
    Boolean(process.env.DATABASE_URL?.trim()),
    validAppUrl,
    provider === "resend",
    Boolean(process.env.RESEND_API_KEY?.trim()),
    Boolean(process.env.AUTH_EMAIL_FROM?.trim()),
    Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
  ];

  return required.every(Boolean)
    ? { status: "ok", detail: "Variables obligatorias configuradas." }
    : { status: "error", detail: "Faltan variables obligatorias o la URL pública no es válida." };
}

function emailCheck(): HealthCheck {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const configured = provider === "resend"
    && Boolean(process.env.RESEND_API_KEY?.trim())
    && Boolean(process.env.AUTH_EMAIL_FROM?.trim())
    && Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());

  return configured
    ? { status: "ok", detail: "Resend está configurado; no se ha enviado ningún correo de prueba." }
    : { status: "error", detail: "La entrega transaccional o su webhook no están configurados." };
}

function overallStatus(checks: Record<string, HealthCheck>): CheckStatus {
  if (Object.values(checks).some((check) => check.status === "error")) return "error";
  if (Object.values(checks).some((check) => check.status === "warning")) return "warning";
  return "ok";
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    let database: HealthCheck;
    try {
      await getDb().execute(sql`select 1 from users limit 1`);
      database = { status: "ok", detail: "Conexión y esquema principal disponibles." };
    } catch {
      database = { status: "error", detail: "No se pudo conectar con la base de datos o falta el esquema." };
    }

    const checks = {
      application: { status: "ok" as const, detail: "La API administrativa está respondiendo." },
      database,
      configuration: configurationCheck(),
      email: emailCheck(),
      scheduler: { status: "warning" as const, detail: "El último Cron se verifica en Railway; la aplicación no recibe su resultado." },
    };

    return NextResponse.json({ status: overallStatus(checks), checkedAt: new Date().toISOString(), checks });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Unable to load health status." }, { status: 503 });
  }
}
