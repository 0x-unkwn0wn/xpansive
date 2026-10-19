"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CurrentConcept } from "@/components/exploration/current-concept";
import { ExpansionLoader } from "@/components/exploration/expansion-loader";
import { ExplorationHistory } from "@/components/exploration/exploration-history";
import { Fork } from "@/components/exploration/fork";
import { MapView } from "@/components/exploration/map-view";
import { PathIndicator } from "@/components/exploration/path-indicator";
import { SteerControl } from "@/components/exploration/steer-control";
import { SuggestionHistory } from "@/components/exploration/suggestion-history";
import { ExplorationContextControl } from "@/components/exploration/exploration-context";
import { ComparePicker, ComparisonPanel, SynthesisPanel } from "@/components/exploration/convergence";
import { AISettings } from "@/components/ai-settings";
import { JourneySummaryPanel } from "@/components/journey-summary";
import { IdeaInput } from "@/components/idea-input";
import { ShareButton } from "@/components/share-button";
import { ForkButton } from "@/components/fork-button";
import { FeedbackForm } from "@/components/feedback-form";
import { AccountMenu } from "@/components/account-menu";
import { ExplorationLibrary } from "@/components/exploration-library";
import { getCopy, localizeError, resolveUiLanguage, type UiLanguage } from "@/lib/i18n";
import { addGeneratedOptions, addMergedNode, createExploration, discardNode, getActiveChildren, getActivePath, getExplorationExploredOptions, getExplorationNegativeOptions, getNode, getParentIds, hasGeneratedChildren, isAccessibleNode, markNodeError, parseExplorationState, replaceActiveSuggestionsWithSteer, restoreNode, restoreSuggestion, setActiveNode, setNodeConclusion, setNodeFavorite } from "@/lib/exploration-tree";
import { applyAlternativeBatch } from "@/lib/alternatives";
import { expansionCacheKey, journeyCacheKey } from "@/lib/journey";
import { validateSteer } from "@/lib/steer";
import { AIClientError, requestComparison, requestExpansion, requestMerge, requestSummary, requestSynthesis } from "@/lib/ai/client";
import { hasConfiguredApiKey, isByokRequiredError } from "@/lib/ai/credentials";
import type { AIProviderName, ComparisonResult, ConnectedAIProvider, ExpansionOption, ExplorationNode, ExplorationState, ExplorationSynthesis, ExplorationView, JourneySummary, LanguagePreference } from "@/lib/types";
import { buildExplorationContext, buildSelectedBranchContext } from "@/lib/ai/context";

const STORAGE_KEY = "xpansive:exploration:v2";
const LEGACY_STORAGE_KEY = "xpansive:exploration:v1";
const BYOK_STORAGE_KEY = "xpansive:byok:v1";

function clearStoredAIConnection() {
  try {
    window.sessionStorage.removeItem(BYOK_STORAGE_KEY);
  } catch {
    // Ignore storage restrictions; the in-memory connection is still cleared.
  }
}

function getAnonymousId() {
  const key = "xpansive:anonymous-id";
  let id = window.localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); window.localStorage.setItem(key, id); }
  return id;
}

function nodeOption(node: ExplorationNode): ExpansionOption {
  return { title: node.title, description: node.description };
}

function persistedNodePayload(node: ExplorationNode) {
  const persisted: Record<string, unknown> = { ...node };
  delete persisted.children;
  delete persisted.expansionCache;
  return persisted;
}

function persistedGenerationPayload(state: ExplorationState) {
  return Object.values(state.generations);
}

function nodeFingerprint(node: ExplorationNode) {
  return JSON.stringify(persistedNodePayload(node));
}

function isBackendExplorationId(id: string) {
  return /^[a-f0-9]{32}$/.test(id);
}

export function ExpansionView({ initialExplorationId }: { initialExplorationId?: string } = {}) {
  const [exploration, setExploration] = useState<ExplorationState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<ExplorationView>("explore");
  const [transitioningTitle, setTransitioningTitle] = useState<string | null>(null);
  const [loadingNode, setLoadingNode] = useState<string | null>(null);
  const [alternativeLoadingNode, setAlternativeLoadingNode] = useState<string | null>(null);
  const [steerLoadingNode, setSteerLoadingNode] = useState<string | null>(null);
  const [steerOpen, setSteerOpen] = useState(false);
  const [activeSteer, setActiveSteer] = useState("");
  const [steerError, setSteerError] = useState<string | null>(null);
  const [alternativeError, setAlternativeError] = useState<string | null>(null);
  const [discardUndo, setDiscardUndo] = useState<{ nodeId: string; childId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<ComparisonResult | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeIds, setMergeIds] = useState<string[]>([]);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [synthesisOpen, setSynthesisOpen] = useState(false);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguagePreference>("auto");
  const [byokConnections, setByokConnections] = useState<ConnectedAIProvider[]>([]);
  const [byokConnection, setByokConnection] = useState<ConnectedAIProvider | null>(null);
  const [activeAIProvider, setActiveAIProvider] = useState<AIProviderName | null>(null);
  const [anonymousId, setAnonymousId] = useState("anonymous");
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiSettingsError, setAiSettingsError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const summaryCache = useRef(new Map<string, JourneySummary>());
  const credentialsRef = useRef<ConnectedAIProvider | null>(null);
  const pendingAIAction = useRef<(() => void) | null>(null);
  const persistedNodes = useRef(new Map<string, string>());
  const remoteRevision = useRef<number | null>(null);
  const persistedCurrentNode = useRef<string | null>(null);
  const persistedSummaryKey = useRef<string | null>(null);
  const persistedSteer = useRef<string | null>(null);
  const persistedGoal = useRef<string | null>(null);
  const persistedConstraints = useRef<string>("[]");
  const persistedSynthesis = useRef<string>("");
  const discardUndoTimer = useRef<number | null>(null);
  const pendingRemoteState = useRef<ExplorationState | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      setAnonymousId(getAnonymousId());
      clearStoredAIConnection();
      let localState: ExplorationState | null = null;
      let loadedRemote = false;
      const saved = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        try { localState = parseExplorationState(JSON.parse(saved)); } catch { window.localStorage.removeItem(STORAGE_KEY); window.localStorage.removeItem(LEGACY_STORAGE_KEY); }
      }
      const remoteId = initialExplorationId ?? (localState && isBackendExplorationId(localState.id) ? localState.id : undefined);
      if (remoteId) {
        try {
          const response = await fetch(`/api/explorations/${remoteId}`, { cache: "no-store" });
          if (response.ok) {
            const data = await response.json() as { state?: unknown; revision?: number; isShared?: boolean; shareId?: string | null };
            const remoteState = data.state ? parseExplorationState(data.state) : null;
            if (!cancelled && remoteState) {
              const hydratedState = { ...remoteState, remoteRevision: data.revision ?? remoteState.remoteRevision ?? 0, isShared: data.isShared ?? remoteState.isShared, shareId: data.shareId ?? remoteState.shareId };
              setExploration(hydratedState);
              loadedRemote = true;
              setLanguage(hydratedState.language);
              setActiveSteer(hydratedState.steer ?? "");
              persistedNodes.current = new Map(Object.values(hydratedState.nodes).map((node) => [node.id, nodeFingerprint(node)]));
              remoteRevision.current = hydratedState.remoteRevision ?? 0;
              persistedCurrentNode.current = hydratedState.activeNodeId;
              persistedSummaryKey.current = hydratedState.journeySummaryPathKey ?? null;
              persistedSteer.current = hydratedState.steer ?? null;
              persistedGoal.current = hydratedState.goal ?? null;
              persistedConstraints.current = JSON.stringify(hydratedState.constraints);
              persistedSynthesis.current = JSON.stringify({ synthesis: hydratedState.synthesis ?? null, stale: hydratedState.synthesisStale ?? false });
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hydratedState));
            }
          } else if (isBackendExplorationId(remoteId)) {
            // Do not keep rendering a remote exploration that the current
            // session cannot access. This commonly happens after switching
            // accounts while the browser still has the previous local state.
            localState = null;
            window.localStorage.removeItem(STORAGE_KEY);
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
          }
        } catch { /* local state remains the offline fallback */ }
      }
      if (!cancelled && !loadedRemote && localState) {
        setExploration(localState);
        if (localState) setLanguage(localState.language);
        if (localState) setActiveSteer(localState.steer ?? "");
        // A client-only legacy state has no server-side edit proof. Keep it local;
        // never assign it to the signed-in user merely because it is in localStorage.
      }
      if (!cancelled) setHydrated(true);
    }
    void hydrate();
    return () => { cancelled = true; };
  }, [initialExplorationId]);

  useEffect(() => {
    if (hydrated && exploration) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exploration));
  }, [exploration, hydrated]);

  const uiLanguage = resolveUiLanguage(exploration?.language ?? language);
  const copy = getCopy(uiLanguage);
  const aiMode = byokConnection ? "byok" : "connect";
  const activeNode = exploration ? getNode(exploration, exploration.activeNodeId) : undefined;
  const activeOptions = exploration ? getActiveChildren(exploration).map(nodeOption) : [];
  const activePath = exploration ? getActivePath(exploration) : [];
  const activePathKey = exploration ? journeyCacheKey(exploration.initialIdea, activePath, exploration.language) : "";
  const activeSummary = activePathKey && exploration?.journeySummaryPathKey === activePathKey ? exploration.journeySummary : undefined;
  const visibleSummary = activeSummary ?? (activePathKey ? summaryCache.current.get(activePathKey) : undefined);
  const canSummarize = activePath.length >= 3;

  async function createRemoteExploration(state: ExplorationState): Promise<ExplorationState | null> {
    setSaveState("saving");
    pendingRemoteState.current = state;
    try {
      const stateForCreation = {
        ...state,
        nodes: Object.fromEntries(Object.entries(state.nodes).map(([id, node]) => [id, { ...node, expansionCache: {} }])),
      };
      const response = await fetch("/api/explorations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initialIdea: state.initialIdea, language: state.language, goal: state.goal, constraints: state.constraints, state: stateForCreation }) });
      const data = await response.json() as { id?: string };
      if (!response.ok || !data.id) throw new Error("create failed");
      remoteRevision.current = 0;
      persistedNodes.current.clear();
      persistedCurrentNode.current = null;
      persistedSummaryKey.current = null;
      persistedSteer.current = null;
      persistedGoal.current = null;
      persistedConstraints.current = "[]";
      persistedSynthesis.current = "";
      const remoteState = { ...state, id: data.id!, remoteRevision: 0 };
      setExploration((current) => current ? { ...current, id: data.id!, remoteRevision: 0 } : current);
      window.history.replaceState({}, "", `/e/${data.id}`);
      setSaveState("saved");
      pendingRemoteState.current = null;
      return remoteState;
    } catch {
      setSaveState("error");
      return null;
    }
  }

  function retrySave() {
    if (pendingRemoteState.current) {
      void createRemoteExploration(exploration ?? pendingRemoteState.current);
      return;
    }
    setExploration((current) => current ? { ...current } : current);
  }

  function recordExplorationEvent(eventName: "branch_selected" | "branch_discarded" | "steer_submitted" | "branch_favorited" | "constraint_added" | "exploration_goal_set" | "manual_branch_added" | "compare_completed" | "merge_completed" | "conclusion_marked" | "conclusion_changed" | "conclusion_removed" | "exploration_resolved") {
    if (!exploration || !isBackendExplorationId(exploration.id)) return;
    void fetch(`/api/explorations/${exploration.id}/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventName, operationId: crypto.randomUUID() }) }).catch(() => undefined);
  }

  useEffect(() => {
    if (!hydrated || !exploration || !isBackendExplorationId(exploration.id)) return;
    const timer = window.setTimeout(async () => {
      const dirtyNodes = Object.values(exploration.nodes).filter((node) => persistedNodes.current.get(node.id) !== nodeFingerprint(node)).map(persistedNodePayload);
      const revision = remoteRevision.current ?? exploration.remoteRevision ?? 0;
      const summaryChanged = (exploration.journeySummaryPathKey ?? null) !== persistedSummaryKey.current;
      const steerChanged = (exploration.steer ?? null) !== persistedSteer.current;
      const goalChanged = (exploration.goal ?? null) !== persistedGoal.current;
      const constraintsChanged = JSON.stringify(exploration.constraints) !== persistedConstraints.current;
      const currentChanged = exploration.activeNodeId !== persistedCurrentNode.current;
      const synthesisChanged = JSON.stringify({ synthesis: exploration.synthesis ?? null, stale: exploration.synthesisStale ?? false }) !== persistedSynthesis.current;
      if (!dirtyNodes.length && !summaryChanged && !steerChanged && !goalChanged && !constraintsChanged && !currentChanged && !synthesisChanged) return;
      setSaveState("saving");
      try {
        const response = await fetch(`/api/explorations/${exploration.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision, currentNodeId: exploration.activeNodeId, nodes: dirtyNodes, generations: persistedGenerationPayload(exploration), goal: exploration.goal ?? null, constraints: exploration.constraints, summary: exploration.summary ?? null, conclusionNodeId: exploration.conclusionNodeId ?? null, resolutionStatus: exploration.resolutionStatus, resolvedAt: exploration.resolvedAt ?? null, synthesis: exploration.synthesis ?? null, synthesisStale: exploration.synthesisStale ?? false, journeySummary: exploration.journeySummary ?? null, journeySummaryPathKey: exploration.journeySummaryPathKey ?? null, steer: exploration.steer ?? null }) });
        if (response.status === 409) {
          const latest = await fetch(`/api/explorations/${exploration.id}`, { cache: "no-store" });
          if (latest.ok) {
            const data = await latest.json() as { state?: unknown; revision?: number; isShared?: boolean; shareId?: string | null };
            const latestState = data.state ? parseExplorationState(data.state) : null;
            if (latestState) {
              const latestRevision = data.revision ?? latestState.remoteRevision ?? 0;
              remoteRevision.current = latestRevision;
              const retry = await fetch(`/api/explorations/${exploration.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: latestRevision, currentNodeId: exploration.activeNodeId, nodes: dirtyNodes, generations: persistedGenerationPayload(exploration), goal: exploration.goal ?? null, constraints: exploration.constraints, summary: exploration.summary ?? null, conclusionNodeId: exploration.conclusionNodeId ?? null, resolutionStatus: exploration.resolutionStatus, resolvedAt: exploration.resolvedAt ?? null, synthesis: exploration.synthesis ?? null, synthesisStale: exploration.synthesisStale ?? false, journeySummary: exploration.journeySummary ?? null, journeySummaryPathKey: exploration.journeySummaryPathKey ?? null, steer: exploration.steer ?? null }) });
              if (retry.ok) {
                const retryData = await retry.json() as { revision?: number };
                remoteRevision.current = retryData.revision ?? latestRevision + 1;
                for (const node of Object.values(exploration.nodes)) persistedNodes.current.set(node.id, nodeFingerprint(node));
                persistedCurrentNode.current = exploration.activeNodeId;
                persistedSummaryKey.current = exploration.journeySummaryPathKey ?? null;
                persistedSteer.current = exploration.steer ?? null;
                persistedGoal.current = exploration.goal ?? null;
                persistedConstraints.current = JSON.stringify(exploration.constraints);
                persistedSynthesis.current = JSON.stringify({ synthesis: exploration.synthesis ?? null, stale: exploration.synthesisStale ?? false });
                setSaveState("saved");
                return;
              }
            }
          }
          setSaveState("error");
          return;
        }
        if (!response.ok) throw new Error("save failed");
        const data = await response.json() as { revision?: number };
        remoteRevision.current = data.revision ?? revision + 1;
        for (const node of Object.values(exploration.nodes)) persistedNodes.current.set(node.id, nodeFingerprint(node));
        persistedCurrentNode.current = exploration.activeNodeId;
        persistedSummaryKey.current = exploration.journeySummaryPathKey ?? null;
        persistedSteer.current = exploration.steer ?? null;
        persistedGoal.current = exploration.goal ?? null;
        persistedConstraints.current = JSON.stringify(exploration.constraints);
        persistedSynthesis.current = JSON.stringify({ synthesis: exploration.synthesis ?? null, stale: exploration.synthesisStale ?? false });
        setSaveState("saved");
      } catch { setSaveState("error"); }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [exploration, hydrated]);

  useEffect(() => {
    document.documentElement.lang = uiLanguage;
    document.title = copy.pageTitle;
  }, [copy.pageTitle, uiLanguage]);

  const aiConfig = useCallback(() => {
    const connection = credentialsRef.current;
    return { provider: connection?.provider ?? "openai", model: connection?.model ?? "", apiKey: connection?.apiKey ?? "", anonymousId };
  }, [anonymousId]);

  function openAIOnboarding(action?: () => void) {
    if (action) pendingAIAction.current = action;
    setAiSettingsError(null);
    setAiSettingsOpen(true);
  }

  function closeAISettings() {
    pendingAIAction.current = null;
    setAiSettingsError(null);
    setAiSettingsOpen(false);
  }

  const generate = useCallback(async (state: ExplorationState, nodeId: string) => {
    const node = getNode(state, nodeId);
    const hasActiveSuggestions = getActiveChildren(state, nodeId).length > 0;
    if (!node || hasActiveSuggestions || loadingNode || alternativeLoadingNode || steerLoadingNode) return;
    if (!hasConfiguredApiKey(credentialsRef.current)) {
      openAIOnboarding(() => void generate(state, nodeId));
      return;
    }
    setLoadingNode(nodeId);
      setError(null);
    try {
      const path = getActivePath(state, nodeId);
      const negativeMemory = getExplorationNegativeOptions(state);
      const previous = getExplorationExploredOptions(state).map((item) => item.title);
      const cacheKey = expansionCacheKey(state.initialIdea, path, negativeMemory, state.language);
      const cached = node.expansionCache[cacheKey];
      if (cached && hasActiveSuggestions) {
        setExploration((current) => {
          const currentNode = current?.nodes[nodeId];
          return current && currentNode === node ? addGeneratedOptions(current, nodeId, cached, cacheKey) : current;
        });
        return;
      }
      const response = await requestExpansion({ initialIdea: state.initialIdea, path, current: node.title, language: state.language, previouslyExplored: [...new Set(previous)], rejectedOptions: negativeMemory, context: buildExplorationContext(state, nodeId), explorationId: isBackendExplorationId(state.id) ? state.id : undefined }, aiConfig());
      const result = response.result;
      setExploration((current) => {
        const currentNode = current?.nodes[nodeId];
        return current && currentNode === node ? addGeneratedOptions(current, nodeId, result.options, cacheKey) : current;
      });
    } catch (cause) {
      if (isByokRequiredError(cause)) {
        openAIOnboarding(() => void generate(state, nodeId));
        return;
      }
      if (cause instanceof AIClientError && cause.code === "AUTHENTICATION_FAILED") { setAiSettingsError(copy.invalidApiKey); setAiSettingsOpen(true); }
      const message = localizeError(cause instanceof Error ? cause.message : "Unable to expand this idea.", resolveUiLanguage(state.language));
      setError(message);
      setExploration((current) => current?.nodes[nodeId] === node ? markNodeError(current, nodeId, message) : current);
    } finally {
      setLoadingNode(null);
    }
  }, [aiConfig, alternativeLoadingNode, copy.invalidApiKey, loadingNode, steerLoadingNode]);

  function resetTransientUi() {
    setSummaryOpen(false); setSummaryError(null); setAlternativeError(null); setSteerOpen(false); setActiveSteer(""); setSteerError(null); setError(null); setDiscardUndo(null); setCompareOpen(false); setCompareResult(null); setCompareError(null); setMergeOpen(false); setMergeIds([]); setMergeError(null); setSynthesisOpen(false); setSynthesisError(null);
  }

  async function connectOwnAI(connection: ConnectedAIProvider) {
    const nextConnections = [...byokConnections.filter((item) => item.provider !== connection.provider), connection];
    credentialsRef.current = connection;
    setByokConnections(nextConnections);
    setByokConnection(connection);
    setActiveAIProvider(connection.provider);
    setAiSettingsError(null);
    setAiSettingsOpen(false);
    const action = pendingAIAction.current;
    pendingAIAction.current = null;
    action?.();
  }

  function selectOwnAI(provider: AIProviderName) {
    const connection = byokConnections.find((item) => item.provider === provider);
    if (!connection) return;
    credentialsRef.current = connection;
    setByokConnection(connection);
    setActiveAIProvider(provider);
    setAiSettingsError(null);
  }

  function disconnectOwnAI(provider: AIProviderName) {
    const remaining = byokConnections.filter((item) => item.provider !== provider);
    const next = activeAIProvider === provider ? (remaining[0] ?? null) : (remaining.find((item) => item.provider === activeAIProvider) ?? remaining[0] ?? null);
    credentialsRef.current = next;
    setByokConnections(remaining);
    setByokConnection(next);
    setActiveAIProvider(next?.provider ?? null);
    clearStoredAIConnection();
    setAiSettingsError(null);
  }

  function start(idea: string, goal?: string, constraints: string[] = []) {
    const state = createExploration(idea, language);
    state.goal = goal;
    state.constraints = constraints;
    resetTransientUi();
    setView("explore");
    setExploration(state);
    void createRemoteExploration(state);
    void generate(state, state.rootNodeId);
  }

  function openNode(nodeId: string) {
    if (!exploration || loadingNode || alternativeLoadingNode || steerLoadingNode) return;
    const node = getNode(exploration, nodeId);
    if (!isAccessibleNode(node)) return;
    const next = setActiveNode(exploration, nodeId);
    resetTransientUi();
    setTransitioningTitle(null);
    setView("explore");
    setExploration(next);
    if (!hasGeneratedChildren(next, nodeId)) void generate(next, nodeId);
  }

  function select(option: ExpansionOption) {
    const child = exploration && getActiveChildren(exploration).find((node) => node.title === option.title && node.description === option.description);
    if (!child || transitioningTitle) return;
    recordExplorationEvent("branch_selected");
    setTransitioningTitle(option.title);
    window.setTimeout(() => openNode(child.id), 240);
  }

  function discardOption(option: ExpansionOption) {
    if (!exploration || !activeNode) return;
    const child = getActiveChildren(exploration, activeNode.id).find((node) => node.title === option.title && node.description === option.description);
    if (!child) return;
    recordExplorationEvent("branch_discarded");
    if (discardUndoTimer.current) window.clearTimeout(discardUndoTimer.current);
    setExploration((current) => current ? discardNode(current, child.id) : current);
    setDiscardUndo({ nodeId: activeNode.id, childId: child.id });
    discardUndoTimer.current = window.setTimeout(() => setDiscardUndo(null), 6_000);
  }

  function updateOptionState(option: ExpansionOption, kind: "favorite" | "conclusion") {
    if (!exploration || !activeNode) return;
    const child = getActiveChildren(exploration, activeNode.id).find((node) => node.title === option.title && node.description === option.description);
    if (!child) return;
    const marking = child.state !== "conclusion";
    const previousConclusion = exploration.conclusionNodeId;
    setExploration((current) => current ? kind === "favorite" ? setNodeFavorite(current, child.id, child.state !== "favorite") : setNodeConclusion(current, child.id, marking) : current);
    if (kind === "favorite") recordExplorationEvent("branch_favorited");
    if (kind === "conclusion") {
      recordExplorationEvent(marking ? previousConclusion && previousConclusion !== child.id ? "conclusion_changed" : "conclusion_marked" : "conclusion_removed");
      if (marking) recordExplorationEvent("exploration_resolved");
    }
  }

  function markActiveNodeAsConclusion() {
    if (!exploration || !activeNode) return;
    const marking = exploration.conclusionNodeId !== activeNode.id;
    const changed = Boolean(exploration.conclusionNodeId) && exploration.conclusionNodeId !== activeNode.id;
    setExploration(setNodeConclusion(exploration, activeNode.id, marking));
    recordExplorationEvent(marking ? changed ? "conclusion_changed" : "conclusion_marked" : "conclusion_removed");
    if (marking) recordExplorationEvent("exploration_resolved");
  }

  function openCompare() {
    if (!exploration) return;
    setCompareIds([]); setCompareResult(null); setCompareError(null); setCompareOpen(true);
  }

  async function runCompare() {
    if (!exploration || compareIds.length < 2 || compareIds.length > 3 || !isBackendExplorationId(exploration.id)) return;
    if (!hasConfiguredApiKey(credentialsRef.current)) { openAIOnboarding(() => void runCompare()); return; }
    setCompareLoading(true); setCompareError(null);
    try {
      const selectedNodes = buildSelectedBranchContext(exploration, compareIds);
      const response = await requestComparison({ explorationId: exploration.id, nodeIds: compareIds, selectedNodes }, aiConfig());
      setCompareResult(response.result);
    } catch (cause) {
      if (isByokRequiredError(cause)) { openAIOnboarding(() => void runCompare()); return; }
      setCompareError(localizeError(cause instanceof Error ? cause.message : "Unable to compare these branches.", uiLanguage));
    } finally { setCompareLoading(false); }
  }

  function openMerge() {
    setMergeIds([]); setMergeError(null); setMergeOpen(true);
  }

  async function runMerge() {
    if (!exploration || mergeIds.length !== 2) return;
    if (Object.values(exploration.nodes).some((node) => node.origin === "merge" && getParentIds(node).length === 2 && getParentIds(node).every((parentId) => mergeIds.includes(parentId)))) { setMergeError(copy.mergeAlreadyExists); return; }
    if (!hasConfiguredApiKey(credentialsRef.current)) { openAIOnboarding(() => void runMerge()); return; }
    setMergeLoading(true); setMergeError(null);
    try {
      const remoteState = isBackendExplorationId(exploration.id) ? exploration : await createRemoteExploration(exploration);
      if (!remoteState) { setMergeError(copy.savingFailed); return; }
      const response = await requestMerge({ explorationId: remoteState.id, nodeIds: mergeIds }, aiConfig());
      setExploration((current) => current ? addMergedNode(current, mergeIds, response.result) : current);
      setMergeOpen(false); setMergeIds([]);
    } catch (cause) {
      if (isByokRequiredError(cause)) { openAIOnboarding(() => void runMerge()); return; }
      setMergeError(localizeError(cause instanceof Error ? cause.message : "Unable to merge these branches.", uiLanguage));
    } finally { setMergeLoading(false); }
  }

  async function runSynthesis() {
    if (!exploration || !isBackendExplorationId(exploration.id) || synthesisLoading) return;
    if (!hasConfiguredApiKey(credentialsRef.current)) { openAIOnboarding(() => void runSynthesis()); return; }
    setSynthesisLoading(true); setSynthesisError(null);
    try {
      const response = await requestSynthesis({ explorationId: exploration.id }, aiConfig());
      const synthesis: ExplorationSynthesis = { ...response.result, sourceRevision: response.result.sourceRevision, createdAt: response.result.createdAt };
      setExploration((current) => current ? { ...current, synthesis, synthesisStale: false } : current);
      setSynthesisOpen(true);
    } catch (cause) {
      if (isByokRequiredError(cause)) { openAIOnboarding(() => void runSynthesis()); return; }
      setSynthesisError(localizeError(cause instanceof Error ? cause.message : "Unable to synthesize this exploration.", uiLanguage));
    } finally { setSynthesisLoading(false); }
  }

  function updateExplorationContext(value: { goal?: string; constraints: string[] }) {
    if (!exploration) return;
    const goalChanged = value.goal !== exploration.goal;
    const newConstraints = value.constraints.filter((constraint) => !exploration.constraints.includes(constraint));
    setExploration((current) => current ? { ...current, goal: value.goal, constraints: value.constraints } : current);
    if (goalChanged) recordExplorationEvent("exploration_goal_set");
    for (const constraint of newConstraints) void constraint;
    if (newConstraints.length) recordExplorationEvent("constraint_added");
  }

  function undoDiscard() {
    if (!exploration || !discardUndo) return;
    setExploration(restoreNode(exploration, discardUndo.childId));
    if (discardUndoTimer.current) window.clearTimeout(discardUndoTimer.current);
    setDiscardUndo(null);
  }

  async function requestDifferentDirections() {
    if (!exploration || !activeNode || alternativeLoadingNode || loadingNode || steerLoadingNode) return;
    if (!hasConfiguredApiKey(credentialsRef.current)) {
      openAIOnboarding(() => void requestDifferentDirections());
      return;
    }
    const nodeId = activeNode.id;
    const node = activeNode;
    const path = getActivePath(exploration);
    const rejectedOptions = getExplorationNegativeOptions(exploration);
    const previous = getExplorationExploredOptions(exploration).map((item) => item.title);
    setAlternativeLoadingNode(nodeId); setAlternativeError(null); setError(null);
    try {
      const response = await requestExpansion({ initialIdea: exploration.initialIdea, path, current: node.title, language: exploration.language, previouslyExplored: [...new Set(previous)], currentOptions: activeOptions, rejectedOptions, generation: "alternative", context: buildExplorationContext(exploration, nodeId), explorationId: isBackendExplorationId(exploration.id) ? exploration.id : undefined }, aiConfig());
      const result = response.result;
      setExploration((current) => {
        const currentNode = current?.nodes[nodeId];
        if (!current || currentNode !== node) return current;
        const withAlternative = { ...current, nodes: { ...current.nodes, [nodeId]: applyAlternativeBatch(currentNode, result.options) } };
        return addGeneratedOptions(withAlternative, nodeId, result.options);
      });
    } catch (cause) {
      if (isByokRequiredError(cause)) {
        openAIOnboarding(() => void requestDifferentDirections());
        return;
      }
      if (cause instanceof AIClientError && cause.code === "AUTHENTICATION_FAILED") { setAiSettingsError(copy.invalidApiKey); setAiSettingsOpen(true); }
      setAlternativeError(localizeError(cause instanceof Error ? cause.message : "Unable to expand this idea.", uiLanguage));
    } finally { setAlternativeLoadingNode(null); }
  }

  async function requestSteer(event: React.FormEvent<HTMLFormElement> | null, presetSteer?: string) {
    event?.preventDefault();
    if (!exploration || !activeNode || steerLoadingNode || loadingNode || alternativeLoadingNode) return;
    const validation = presetSteer ? { ok: true as const, value: presetSteer } : validateSteer(activeSteer);
    if (!validation.ok) { setSteerError(copy.steerInvalid); return; }
    const steer = validation.value;
    if (!hasConfiguredApiKey(credentialsRef.current)) {
      openAIOnboarding(() => void requestSteer(null, steer));
      return;
    }
    const nodeId = activeNode.id;
    const node = activeNode;
    const path = getActivePath(exploration);
    const negativeMemory = getExplorationNegativeOptions(exploration);
    const cacheKey = expansionCacheKey(exploration.initialIdea, path, negativeMemory, exploration.language, steer);
    const cached = node.expansionCache[cacheKey];
    if (cached) {
      setExploration((current) => current?.nodes[nodeId] === node ? { ...replaceActiveSuggestionsWithSteer(current, nodeId, cached, cacheKey, steer), steer } : current);
      setActiveSteer(""); setSteerOpen(false); setSteerError(null); return;
    }
    setSteerLoadingNode(nodeId); setSteerError(null); setError(null);
    recordExplorationEvent("steer_submitted");
    try {
      const previous = getExplorationExploredOptions(exploration).map((item) => item.title);
      const response = await requestExpansion({ initialIdea: exploration.initialIdea, path, current: node.title, language: exploration.language, previouslyExplored: [...new Set(previous)], rejectedOptions: getExplorationNegativeOptions(exploration), steer, context: buildExplorationContext(exploration, nodeId), explorationId: isBackendExplorationId(exploration.id) ? exploration.id : undefined }, aiConfig());
      const result = response.result;
      setExploration((current) => current?.nodes[nodeId] === node ? { ...replaceActiveSuggestionsWithSteer(current, nodeId, result.options, cacheKey, steer), steer } : current);
      setActiveSteer(""); setSteerOpen(false); setSteerError(null);
    } catch (cause) { if (isByokRequiredError(cause)) { openAIOnboarding(() => void requestSteer(null, steer)); return; } if (cause instanceof AIClientError && cause.code === "AUTHENTICATION_FAILED") { setAiSettingsError(copy.invalidApiKey); setAiSettingsOpen(true); } setSteerError(localizeError(cause instanceof Error ? cause.message : "Unable to expand this idea.", uiLanguage)); }
    finally { setSteerLoadingNode(null); }
  }

  function resetExploration() {
    window.localStorage.removeItem(STORAGE_KEY); window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    setLoadingNode(null); setAlternativeLoadingNode(null); setSteerLoadingNode(null); setSummarizing(false); setTransitioningTitle(null); resetTransientUi(); setView("explore"); setExploration(null);
  }


  async function summarizeCurrentJourney() {
    if (!exploration || activePath.length < 3 || summarizing) return;
    if (!hasConfiguredApiKey(credentialsRef.current)) {
      openAIOnboarding(() => void summarizeCurrentJourney());
      return;
    }
    const key = activePathKey;
    const cached = summaryCache.current.get(key) ?? (exploration.journeySummaryPathKey === key ? exploration.journeySummary : undefined);
    if (cached) { setSummaryError(null); setSummaryOpen(true); return; }
    setSummarizing(true); setSummaryError(null);
    try {
      const response = await requestSummary({ initialIdea: exploration.initialIdea, path: activePath, language: exploration.language }, aiConfig());
      const result = response.result;
      summaryCache.current.set(key, result);
      setExploration((current) => current ? { ...current, journeySummary: result, journeySummaryPathKey: key } : current);
      setSummaryOpen(true);
    } catch (cause) { if (isByokRequiredError(cause)) { openAIOnboarding(() => void summarizeCurrentJourney()); return; } if (cause instanceof AIClientError && cause.code === "AUTHENTICATION_FAILED") { setAiSettingsError(copy.invalidApiKey); setAiSettingsOpen(true); } setSummaryError(localizeError(cause instanceof Error ? cause.message : "Unable to summarize this journey.", uiLanguage)); }
    finally { setSummarizing(false); }
  }

  if (!hydrated) return <main className="min-h-screen" />;
  if (!exploration) return <main className="app-start min-h-screen px-6 py-7 sm:px-10">
    <Header uiLanguage={uiLanguage} showAccount onRetrySave={retrySave} saveState={saveState} />
    <section className="app-start__hero">
      <div className="app-start__copy">
        <div className="app-start__eyebrow"><span className="app-start__eyebrow-mark">↗</span><span>{copy.landingEyebrow}</span></div>
        <h1>{copy.landingTitle}</h1>
        <p className="app-start__description">{copy.landingDescription}</p>
        <ExplorationLibrary uiLanguage={uiLanguage} />
        <div className="app-start__form-shell">
          <div className="app-start__form-label"><span>{copy.startWithIdea}</span></div>
          <IdeaInput onSubmit={start} language={language} uiLanguage={uiLanguage} onLanguageChange={setLanguage} />
        </div>
      </div>
    </section>
    <Footer />
  </main>;

  const isLoading = loadingNode === exploration.activeNodeId;
  const nodeForOption = (option: ExpansionOption) => getActiveChildren(exploration, activeNode?.id).find((node) => node.title === option.title && node.description === option.description);
  const convergenceNodes = Object.values(exploration.nodes).filter((node) => node.id !== exploration.rootNodeId && isAccessibleNode(node));
  return <main className="min-h-screen px-6 py-7 sm:px-10">
    <Header uiLanguage={uiLanguage} view={view} onViewChange={setView} onNewIdea={resetExploration} share={exploration} saveState={saveState} onRetrySave={retrySave} onShareChange={(value) => setExploration((current) => current ? { ...current, ...value } : current)} aiMode={aiMode} onAISettings={() => openAIOnboarding()} showAccount />
    <AISettings uiLanguage={uiLanguage} open={aiSettingsOpen} connections={byokConnections} activeProvider={activeAIProvider} anonymousId={anonymousId} error={aiSettingsError} onClose={closeAISettings} onConnect={connectOwnAI} onSelectProvider={selectOwnAI} onDisconnect={disconnectOwnAI} />
    {compareOpen && (compareResult ? <ComparisonPanel result={compareResult} uiLanguage={uiLanguage} onClose={() => setCompareOpen(false)} /> : <ComparePicker nodes={convergenceNodes} selectedIds={compareIds} uiLanguage={uiLanguage} loading={compareLoading} error={compareError} onToggle={(nodeId) => setCompareIds((current) => current.includes(nodeId) ? current.filter((id) => id !== nodeId) : current.length < 3 ? [...current, nodeId] : current)} onSubmit={() => void runCompare()} onClose={() => setCompareOpen(false)} />)}
    {mergeOpen && <ComparePicker nodes={convergenceNodes} selectedIds={mergeIds} uiLanguage={uiLanguage} loading={mergeLoading} error={mergeError} hint={copy.selectTwoBranches} actionLabel={copy.merge} mode="merge" exactCount onToggle={(nodeId) => setMergeIds((current) => current.includes(nodeId) ? current.filter((id) => id !== nodeId) : current.length < 2 ? [...current, nodeId] : current)} onSubmit={() => void runMerge()} onClose={() => setMergeOpen(false)} />}
    {synthesisOpen && exploration.synthesis && <div className="convergence-overlay"><SynthesisPanel synthesis={exploration.synthesis} stale={exploration.synthesisStale} uiLanguage={uiLanguage} onClose={() => setSynthesisOpen(false)} onOpenNode={openNode} /></div>}
    <section className="exploration-layout">
      <ExplorationHistory nodes={exploration.nodes} activeNodeId={exploration.activeNodeId} uiLanguage={uiLanguage} onNavigate={openNode} />
      <div className="exploration-workspace">
        <div className={`workspace-view workspace-view--explore${view === "explore" ? " is-active" : ""}`} aria-hidden={view !== "explore"}>
        <PathIndicator state={exploration} activeNodeId={exploration.activeNodeId} uiLanguage={uiLanguage} onOpenMap={() => setView("map")} />
        <ExplorationContextControl uiLanguage={uiLanguage} goal={exploration.goal} constraints={exploration.constraints} onChange={updateExplorationContext} />
        <CurrentConcept concept={activeNode?.title ?? exploration.initialIdea} uiLanguage={uiLanguage} />
        <div className="convergence-toolbar"><button type="button" onClick={openCompare}>{copy.compare}</button><button type="button" onClick={openMerge}>{copy.merge}</button><button type="button" onClick={() => void runSynthesis()} disabled={synthesisLoading}>{synthesisLoading ? "…" : copy.synthesize}</button>{activeNode && <button type="button" onClick={markActiveNodeAsConclusion}>{exploration.conclusionNodeId === activeNode.id ? copy.unmarkConclusion : copy.markConclusion}</button>}{activeNode && isBackendExplorationId(exploration.id) && <ForkButton explorationId={exploration.id} nodeId={activeNode.id} uiLanguage={uiLanguage} />}</div>
        {isLoading ? <ExpansionLoader uiLanguage={uiLanguage} /> : activeOptions.length ? <Fork options={activeOptions} uiLanguage={uiLanguage} onSelect={select} onDiscard={discardOption} onFavorite={(option) => updateOptionState(option, "favorite")} onConclusion={(option) => updateOptionState(option, "conclusion")} isFavorite={(option) => nodeForOption(option)?.state === "favorite"} isConclusion={(option) => nodeForOption(option)?.state === "conclusion"} loading={steerLoadingNode === activeNode?.id} loadingLabel={copy.steering} transitioningTitle={transitioningTitle} disabled={Boolean(alternativeLoadingNode) || Boolean(steerLoadingNode) || Boolean(transitioningTitle)} /> : <div className="exploration-empty" aria-live="polite">{copy.noDirections}</div>}
        <button type="button" className="alternative-directions-trigger" onClick={() => void requestDifferentDirections()} disabled={Boolean(alternativeLoadingNode) || Boolean(steerLoadingNode) || Boolean(loadingNode) || Boolean(transitioningTitle)}>{alternativeLoadingNode === activeNode?.id ? copy.generatingDifferentDirections : copy.generateAnother}</button>
        {alternativeLoadingNode === activeNode?.id && <div className="journey-summary-loading" role="status">{copy.generatingDifferentDirections}</div>}
        <SteerControl uiLanguage={uiLanguage} open={steerOpen} value={activeSteer} disabled={Boolean(alternativeLoadingNode) || Boolean(loadingNode) || Boolean(transitioningTitle)} loading={steerLoadingNode === activeNode?.id} error={steerError} onOpen={() => { setSteerOpen(true); setSteerError(null); }} onClose={() => { if (!steerLoadingNode) { setSteerOpen(false); setActiveSteer(""); setSteerError(null); } }} onChange={setActiveSteer} onSubmit={requestSteer} />
        {activeNode?.suggestionHistory.length ? <SuggestionHistory entries={activeNode.suggestionHistory} uiLanguage={uiLanguage} onRestore={(historyId) => setExploration((current) => current ? restoreSuggestion(current, activeNode.id, historyId) : current)} /> : null}
        {discardUndo && discardUndo.nodeId === activeNode?.id && <div className="branch-feedback" role="status">{copy.branchDiscarded}<button type="button" onClick={undoDiscard}>{copy.undo}</button></div>}
        {error && <div className="exploration-error" role="alert"><span>{error}</span><button type="button" onClick={() => void generate(exploration, exploration.activeNodeId)}>{copy.retry}</button></div>}
        {alternativeError && <div className="exploration-error" role="alert"><span>{alternativeError}</span><button type="button" onClick={() => void requestDifferentDirections()}>{copy.retry}</button></div>}
        {canSummarize && !summaryOpen && <button type="button" className="journey-summary-trigger" onClick={() => void summarizeCurrentJourney()} disabled={summarizing}>{summarizing ? copy.synthesizingJourney : copy.summarizeJourney}</button>}
        {summaryError && <div className="exploration-error" role="alert"><span>{summaryError}</span><button type="button" onClick={() => void summarizeCurrentJourney()}>{copy.retry}</button></div>}
        {synthesisError && <div className="exploration-error" role="alert"><span>{synthesisError}</span><button type="button" onClick={() => void runSynthesis()}>{copy.retry}</button></div>}
        {summaryOpen && visibleSummary && <JourneySummaryPanel summary={visibleSummary} uiLanguage={uiLanguage} onClose={() => setSummaryOpen(false)} />}
        </div>
        <div className={`workspace-view workspace-view--map${view === "map" ? " is-active" : ""}`} aria-hidden={view !== "map"}>
          <MapView state={exploration} activeNodeId={exploration.activeNodeId} uiLanguage={uiLanguage} onSelect={openNode} />
        </div>
      </div>
    </section>
    <Footer />
  </main>;
}

function Header({ onNewIdea, share, uiLanguage, view, onViewChange, aiMode, onAISettings, saveState, onRetrySave, onShareChange, showAccount }: { onNewIdea?: () => void; share?: ExplorationState; uiLanguage: UiLanguage; view?: ExplorationView; onViewChange?: (view: ExplorationView) => void; aiMode?: string; onAISettings?: () => void; saveState?: "idle" | "saving" | "saved" | "error"; onRetrySave?: () => void; onShareChange?: (value: { isShared: boolean; shareId?: string }) => void; showAccount?: boolean }) {
  const copy = getCopy(uiLanguage);
  return <header className="app-header"><div className="app-header__brand"><Link href="/" className="brand-wordmark">XPANSIVE<span className="brand-wordmark__mark">↗</span></Link><span className="header-tagline">{copy.headerTagline}</span></div><div className="app-header__actions">{view && onViewChange && <nav className="view-toggle" aria-label={copy.explorationView}><button type="button" className={view === "explore" ? "is-active" : ""} onClick={() => onViewChange("explore")}>{copy.exploreMode}</button><button type="button" className={view === "map" ? "is-active" : ""} onClick={() => onViewChange("map")}>{copy.mapMode}</button></nav>}{saveState && saveState !== "idle" && (saveState === "error" && onRetrySave ? <button type="button" className="save-state save-state--action" onClick={onRetrySave}>{copy.retry}</button> : <span className="save-state" role="status">{saveState === "saving" ? copy.saving : copy.saved}</span>)}{onAISettings && <button type="button" className="ai-mode-trigger" onClick={onAISettings}>{aiMode === "byok" ? copy.byokConnected : copy.connectYourAI}</button>}{share && <ShareButton exploration={share} uiLanguage={uiLanguage} onShareChange={onShareChange} />}{onNewIdea && <button type="button" onClick={onNewIdea} className="header-action">{copy.newIdea}</button>}<FeedbackForm uiLanguage={uiLanguage} />{showAccount && <AccountMenu uiLanguage={uiLanguage} />}</div></header>;
}

function Footer() { return <footer className="flex justify-between text-[10px] font-bold tracking-[0.18em] text-[var(--muted)]"><span>XPANSIVE.ORG</span><Link href="/privacy">PRIVACIDAD</Link></footer>; }
