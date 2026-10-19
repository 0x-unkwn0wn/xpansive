"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCopy, type UiLanguage } from "@/lib/i18n";

const CLIENT_STATE_KEYS = ["xpansive:exploration:v1", "xpansive:exploration:v2", "xpansive:byok:v1"];

function clearClientState() {
  for (const key of CLIENT_STATE_KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
}

export function AccountMenu({ uiLanguage }: { uiLanguage: UiLanguage }) {
  const copy = getCopy(uiLanguage);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function logout() {
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout_failed");
      clearClientState();
      router.replace("/");
    } catch {
      setMessage(copy.accountActionFailed);
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (busy || !window.confirm(copy.deleteAccountConfirm)) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        setMessage(data.error ?? copy.accountActionFailed);
        setBusy(false);
        return;
      }
      clearClientState();
      router.replace("/");
    } catch {
      setMessage(copy.accountActionFailed);
      setBusy(false);
    }
  }

  return <div className="account-menu" aria-label="Account actions">
    <button type="button" className="header-action" onClick={() => void logout()} disabled={busy}>{copy.logout}</button>
    <button type="button" className="header-action account-menu__danger" onClick={() => void deleteAccount()} disabled={busy}>{copy.deleteAccount}</button>
    {message && <span className="account-menu__message" role="status">{message}</span>}
  </div>;
}
