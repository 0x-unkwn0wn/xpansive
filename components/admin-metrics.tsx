"use client";

import { useEffect, useState } from "react";

type Metrics = {
  period: { from: string; to: string; timezone: string; retentionDays: number };
  definitions: Record<string, string>;
  metrics: Array<{ key: string; definition: string; numerator: number; denominator: number }>;
  events: Array<{ eventName: string; events: number; users: number; explorations: number }>;
  feedbackCount: number;
  sequences: Array<{ explorationRef: string; events: Array<{ eventName: string; outcome: string | null; actorType: string | null; occurredAt: string }> }>;
};

const labels: Record<string, string> = {
  beta_entry: "Entrada a beta",
  exploration_started: "Inicio de exploración",
  generation_requested: "Generación solicitada",
  generation_succeeded: "Generación exitosa",
  generation_failed: "Generación fallida",
  first_generation_success: "Primera generación",
  branch_selected: "Rama seleccionada",
  alternative_generation_succeeded: "Ramas adicionales",
  branch_discarded: "Rama descartada",
  steer_submitted: "Steer enviado",
  steer_generation_succeeded: "Steer exitoso",
  exploration_reopened: "Exploración reabierta",
  return_to_explore: "Regreso a explorar",
  export_completed: "Exportación completada",
  share: "Share creado",
  share_opened_by_recipient: "Share abierto por destinatario",
  fork: "Fork completado",
};

const metricLabels: Record<string, string> = {
  started_to_first_generation: "Inicio → primera generación",
  branch_selection_to_success: "Selección → generación exitosa",
  reopen_to_continue: "Reapertura → continuación",
  return_to_continue: "Regreso → continuación",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-ES", { timeZone: "UTC" });
}

export function AdminMetrics() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/admin/metrics", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("metrics_failed");
      setData(await response.json() as Metrics);
    }).catch(() => setError(true));
  }, []);

  return <section className="mx-auto max-w-[92rem] border-y border-[var(--line)] py-8">
    <div className="flex items-end justify-between gap-4">
      <div><p className="text-xs font-bold tracking-[0.2em] text-[var(--muted)]">RESULTADOS AGREGADOS</p><h2 className="mt-2 text-3xl font-medium tracking-[-0.04em]">Recorridos de beta.</h2></div>
      <p className="text-xs text-[var(--muted)]">Sin contenido de exploraciones</p>
    </div>
    {error ? <p className="mt-5 text-sm text-[var(--muted)]">No se han podido cargar los resultados.</p> : !data ? <p className="mt-5 text-sm text-[var(--muted)]">Cargando…</p> : <>
      <p className="mt-5 text-xs text-[var(--muted)]">Periodo: {formatDate(data.period.from)}–{formatDate(data.period.to)} UTC · retención configurada: {data.period.retentionDays} días.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-[var(--line)] p-4"><p className="text-[10px] font-bold tracking-[0.14em] text-[var(--muted)]">FEEDBACK RECIBIDO</p><p className="mt-3 text-3xl">{data.feedbackCount}</p></div>
        {data.metrics.map((metric) => <div key={metric.key} className="border border-[var(--line)] p-4" title={metric.definition}><p className="text-[10px] font-bold tracking-[0.14em] text-[var(--muted)]">{metricLabels[metric.key] ?? metric.key}</p><p className="mt-3 text-3xl">{metric.numerator} / {metric.denominator}</p><p className="mt-1 text-xs text-[var(--muted)]">numerador / denominador</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{metric.definition}</p></div>)}
        {data.events.map((event) => <div key={event.eventName} className="border border-[var(--line)] p-4" title={data.definitions[event.eventName]}><p className="text-[10px] font-bold tracking-[0.14em] text-[var(--muted)]">{labels[event.eventName] ?? event.eventName}</p><p className="mt-3 text-3xl">{event.users}</p><p className="mt-1 text-xs text-[var(--muted)]">usuarios · {event.events} eventos · {event.explorations} exploraciones</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{data.definitions[event.eventName]}</p></div>)}
      </div>
      <div className="mt-8 border-t border-[var(--line)] pt-6"><h3 className="text-sm font-bold tracking-[0.14em]">SECUENCIAS SIN CONTENIDO</h3><p className="mt-2 text-xs text-[var(--muted)]">Referencias efímeras por exploración, eventos técnicos y actor; no se muestran ideas, nodos ni respuestas.</p><div className="mt-4 space-y-3">{data.sequences.map((sequence) => <div key={sequence.explorationRef} className="border border-[var(--line)] p-4"><p className="text-xs font-bold">{sequence.explorationRef}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{sequence.events.map((event) => `${labels[event.eventName] ?? event.eventName} · ${event.outcome ?? ""}${event.actorType ? ` · ${event.actorType}` : ""} · ${formatDate(event.occurredAt)}`).join(" → ")}</p></div>)}</div></div>
    </>}
  </section>;
}
