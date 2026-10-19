"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Invitation = { id: string; expiresAt: string; acceptedAt: string | null; revokedAt: string | null; providerAcceptedAt: string | null; deliveryStatus: string; providerError: string | null; deliveredAt: string | null };
type Entry = { email: string; useCase: string | null; status: string; requestedAt: string; userId: string | null; accessStatus: string | null; activatedAt: string | null; invitation: Invitation | null };
type ResponseData = { page: number; pageSize: number; total: number; items: Entry[] };

function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"; }

export function AdminPanel() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [status, setStatus] = useState(""); const [search, setSearch] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [page, setPage] = useState(1); const [selected, setSelected] = useState<string[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const query = useMemo(() => new URLSearchParams({ page: String(page), pageSize: "25", ...(status ? { status } : {}), ...(search ? { search } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString(), [page, status, search, from, to]);
  const load = useCallback(async () => { setLoading(true); setError(""); try { const response = await fetch(`/api/beta/waitlist?${query}`, { cache: "no-store" }); if (!response.ok) throw new Error("load_failed"); setData(await response.json() as ResponseData); } catch { setError("No se han podido cargar los datos de la beta."); } finally { setLoading(false); } }, [query]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setSelected([]); }, [query]);

  async function sendBatch() {
    if (!selected.length || !window.confirm(`¿Enviar invitaciones a ${selected.length} personas? Las invitaciones ya activas no se duplicarán.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/beta/invitations/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails: selected }) });
      if (!response.ok) throw new Error("send_failed");
      const result = await response.json() as { results: Array<{ status: string }> };
      const sent = result.results.filter((item) => item.status === "sent").length; const skipped = result.results.filter((item) => item.status === "skipped").length;
      setMessage(`${sent} invitación(es) enviada(s); ${skipped} ya estaban activas o pendientes.`); setSelected([]); await load();
    } catch { setError("No se ha podido completar la tanda. Revisa el resultado y reintenta solo las pendientes."); } finally { setBusy(false); }
  }

  async function action(url: string, init: RequestInit, confirmation: string, success: string) {
    if (!window.confirm(confirmation)) return;
    setBusy(true); setError(""); setMessage("");
    try { const response = await fetch(url, init); if (!response.ok) throw new Error("action_failed"); setMessage(success); await load(); } catch { setError("No se ha podido completar la acción."); } finally { setBusy(false); }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return <main className="admin-panel min-h-screen px-5 py-7 sm:px-10">
    <header className="flex items-center justify-between border-b border-[var(--line)] pb-5"><Link href="/" className="text-sm font-bold tracking-[0.22em]">XPANSIVE</Link><Link href="/app" className="text-xs font-bold tracking-[0.16em] text-[var(--muted)]">VOLVER A LA APP</Link></header>
    <section className="mx-auto max-w-[92rem] py-12">
      <p className="text-xs font-bold tracking-[0.2em] text-[var(--muted)]">BETA ADMIN</p><div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h1 className="text-5xl font-medium tracking-[-0.06em] sm:text-7xl">Admisiones.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">Gestiona la waitlist y el acceso sin exponer tokens ni permisos al navegador.</p></div><button type="button" disabled={busy || !selected.length} onClick={sendBatch} className="min-h-12 rounded-full bg-[var(--ink)] px-6 text-xs font-bold tracking-[0.12em] text-black disabled:opacity-35">ENVIAR SELECCIONADAS ({selected.length})</button></div>
      <div className="mt-10 grid gap-3 border-y border-[var(--line)] py-5 md:grid-cols-5"><label className="text-xs text-[var(--muted)]">ESTADO<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="admin-filter-select mt-2 block w-full border border-[var(--line)] bg-transparent p-2 text-[var(--ink)]"><option value="">Todos</option><option value="pending">Pendientes</option><option value="invited">Invitados</option><option value="joined">Admitidos</option></select></label><label className="text-xs text-[var(--muted)] md:col-span-2">BUSCAR<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Email o caso de uso" className="mt-2 block w-full border border-[var(--line)] bg-transparent p-2 text-[var(--ink)]" /></label><label className="text-xs text-[var(--muted)]">DESDE<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="mt-2 block w-full border border-[var(--line)] bg-transparent p-2 text-[var(--ink)]" /></label><label className="text-xs text-[var(--muted)]">HASTA<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="mt-2 block w-full border border-[var(--line)] bg-transparent p-2 text-[var(--ink)]" /></label></div>
      <p className="min-h-6 py-3 text-sm text-[var(--muted)]" role="status" aria-live="polite">{error || message || (data ? `${data.total} entradas` : "")}</p>
      {loading ? <p className="py-12 text-sm text-[var(--muted)]">Cargando…</p> : <div className="overflow-x-auto border border-[var(--line)]"><table className="w-full min-w-[70rem] text-left text-sm"><thead className="border-b border-[var(--line)] text-[10px] font-bold tracking-[0.15em] text-[var(--muted)]"><tr><th className="p-4">SELEC.</th><th className="p-4">EMAIL</th><th className="p-4">CASO DE USO</th><th className="p-4">ESTADO</th><th className="p-4">INVITACIÓN / ENTREGA</th><th className="p-4">ACCIONES</th></tr></thead><tbody>{data?.items.map((entry) => {
        const invitation = entry.invitation; const checked = selected.includes(entry.email); const active = entry.accessStatus === "active";
        return <tr key={entry.email} className="border-b border-[var(--line)] align-top last:border-0"><td className="p-4"><input aria-label={`Seleccionar ${entry.email}`} type="checkbox" disabled={entry.status === "joined" || active} checked={checked} onChange={(event) => setSelected((current) => event.target.checked ? [...current, entry.email] : current.filter((email) => email !== entry.email))} /></td><td className="p-4 font-medium">{entry.email}<span className="mt-1 block text-xs text-[var(--muted)]">Solicitud: {formatDate(entry.requestedAt)}</span>{active && <span className="mt-1 block text-xs text-[var(--muted)]">Entrada: {formatDate(entry.activatedAt)}</span>}</td><td className="max-w-xs whitespace-pre-wrap p-4 text-xs leading-5 text-[var(--muted)]">{entry.useCase || "—"}</td><td className="p-4"><span className="rounded-full border border-[var(--line)] px-2 py-1 text-[10px] font-bold tracking-[0.12em]">{active ? "ACTIVE" : entry.status.toUpperCase()}</span></td><td className="p-4 text-xs leading-5 text-[var(--muted)]">{invitation ? <><span className="block text-[var(--ink)]">{invitation.deliveryStatus}</span><span className="block">Aceptada proveedor: {formatDate(invitation.providerAcceptedAt)}</span><span className="block">Entregada: {formatDate(invitation.deliveredAt)}</span><span className="block">Aceptada por usuario: {formatDate(invitation.acceptedAt)}</span><span className="block">Caduca: {formatDate(invitation.expiresAt)}</span>{invitation.providerError && <span className="block text-[#d5aaaa]">Error: {invitation.providerError}</span>}</> : "Sin invitación"}</td><td className="p-4"><div className="flex min-w-40 flex-col items-start gap-2 text-[10px] font-bold tracking-[0.1em]"><button type="button" disabled={busy || !invitation || active} onClick={() => invitation && action(`/api/beta/invitations/${invitation.id}/resend`, { method: "POST" }, "¿Crear una invitación nueva e invalidar la anterior?", "Invitación reenviada.")} className="underline disabled:opacity-30">REENVIAR</button><button type="button" disabled={busy || !invitation || Boolean(invitation.revokedAt || invitation.acceptedAt)} onClick={() => invitation && action(`/api/beta/invitations/${invitation.id}`, { method: "DELETE" }, "¿Revocar esta invitación?", "Invitación revocada.")} className="underline disabled:opacity-30">REVOCAR INVITACIÓN</button>{entry.userId && <button type="button" disabled={busy || entry.accessStatus === "revoked"} onClick={() => entry.userId && action(`/api/beta/access/${entry.userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "revoked" }) }, "¿Revocar el acceso a la beta? Las exploraciones no se eliminarán.", "Acceso revocado.")} className="text-[#d5aaaa] underline disabled:opacity-30">REVOCAR ACCESO</button>}</div></td></tr>;
      })}</tbody></table></div>}
      <div className="mt-5 flex items-center justify-between text-xs text-[var(--muted)]"><span>Página {page} de {totalPages}</span><div className="flex gap-3"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="underline disabled:opacity-30">ANTERIOR</button><button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)} className="underline disabled:opacity-30">SIGUIENTE</button></div></div>
    </section>
  </main>;
}
