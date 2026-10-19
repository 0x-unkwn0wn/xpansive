import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { safeNextPath } from "@/lib/auth-navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams;
  const nextPath = safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
  return <main className="flex min-h-screen flex-col px-6 py-7 sm:px-10"><header><Link href="/" className="text-sm font-bold tracking-[0.22em]">XPANSIVE</Link></header><section className="flex flex-1 flex-col items-center justify-center pb-24 text-center"><p className="mb-6 text-xs font-bold tracking-[0.2em] text-[var(--muted)]">PRIVATE BETA</p><h1 className="max-w-xl text-5xl font-medium leading-[0.96] tracking-[-0.06em] sm:text-7xl">Entra en tu espacio de exploración.</h1><p className="mt-7 mb-10 max-w-md text-sm leading-6 text-[var(--muted)]">Usaremos un enlace de acceso de un solo uso. Solo pueden entrar las personas invitadas a la beta.</p><LoginForm nextPath={nextPath} /></section><footer className="flex justify-between text-[10px] font-bold tracking-[0.18em] text-[var(--muted)]"><Link href="/">VOLVER A XPANSIVE</Link><Link href="/privacy">PRIVACIDAD</Link></footer></main>;
}
