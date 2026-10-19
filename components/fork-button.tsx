"use client";

import { useState } from "react";
import { getCopy, type UiLanguage } from "@/lib/i18n";

export function ForkButton({ shareId, nodeId, explorationId, uiLanguage }: { shareId?: string; nodeId?: string; explorationId?: string; uiLanguage: UiLanguage }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const copy = getCopy(uiLanguage);

  async function fork() {
    if ((!shareId && !(explorationId && nodeId)) || loading) return;
    setLoading(true);
    setError(false);
    try {
      const endpoint = nodeId && shareId ? `/api/shared/${shareId}/fork/${encodeURIComponent(nodeId)}` : explorationId && nodeId ? `/api/explorations/${explorationId}/fork-node` : `/api/shared/${shareId}/fork`;
      const response = await fetch(endpoint, { method: "POST", headers: nodeId && explorationId ? { "x-xpansive-node-id": nodeId } : undefined });
      const data = await response.json() as { url?: string };
      if (!response.ok || !data.url) throw new Error("fork failed");
      window.location.assign(data.url);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (!shareId && !(explorationId && nodeId)) return null;
  return <span className="fork-action"><button type="button" onClick={() => void fork()} disabled={loading} className="text-xs font-bold tracking-[0.16em] text-[var(--muted)] transition hover:text-[var(--ink)] disabled:opacity-50">{loading ? copy.saving : copy.fork}</button>{error && <span className="fork-action__error" role="status">{copy.forkUnavailable}</span>}</span>;
}
