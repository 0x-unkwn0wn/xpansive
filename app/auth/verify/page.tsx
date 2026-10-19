"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { safeNextPath } from "@/lib/auth-navigation";

export default function VerifyPage() {
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState("Confirma el enlace para entrar en tu espacio.");
  const [loading, setLoading] = useState(false);
  const [nextPath, setNextPath] = useState("/app");
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const hashToken = hashParams.get("token");
    const queryToken = queryParams.get("token");
    const value = hashToken || queryToken;
    setNextPath(safeNextPath(hashParams.get("next") ?? queryParams.get("next")));
    // React Strict Mode can run this effect twice in development. Do not
    // overwrite a token already captured after the first run removed it.
    if (!value) return;
    setToken(value);
    window.history.replaceState(null, "", "/auth/verify");
  }, []);
  async function accept() {
    if (!token) return setMessage("El enlace no es válido o ya no está disponible.");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (!response.ok) throw new Error("verify_failed");
      window.location.replace(nextPath);
    } catch { setMessage("El enlace no es válido, ha caducado o ya se ha utilizado."); setLoading(false); }
  }
  return <main className="flex min-h-screen flex-col px-6 py-7 sm:px-10"><header><Link href="/" className="text-sm font-bold tracking-[0.22em]">XPANSIVE</Link></header><section className="flex flex-1 flex-col items-center justify-center pb-24 text-center"><p className="mb-6 text-xs font-bold tracking-[0.2em] text-[var(--muted)]">PRIVATE BETA</p><h1 className="max-w-xl text-5xl font-medium leading-[0.96] tracking-[-0.06em] sm:text-7xl">Confirma tu acceso.</h1><p className="mt-7 mb-10 max-w-md text-sm leading-6 text-[var(--muted)]" role="status" aria-live="polite">{message}</p><button type="button" onClick={accept} disabled={loading || !token} className="min-h-14 rounded-full bg-[var(--ink)] px-8 py-3 text-sm font-bold tracking-[0.12em] text-black disabled:opacity-35">{loading ? "VERIFICANDO…" : "ENTRAR EN XPANSIVE"}</button></section><footer className="text-center text-[10px] font-bold tracking-[0.18em] text-[var(--muted)]"><Link href="/privacy">PRIVACIDAD</Link></footer></main>;
}
