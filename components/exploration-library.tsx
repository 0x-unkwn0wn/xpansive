"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCopy, type UiLanguage } from "@/lib/i18n";

type ExplorationSummary = { id: string; createdAt: string; updatedAt: string; isShared: boolean };

export function ExplorationLibrary({ uiLanguage }: { uiLanguage: UiLanguage }) {
  const copy = getCopy(uiLanguage);
  const [items, setItems] = useState<ExplorationSummary[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/explorations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("list_failed");
        return response.json() as Promise<{ explorations?: ExplorationSummary[] }>;
      })
      .then((data) => { if (!cancelled) setItems(Array.isArray(data.explorations) ? data.explorations : []); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  async function remove(item: ExplorationSummary) {
    if (!window.confirm(copy.deleteExplorationConfirm)) return;
    const response = await fetch(`/api/explorations/${item.id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((entry) => entry.id !== item.id));
    else setError(true);
  }

  if (error) return <p className="exploration-library__message" role="status">{copy.explorationListError}</p>;
  if (!items.length) return null;
  return <section className="exploration-library" aria-labelledby="saved-explorations-title">
    <div className="exploration-library__header"><span className="section-kicker" id="saved-explorations-title">{copy.myExplorations}</span></div>
    <ul>
      {items.map((item) => <li key={item.id}>
        <Link href={`/e/${item.id}`}><span>{new Date(item.updatedAt).toLocaleDateString(uiLanguage === "es" ? "es-ES" : "en-GB")}</span><strong>{item.id.slice(0, 8)}</strong></Link>
        <div><Link href={`/e/${item.id}`} className="exploration-library__open">{copy.openExploration}</Link><button type="button" onClick={() => void remove(item)}>{copy.deleteExploration}</button></div>
      </li>)}
    </ul>
  </section>;
}
