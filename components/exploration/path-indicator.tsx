"use client";

import { getActivePathNodes } from "@/lib/exploration-tree";
import { getCopy, type UiLanguage } from "@/lib/i18n";
import type { ExplorationState } from "@/lib/types";

export function PathIndicator({ state, activeNodeId, uiLanguage, onOpenMap }: { state: ExplorationState; activeNodeId: string; uiLanguage: UiLanguage; onOpenMap: () => void }) {
  const copy = getCopy(uiLanguage);
  const path = getActivePathNodes(state, activeNodeId);
  const visiblePath = path.length > 5 ? [path[0], ...path.slice(-3)] : path;
  const hasHiddenNodes = path.length > visiblePath.length;
  const pathLabel = path.map((node) => node.title).join(" → ");

  return (
    <button type="button" className="path-indicator" onClick={onOpenMap} aria-label={`${copy.openExplorationMap}: ${pathLabel}`}>
      <span className="path-indicator__track" aria-hidden="true">
        {visiblePath.map((node, index) => (
          <span className="path-indicator__step" key={node.id}>
            {index > 0 && <span className="path-indicator__line" />}
            {hasHiddenNodes && index === 1 && <span className="path-indicator__ellipsis">…</span>}
            <span className={`path-indicator__dot${node.id === activeNodeId ? " is-current" : ""}`} />
          </span>
        ))}
      </span>
      <span className="path-indicator__label">{copy.explorationPath}</span>
      <span className="path-indicator__action" aria-hidden="true">↗</span>
    </button>
  );
}
