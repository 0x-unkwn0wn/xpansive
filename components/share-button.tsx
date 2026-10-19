"use client";

import { useEffect, useState } from "react";
import { getCopy, type UiLanguage } from "@/lib/i18n";
import type { ExplorationState } from "@/lib/types";

export function ShareButton({ exploration, uiLanguage, onShareChange }: { exploration: ExplorationState; uiLanguage: UiLanguage; onShareChange?: (value: { isShared: boolean; shareId?: string }) => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [shared, setShared] = useState(Boolean(exploration.isShared));
  const copy = getCopy(uiLanguage);
  const isPersisted = /^[a-f0-9]{32}$/.test(exploration.id);

  useEffect(() => {
    setShared(Boolean(exploration.isShared));
    setStatus("idle");
  }, [exploration.id, exploration.isShared]);

  async function toggleShare() {
    if (!isPersisted) return;
    setStatus("loading");
    try {
      if (shared) {
        const response = await fetch(`/api/explorations/${exploration.id}/share`, { method: "DELETE" });
        if (!response.ok) throw new Error("unshare failed");
        setShared(false);
        onShareChange?.({ isShared: false, shareId: undefined });
        setStatus("idle");
        return;
      }
      const response = await fetch(`/api/explorations/${exploration.id}/share`, { method: "POST" });
      const data = await response.json() as { url?: string; shareId?: string };
      if (!response.ok || !data.url || !data.shareId) throw new Error("share failed");
      setShared(true);
      onShareChange?.({ isShared: true, shareId: data.shareId });
      await navigator.clipboard?.writeText(`${window.location.origin}${data.url}`);
      setStatus("done");
    } catch { setStatus("error"); }
  }
  const unavailable = !isPersisted;
  return <button type="button" onClick={toggleShare} disabled={status === "loading" || unavailable} aria-label={status === "error" ? copy.sharingUnavailable : unavailable ? copy.saving : shared ? copy.stopSharing : copy.shareExploration} title={status === "error" ? copy.sharingUnavailable : unavailable ? copy.saving : undefined} className="header-action share-action" >{status === "done" ? copy.linkCopied : status === "loading" ? copy.saving : shared ? copy.stopSharing : copy.share}</button>;
}
