"use client";

import type { ComparisonResult, ExplorationNode, ExplorationSynthesis } from "@/lib/types";
import { getCopy, type UiLanguage } from "@/lib/i18n";

function List({ items }: { items: string[] }) { return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>; }

export function ComparePicker({ nodes, selectedIds, uiLanguage, loading, error, onToggle, onSubmit, onClose, actionLabel, hint, exactCount = false, mode = "compare" }: { nodes: ExplorationNode[]; selectedIds: string[]; uiLanguage: UiLanguage; loading?: boolean; error?: string | null; onToggle: (nodeId: string) => void; onSubmit: () => void; onClose: () => void; actionLabel?: string; hint?: string; exactCount?: boolean; mode?: "compare" | "merge" }) {
  const copy = getCopy(uiLanguage);
  const title = mode === "merge" ? copy.merge : copy.compare;
  return <div className="convergence-overlay" role="dialog" aria-modal="true" aria-label={title}>
    <section className="convergence-panel">
      <div className="convergence-panel__header"><div><span className="convergence-eyebrow">{title}</span><p>{hint ?? (mode === "merge" ? copy.selectTwoBranches : copy.compareHint)}</p></div><button type="button" onClick={onClose} aria-label={copy.close}>×</button></div>
      <p className="convergence-panel__hint">{hint ?? copy.selectBranches}</p>
      <div className="compare-picker">{nodes.map((node) => <button type="button" key={node.id} className={selectedIds.includes(node.id) ? "is-selected" : ""} onClick={() => onToggle(node.id)}><span>{selectedIds.includes(node.id) ? "✓" : "○"}</span><strong>{node.title}</strong><small>{node.description}</small></button>)}</div>
      {error && <p className="exploration-error" role="alert">{error}</p>}
      <div className="convergence-panel__actions"><button type="button" onClick={onClose}>{copy.close}</button><button type="button" onClick={onSubmit} disabled={loading || (exactCount ? selectedIds.length !== 2 : selectedIds.length < 2)}>{loading ? "…" : actionLabel ?? copy.compare}</button></div>
    </section>
  </div>;
}

export function ComparisonPanel({ result, uiLanguage, onClose }: { result: ComparisonResult; uiLanguage: UiLanguage; onClose: () => void }) {
  const copy = getCopy(uiLanguage);
  return <div className="convergence-overlay" role="dialog" aria-modal="true" aria-label={copy.compare}><section className="convergence-panel convergence-panel--result"><div className="convergence-panel__header"><span className="convergence-eyebrow">{copy.compare}</span><button type="button" onClick={onClose} aria-label={copy.close}>×</button></div><div className="comparison-grid">{result.comparisons.map((item) => <article key={item.nodeId}><h3>{item.title}</h3><h4>{copy.strengths}</h4><List items={item.strengths} /><h4>{copy.weaknesses}</h4><List items={item.weaknesses} /><h4>{copy.risks}</h4><List items={item.risks} /><h4>{copy.assumptions}</h4><List items={item.assumptions} /></article>)}</div><Section title={copy.keyDifferences} items={result.keyDifferences} /><Section title={copy.tradeOffs} items={result.tradeOffs} /><Section title={copy.situations} items={result.situations} /></section></div>;
}

function Section({ title, items }: { title: string; items: string[] }) { return <section className="convergence-section"><h3>{title}</h3><List items={items} /></section>; }

export function SynthesisPanel({ synthesis, stale, uiLanguage, onClose, onOpenNode }: { synthesis: ExplorationSynthesis; stale?: boolean; uiLanguage: UiLanguage; onClose: () => void; onOpenNode?: (nodeId: string) => void }) {
  const copy = getCopy(uiLanguage);
  return <section className="synthesis-panel" aria-label={copy.synthesis}><div className="convergence-panel__header"><div><span className="convergence-eyebrow">{copy.synthesis}</span>{stale && <p className="synthesis-panel__stale">{copy.stale}</p>}</div><button type="button" onClick={onClose} aria-label={copy.close}>×</button></div><Section title={copy.whatWasExplored} items={[synthesis.whatWasExplored]} /><section className="convergence-section"><h3>{copy.strongestDirections}</h3><ul>{synthesis.strongestDirections.map((item) => <li key={`${item.nodeId ?? item.title}-${item.reason}`}>{item.nodeId && onOpenNode ? <button type="button" onClick={() => onOpenNode(item.nodeId!)}>{item.title}</button> : item.title} — {item.reason}</li>)}</ul></section><Section title={copy.tradeOffs} items={synthesis.keyTradeoffs} /><Section title={copy.importantAssumptions} items={synthesis.importantAssumptions} /><Section title={copy.risks} items={synthesis.risks} /><Section title={copy.openQuestions} items={synthesis.openQuestions} /><section className="synthesis-panel__recommendation"><h3>{copy.recommendation}</h3>{synthesis.recommendedDirection.nodeId && onOpenNode ? <button type="button" onClick={() => onOpenNode(synthesis.recommendedDirection.nodeId!)}>{synthesis.recommendedDirection.title}</button> : <strong>{synthesis.recommendedDirection.title}</strong>}<p>{synthesis.recommendedDirection.rationale}</p></section><Section title={copy.nextActions} items={synthesis.nextActions} /></section>;
}
