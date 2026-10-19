"use client";

import { useState } from "react";
import Link from "next/link";
import { CurrentConcept } from "@/components/exploration/current-concept";
import { ExplorationHistory } from "@/components/exploration/exploration-history";
import { Fork } from "@/components/exploration/fork";
import { MapView } from "@/components/exploration/map-view";
import { JourneySummaryPanel } from "@/components/journey-summary";
import { SynthesisPanel } from "@/components/exploration/convergence";
import { ForkButton } from "@/components/fork-button";
import { AccountMenu } from "@/components/account-menu";
import { getActiveChildren, getActivePath, getNode, setActiveNode } from "@/lib/exploration-tree";
import { getCopy, resolveUiLanguage } from "@/lib/i18n";
import { journeyCacheKey } from "@/lib/journey";
import type { ExplorationState } from "@/lib/types";

export function SharedExploration({ exploration }: { exploration: ExplorationState }) {
  const uiLanguage = resolveUiLanguage(exploration.language);
  const copy = getCopy(uiLanguage);
  const [state, setState] = useState(exploration);
  const [summaryOpen, setSummaryOpen] = useState(Boolean(state.journeySummary));
  const [synthesisOpen, setSynthesisOpen] = useState(false);
  const node = getNode(state, state.activeNodeId) ?? getNode(state, state.rootNodeId)!;
  const options = getActiveChildren(state).map(({ title, description }) => ({ title, description }));
  const activePath = getActivePath(state);
  const summaryKey = journeyCacheKey(state.initialIdea, activePath, state.language);
  const activeSummary = state.journeySummaryPathKey === summaryKey ? state.journeySummary : undefined;

  function openNode(nodeId: string) {
    setSummaryOpen(false);
    setState((current) => setActiveNode(current, nodeId));
  }

  return (
    <main className="min-h-screen px-6 py-7 sm:px-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-[0.22em]">XPANSIVE</Link>
        <div className="flex items-center gap-4"><span className="text-xs text-[var(--muted)]">{copy.sharedExploration} · {copy.readOnly}</span><ForkButton shareId={exploration.shareId} uiLanguage={uiLanguage} /><AccountMenu uiLanguage={uiLanguage} /></div>
      </header>
      <section className="exploration-layout">
        <ExplorationHistory nodes={state.nodes} activeNodeId={state.activeNodeId} uiLanguage={uiLanguage} onNavigate={openNode} />
        <div className="exploration-canvas">
          <p className="shared-root-prompt">{state.initialIdea}</p>
          <CurrentConcept concept={node.title} uiLanguage={uiLanguage} />
          {state.goal && <p className="shared-goal"><span>{copy.goal}:</span> {state.goal}</p>}
          {state.conclusionNodeId && <p className="shared-conclusion">{copy.conclusion}: {state.nodes[state.conclusionNodeId]?.title ?? state.conclusionNodeId}</p>}
          <Fork options={options} uiLanguage={uiLanguage} onSelect={(option) => {
            const child = getActiveChildren(state).find((candidate) => candidate.title === option.title && candidate.description === option.description);
            if (child) openNode(child.id);
          }} isOptionDisabled={(option) => !options.some((candidate) => candidate.title === option.title && candidate.description === option.description)} />
          {summaryOpen && activeSummary && <JourneySummaryPanel summary={activeSummary} uiLanguage={uiLanguage} onClose={() => setSummaryOpen(false)} />}
          {state.synthesis && <button type="button" className="journey-summary-trigger" onClick={() => setSynthesisOpen(true)}>{copy.synthesis}</button>}
          {state.shareId && node.id !== state.rootNodeId && <ForkButton shareId={state.shareId} nodeId={node.id} uiLanguage={uiLanguage} />}
        </div>
      </section>
      {synthesisOpen && state.synthesis && <div className="convergence-overlay"><SynthesisPanel synthesis={state.synthesis} stale={state.synthesisStale} uiLanguage={uiLanguage} onClose={() => setSynthesisOpen(false)} onOpenNode={openNode} /></div>}
      <section className="shared-map-section">
        <MapView state={state} activeNodeId={state.activeNodeId} uiLanguage={uiLanguage} onSelect={openNode} />
      </section>
    </main>
  );
}
