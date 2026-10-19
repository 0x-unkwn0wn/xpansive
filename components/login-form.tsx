"use client";

import { FormEvent, useState } from "react";

export function LoginForm({ nextPath = "/app" }: { nextPath?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/auth/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, next: nextPath }) });
      if (!response.ok) throw new Error("request_failed");
      setMessage("Si el email está invitado, recibirás un enlace de acceso.");
    } catch { setMessage("No hemos podido solicitar el enlace. Inténtalo de nuevo."); }
    finally { setLoading(false); }
  }

  return <form onSubmit={submit} className="w-full max-w-md text-left"><label htmlFor="login-email" className="mb-2 block text-xs font-bold tracking-[0.16em] text-[var(--muted)]">EMAIL</label><div className="flex flex-col gap-3 sm:flex-row"><input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-14 flex-1 rounded-full border border-[var(--line)] bg-transparent px-6 text-base outline-none focus:border-[var(--ink)]" placeholder="nombre@ejemplo.com" disabled={loading} /><button type="submit" disabled={loading} className="min-h-14 rounded-full bg-[var(--ink)] px-8 text-sm font-bold tracking-[0.12em] text-black disabled:opacity-35">{loading ? "ENVIANDO…" : "ENVIAR ENLACE"}</button></div><p className="mt-4 text-xs leading-5 text-[var(--muted)]" role="status" aria-live="polite">{message}</p></form>;
}
