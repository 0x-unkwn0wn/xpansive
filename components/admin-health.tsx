"use client";

import { useCallback, useEffect, useState } from "react";

type CheckStatus = "ok" | "warning" | "error";
type HealthCheck = { status: CheckStatus; detail: string };
type HealthData = { status: CheckStatus; checkedAt: string; checks: Record<string, HealthCheck> };

const labels: Record<string, string> = {
  application: "Aplicación",
  database: "Base de datos",
  configuration: "Configuración",
  email: "Email transaccional",
  scheduler: "Cron de retención",
};

const statusLabels: Record<CheckStatus, string> = {
  ok: "OK",
  warning: "REVISAR",
  error: "ERROR",
};

function statusClass(status: CheckStatus) {
  if (status === "ok") return "border-[#708a73] text-[#b5d5b8]";
  if (status === "warning") return "border-[#a99563] text-[#dfca8c]";
  return "border-[#a66d6d] text-[#e1aaaa]";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AdminHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [publicHealth, setPublicHealth] = useState<CheckStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [adminResponse, publicResponse] = await Promise.all([
        fetch("/api/admin/health", { cache: "no-store" }),
        fetch("/health", { cache: "no-store" }),
      ]);
      if (!adminResponse.ok || !publicResponse.ok) throw new Error("health_failed");
      const adminData = await adminResponse.json() as HealthData;
      const publicData = await publicResponse.json() as { status?: string };
      setHealth(adminData);
      setPublicHealth(publicData.status === "ok" ? "ok" : "error");
    } catch {
      setError(true);
      setPublicHealth("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const overall = health?.status ?? (error ? "error" : "warning");
  return <section className="mx-auto max-w-[92rem] border-y border-[var(--line)] py-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold tracking-[0.2em] text-[var(--muted)]">OPERACIONES</p><h2 className="mt-2 text-3xl font-medium tracking-[-0.04em]">Salud del sistema.</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--muted)]">Comprobación administrativa del endpoint público y de las dependencias necesarias para operar la beta.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="self-start text-xs font-bold tracking-[0.12em] underline disabled:opacity-40 sm:self-auto">{loading ? "COMPROBANDO…" : "ACTUALIZAR"}</button>
    </div>
    {loading && !health ? <p className="mt-6 text-sm text-[var(--muted)]">Comprobando…</p> : error && !health ? <p className="mt-6 text-sm text-[#e1aaaa]">No se pudo cargar el diagnóstico administrativo.</p> : <>
      <div className="mt-6 flex flex-wrap items-center gap-3"><span className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-[0.14em] ${statusClass(overall)}`}>ESTADO GENERAL: {statusLabels[overall]}</span><span className="text-xs text-[var(--muted)]">Endpoint público: <span className={publicHealth === "ok" ? "text-[#b5d5b8]" : "text-[#e1aaaa]"}>{publicHealth === "ok" ? "OK" : "ERROR"}</span></span>{health && <span className="text-xs text-[var(--muted)]">Última comprobación: {formatDate(health.checkedAt)}</span>}</div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{health && Object.entries(health.checks).map(([key, check]) => <div key={key} className="border border-[var(--line)] p-4"><div className="flex items-start justify-between gap-3"><p className="text-[10px] font-bold tracking-[0.14em] text-[var(--muted)]">{labels[key] ?? key}</p><span className={`rounded-full border px-2 py-1 text-[9px] font-bold tracking-[0.12em] ${statusClass(check.status)}`}>{statusLabels[check.status]}</span></div><p className="mt-4 text-xs leading-5 text-[var(--muted)]">{check.detail}</p></div>)}</div>
    </>}
  </section>;
}
