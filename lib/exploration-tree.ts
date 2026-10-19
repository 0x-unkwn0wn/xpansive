import { ExplorationStateSchema, LegacyExplorationStateSchema } from "@/lib/schemas/expansion";
import type { ExpansionOption, ExplorationGeneration, ExplorationNode, ExplorationState, LanguagePreference, SuggestionHistoryEntry } from "@/lib/types";

export const TREE_VERSION = "tree-v1";

function now() {
  return new Date().toISOString();
}

export function optionFromNode(node: ExplorationNode): ExpansionOption {
  return { title: node.title, description: node.description || `Explore ${node.title}.` };
}

function optionKey(option: ExpansionOption): string {
  return `${option.title.trim().toLocaleLowerCase()}::${option.description.trim().toLocaleLowerCase()}`;
}

function uniqueOptions(options: ExpansionOption[]): ExpansionOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = optionKey(option);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Collects all ideas that must be treated as negative memory for this
 * exploration, regardless of the branch where they were generated.
 *
 * The collection is derived from the persisted tree so existing explorations
 * remain compatible without a database migration.
 */
export function getExplorationNegativeOptions(state: ExplorationState): ExpansionOption[] {
  const negativeOptions: ExpansionOption[] = [];

  for (const node of Object.values(state.nodes)) {
    negativeOptions.push(...node.rejectedOptions);
    negativeOptions.push(...node.suggestionHistory.map((entry) => entry.option));

    if (node.id !== state.rootNodeId && (node.branchStatus === "discarded" || node.state === "discarded")) {
      negativeOptions.push(optionFromNode(node));
    }
  }

  return uniqueOptions(negativeOptions);
}

/**
 * Collects explored ideas with their descriptions, not only their titles, so
 * semantic duplicate checks can use the full information available.
 */
export function getExplorationExploredOptions(state: ExplorationState): ExpansionOption[] {
  return uniqueOptions(
    Object.values(state.nodes)
      .filter((node) => node.status === "explored")
      .map(optionFromNode),
  );
}

export function createExploration(initialIdea: string, language: LanguagePreference = "auto"): ExplorationState {
  const rootNodeId = "root";
  return {
    id: `${TREE_VERSION}:${Date.now().toString(36)}`,
    initialIdea: initialIdea.trim(),
    language,
    rootNodeId,
    generations: {},
    constraints: [],
    resolutionStatus: "active",
    activeNodeId: rootNodeId,
    nodes: {
      [rootNodeId]: {
        id: rootNodeId,
        parentId: null,
        parentIds: [],
        title: initialIdea.trim(),
        description: "",
        status: "explored",
        branchStatus: "active",
        state: "active",
        origin: "ai",
        children: [],
        activeChildIds: [],
        activeSuggestionIds: [],
        suggestionHistory: [],
        createdAt: now(),
        rejectedOptions: [],
        alternativeGenerationCount: 0,
        alternativeBatches: [],
        expansionCache: {},
      },
    },
  };
}

export function getNode(state: ExplorationState, nodeId: string) {
  return state.nodes[nodeId];
}

export function getParentIds(node: ExplorationNode): string[] {
  return [...new Set((node.parentIds?.length ? node.parentIds : node.parentId ? [node.parentId] : []).filter(Boolean))];
}

export function getChildren(state: ExplorationState, nodeId: string) {
  const node = getNode(state, nodeId);
  return node ? node.children.map((id) => state.nodes[id]).filter(Boolean) : [];
}

export function isAccessibleNode(node: ExplorationNode | undefined) {
  return Boolean(node && node.branchStatus === "active" && node.state !== "discarded" && !node.mergedInto);
}

export function getActiveChildren(state: ExplorationState, nodeId = state.activeNodeId) {
  const node = getNode(state, nodeId);
  if (!node) return [];
  const explicitIds = (node as Partial<ExplorationNode>).activeSuggestionIds;
  const ids = Array.isArray(explicitIds) ? explicitIds : node.activeChildIds.filter((id) => state.nodes[id]?.status !== "explored");
  return ids.map((id) => state.nodes[id]).filter((child): child is ExplorationNode => isAccessibleNode(child));
}

export function isExploredBranch(state: ExplorationState, nodeId: string) {
  const node = getNode(state, nodeId);
  return Boolean(node && (node.status === "explored" || node.children.length > 0));
}

export function getVisibleChildren(state: ExplorationState, nodeId: string) {
  const node = getNode(state, nodeId);
  if (!node) return [];
  const visible: ExplorationNode[] = [];
  const seen = new Set<string>();
  const candidateIds = [...new Set([...node.children, ...node.activeChildIds])];
  for (const childId of candidateIds) {
    const child = state.nodes[childId];
    if (!child || seen.has(child.id)) continue;
    if (child.mergedInto) {
      const replacement = state.nodes[child.mergedInto];
      if (isAccessibleNode(replacement) && !seen.has(replacement.id)) {
        seen.add(replacement.id);
        visible.push(replacement);
      }
      continue;
    }
    if (!isAccessibleNode(child)) continue;
    seen.add(child.id);
    visible.push(child);
  }
  return visible;
}

export function hasGeneratedChildren(state: ExplorationState, nodeId: string) {
  return (getNode(state, nodeId)?.children.length ?? 0) > 0;
}

export function getActivePathNodes(state: ExplorationState, nodeId = state.activeNodeId): ExplorationNode[] {
  const path: ExplorationNode[] = [];
  const seen = new Set<string>();
  let cursor: ExplorationNode | undefined = getNode(state, nodeId);
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    path.unshift(cursor);
    let parentId: string | undefined = cursor.parentId ?? undefined;
    while (parentId && state.nodes[parentId]?.mergedInto) parentId = state.nodes[parentId]?.parentId ?? undefined;
    cursor = parentId ? getNode(state, parentId) : undefined;
  }
  return path;
}

export function getActivePath(state: ExplorationState, nodeId = state.activeNodeId): ExpansionOption[] {
  return getActivePathNodes(state, nodeId).slice(1).map(optionFromNode);
}

export function setActiveNode(state: ExplorationState, nodeId: string): ExplorationState {
  const node = getNode(state, nodeId);
  if (!node) return state;
  const nodes: Record<string, ExplorationNode> = { ...state.nodes, [nodeId]: { ...node, status: "explored", error: undefined } };
  for (const parentId of getParentIds(node)) {
    if (!nodes[parentId]) continue;
    const parent = nodes[parentId];
    nodes[parentId] = { ...parent, activeSuggestionIds: parent.activeSuggestionIds.filter((id) => id !== nodeId) };
  }
  return { ...state, activeNodeId: nodeId, nodes };
}

function childForOption(state: ExplorationState, parentId: string, option: ExpansionOption) {
  return getChildren(state, parentId).find((child) => child.branchStatus === "active" && child.title === option.title && child.description === option.description);
}

function generationId(parentId: string, state: ExplorationState) {
  return `${parentId}:generation:${Date.now().toString(36)}:${Object.keys(state.generations).length}`;
}

function addGeneration(state: ExplorationState, nodeId: string, steer?: string) {
  const id = generationId(nodeId, state);
  const generation: ExplorationGeneration = { id, nodeId, ...(steer ? { steer } : {}), createdAt: now() };
  return { id, generations: { ...state.generations, [id]: generation } };
}

export function isProtectedBranch(state: ExplorationState, nodeId: string) {
  const node = getNode(state, nodeId);
  return Boolean(node && (node.status === "explored" || node.children.length > 0 || node.origin === "manual" || node.state === "favorite" || node.state === "conclusion" || node.state === "merged"));
}

function invalidateSynthesis(state: ExplorationState): ExplorationState {
  return state.synthesis ? { ...state, synthesisStale: true } : state;
}

export function addGeneratedOptions(state: ExplorationState, parentId: string, options: ExpansionOption[], cacheKey?: string): ExplorationState {
  const parent = getNode(state, parentId);
  if (!parent) return state;
  let nodes = state.nodes;
  const createdGeneration = addGeneration(state, parentId);
  const childIds: string[] = [];

  options.forEach((option, index) => {
    const existing = childForOption({ ...state, nodes }, parentId, option);
    if (existing) {
      childIds.push(existing.id);
      return;
    }
    const childId = `${parentId}:${Object.keys(nodes).length + index}`;
    nodes = { ...nodes, [childId]: { id: childId, parentId, parentIds: [parentId], title: option.title, description: option.description, status: "available", branchStatus: "active", state: "active", origin: "ai", generationId: createdGeneration.id, children: [], activeChildIds: [], activeSuggestionIds: [], suggestionHistory: [], createdAt: now(), rejectedOptions: [], alternativeGenerationCount: 0, alternativeBatches: [], expansionCache: {} } };
    childIds.push(childId);
  });

  const currentParent = nodes[parentId] ?? parent;
  const updatedParent: ExplorationNode = {
    ...currentParent,
    status: "explored",
    children: [...new Set([...currentParent.children, ...childIds])],
    activeChildIds: [...new Set([...currentParent.activeChildIds, ...childIds.filter((id) => nodes[id]?.branchStatus === "active")])],
    activeSuggestionIds: [...new Set([...currentParent.activeSuggestionIds, ...childIds.filter((id) => nodes[id]?.branchStatus === "active" && !isExploredBranch({ ...state, nodes }, id))])],
    expansionCache: cacheKey ? { ...currentParent.expansionCache, [cacheKey]: options } : currentParent.expansionCache,
    error: undefined,
  };
  return invalidateSynthesis({ ...state, generations: createdGeneration.generations, nodes: { ...nodes, [parentId]: updatedParent } });
}

export function addManualBranch(state: ExplorationState, parentId: string, option: ExpansionOption): ExplorationState {
  const parent = getNode(state, parentId);
  if (!parent) return state;
  const id = `${parentId}:manual:${Object.keys(state.nodes).length}`;
  const node: ExplorationNode = { id, parentId, parentIds: [parentId], title: option.title, description: option.description, status: "available", branchStatus: "active", state: "active", origin: "manual", children: [], activeChildIds: [], activeSuggestionIds: [id], suggestionHistory: [], createdAt: now(), rejectedOptions: [], alternativeGenerationCount: 0, alternativeBatches: [], expansionCache: {} };
  return invalidateSynthesis({ ...state, nodes: { ...state.nodes, [id]: node, [parentId]: { ...parent, children: [...new Set([...parent.children, id])], activeChildIds: [...new Set([...parent.activeChildIds, id])], activeSuggestionIds: [...new Set([...parent.activeSuggestionIds, id])] } } });
}

export function replaceActiveSuggestionsWithSteer(state: ExplorationState, parentId: string, options: ExpansionOption[], cacheKey?: string, steer?: string): ExplorationState {
  const parent = getNode(state, parentId);
  if (!parent) return state;
  let nodes = state.nodes;
  const currentActiveSuggestionIds = Array.isArray((parent as Partial<ExplorationNode>).activeSuggestionIds)
    ? parent.activeSuggestionIds
    : parent.activeChildIds.filter((id) => !isExploredBranch(state, id));
  const replacedIds = currentActiveSuggestionIds.filter((id) => !isProtectedBranch(state, id));
  const historyEntries: SuggestionHistoryEntry[] = replacedIds.flatMap((id) => {
    const child = nodes[id];
    return child ? [{ id: child.id, option: optionFromNode(child), createdAt: now(), source: "steer" as const }] : [];
  });

  for (const id of replacedIds) {
    const child = nodes[id];
    if (child) nodes = { ...nodes, [id]: { ...child, branchStatus: "discarded", state: "discarded" } };
  }

  const childIds: string[] = [];
  const createdGeneration = addGeneration({ ...state, nodes }, parentId, steer ?? state.steer);
  options.forEach((option, index) => {
    const existing = childForOption({ ...state, nodes }, parentId, option);
    if (existing) {
      childIds.push(existing.id);
      return;
    }
    const childId = `${parentId}:${Object.keys(nodes).length + index}`;
    nodes = { ...nodes, [childId]: { id: childId, parentId, parentIds: [parentId], title: option.title, description: option.description, status: "available", branchStatus: "active", state: "active", origin: "ai", generationId: createdGeneration.id, children: [], activeChildIds: [], activeSuggestionIds: [], suggestionHistory: [], createdAt: now(), rejectedOptions: [], alternativeGenerationCount: 0, alternativeBatches: [], expansionCache: {} } };
    childIds.push(childId);
  });
  const currentParent = nodes[parentId] ?? parent;
  const preservedActiveIds = currentActiveSuggestionIds.filter((id) => !replacedIds.includes(id) && nodes[id]?.branchStatus === "active");
  const updatedParent: ExplorationNode = {
    ...currentParent,
    status: "explored",
    children: [...new Set([...currentParent.children, ...childIds])],
    activeChildIds: [...new Set([...preservedActiveIds, ...childIds.filter((id) => nodes[id]?.branchStatus === "active")])],
    activeSuggestionIds: [...new Set([...preservedActiveIds.filter((id) => isProtectedBranch({ ...state, nodes }, id)), ...childIds.filter((id) => nodes[id]?.branchStatus === "active")])],
    suggestionHistory: [...currentParent.suggestionHistory, ...historyEntries].slice(-100),
    expansionCache: cacheKey ? { ...currentParent.expansionCache, [cacheKey]: options } : currentParent.expansionCache,
    error: undefined,
  };
  return invalidateSynthesis({ ...state, generations: createdGeneration.generations, nodes: { ...nodes, [parentId]: updatedParent } });
}

export function restoreSuggestion(state: ExplorationState, parentId: string, historyId: string): ExplorationState {
  const parent = getNode(state, parentId);
  const entry = parent?.suggestionHistory.find((item) => item.id === historyId);
  const child = entry ? getNode(state, entry.id) : undefined;
  if (!parent || !entry || !child || !getParentIds(child).includes(parentId)) return state;
  return invalidateSynthesis({
    ...state,
    nodes: {
      ...state.nodes,
      [child.id]: { ...child, branchStatus: "active", state: child.state === "discarded" ? "active" : child.state, status: "available" },
      [parentId]: {
        ...parent,
        activeChildIds: [...new Set([...parent.activeChildIds, child.id])],
        activeSuggestionIds: [...new Set([...parent.activeSuggestionIds, child.id])],
        suggestionHistory: parent.suggestionHistory.filter((item) => item.id !== historyId),
        rejectedOptions: parent.rejectedOptions.filter((option) => optionKey(option) !== optionKey(entry.option)),
      },
    },
  });
}

export function discardNode(state: ExplorationState, nodeId: string): ExplorationState {
  const node = getNode(state, nodeId);
  const parentIds = getParentIds(node);
  if (!node || !parentIds.length) return state;
  if (node.branchStatus === "discarded") return state;
  const parents = parentIds.map((id) => getNode(state, id)).filter((parent): parent is ExplorationNode => Boolean(parent));
  if (!parents.length) return state;
  const rejectedByParent = Object.fromEntries(parents.map((parent) => [parent.id, parent.rejectedOptions.some((option) => option.title === node.title && option.description === node.description) ? parent.rejectedOptions : [...parent.rejectedOptions, optionFromNode(node)]]));
  const updatedParents = Object.fromEntries(parents.map((parent) => [parent.id, { ...parent, activeChildIds: parent.activeChildIds.filter((id) => id !== node.id), activeSuggestionIds: parent.activeSuggestionIds.filter((id) => id !== node.id), rejectedOptions: rejectedByParent[parent.id] }]));
  return invalidateSynthesis({
    ...state,
    nodes: {
      ...state.nodes,
      [node.id]: { ...node, branchStatus: "discarded", state: "discarded" },
      ...updatedParents,
    },
  });
}

export function restoreNode(state: ExplorationState, nodeId: string): ExplorationState {
  const node = getNode(state, nodeId);
  const parentIds = getParentIds(node);
  if (!node || !parentIds.length || node.branchStatus === "active") return state;
  const parents = parentIds.map((id) => getNode(state, id)).filter((parent): parent is ExplorationNode => Boolean(parent));
  if (!parents.length) return state;
  const updatedParents = Object.fromEntries(parents.map((parent) => {
    const activeChildIds = parent.children.filter((id) => id === node.id || parent.activeChildIds.includes(id)).filter((id) => state.nodes[id]?.branchStatus === "active" || id === node.id);
    return [parent.id, {
      ...parent,
      activeChildIds,
      activeSuggestionIds: [...new Set([...parent.activeSuggestionIds, node.id])],
      rejectedOptions: parent.rejectedOptions.filter((option) => optionKey(option) !== optionKey(optionFromNode(node))),
    }];
  }));
  return invalidateSynthesis({
    ...state,
    nodes: {
      ...state.nodes,
      [node.id]: { ...node, branchStatus: "active", state: node.state === "discarded" ? "active" : node.state },
      ...updatedParents,
    },
  });
}

function hasPath(state: ExplorationState, fromId: string, targetId: string, seen = new Set<string>()): boolean {
  if (fromId === targetId) return true;
  if (seen.has(fromId)) return false;
  seen.add(fromId);
  return getNode(state, fromId)?.children.some((childId) => hasPath(state, childId, targetId, seen)) ?? false;
}

export function canMergeNodes(state: ExplorationState, nodeIds: string[]) {
  if (nodeIds.length !== 2 || new Set(nodeIds).size !== 2) return false;
  const nodes = nodeIds.map((id) => getNode(state, id));
  if (nodes.some((node) => !isAccessibleNode(node))) return false;
  return !hasPath(state, nodeIds[0], nodeIds[1]) && !hasPath(state, nodeIds[1], nodeIds[0]);
}

export function addMergedNode(state: ExplorationState, parentIds: string[], option: ExpansionOption): ExplorationState {
  const uniqueParentIds = [...new Set(parentIds)];
  if (uniqueParentIds.length !== 2 || !canMergeNodes(state, uniqueParentIds)) return state;
  if (Object.values(state.nodes).some((node) => node.origin === "merge" && getParentIds(node).length === 2 && getParentIds(node).every((parentId) => uniqueParentIds.includes(parentId)))) return state;
  const parents = uniqueParentIds.map((id) => getNode(state, id));
  if (parents.some((parent) => !parent)) return state;
  const id = `${uniqueParentIds.join("+")}:merge:${Object.keys(state.nodes).length}`;
  if (state.nodes[id]) return state;
  const node: ExplorationNode = { id, parentId: uniqueParentIds[0], parentIds: uniqueParentIds, title: option.title, description: option.description, status: "available", branchStatus: "active", state: "merged", origin: "merge", children: [], activeChildIds: [], activeSuggestionIds: [id], suggestionHistory: [], createdAt: now(), rejectedOptions: [], alternativeGenerationCount: 0, alternativeBatches: [], expansionCache: {} };
  const nodes = { ...state.nodes, [id]: node };
  for (const parent of parents as ExplorationNode[]) {
    nodes[parent.id] = { ...parent, mergedInto: id, status: "explored", children: [...new Set([...parent.children, id])], activeChildIds: [...new Set([...parent.activeChildIds, id])], activeSuggestionIds: [...new Set([...parent.activeSuggestionIds, id])] };
    for (const ancestorId of getParentIds(parent)) {
      const ancestor = nodes[ancestorId];
      if (!ancestor) continue;
      nodes[ancestorId] = {
        ...ancestor,
        activeChildIds: [...new Set([...ancestor.activeChildIds.filter((childId) => childId !== parent.id), id])],
        activeSuggestionIds: [...new Set([...ancestor.activeSuggestionIds.filter((childId) => childId !== parent.id), id])],
      };
    }
  }
  const activeNodeConsumed = uniqueParentIds.some((parentId) => hasPath(state, parentId, state.activeNodeId));
  return invalidateSynthesis({ ...state, nodes, activeNodeId: activeNodeConsumed ? id : state.activeNodeId });
}

export function setNodeFavorite(state: ExplorationState, nodeId: string, favorite: boolean): ExplorationState {
  const node = getNode(state, nodeId);
  if (!node || node.state === "discarded") return state;
  if (node.state === "conclusion") return state;
  return invalidateSynthesis({ ...state, nodes: { ...state.nodes, [nodeId]: { ...node, state: favorite ? "favorite" : "active" } } });
}

export function setNodeConclusion(state: ExplorationState, nodeId: string, conclusion: boolean): ExplorationState {
  const node = getNode(state, nodeId);
  if (!node || node.state === "discarded") return state;
  if (conclusion) {
    const nodes = Object.fromEntries(Object.entries(state.nodes).map(([id, item]) => [id, item.state === "conclusion" && id !== nodeId ? { ...item, state: "active" as const } : id === nodeId ? { ...item, state: "conclusion" as const } : item]));
    return invalidateSynthesis({ ...state, nodes, conclusionNodeId: nodeId, resolutionStatus: "resolved", resolvedAt: now() });
  }
  if (state.conclusionNodeId !== nodeId && node.state !== "conclusion") return state;
  return invalidateSynthesis({ ...state, nodes: { ...state.nodes, [nodeId]: { ...node, state: "active" } }, conclusionNodeId: undefined, resolutionStatus: "active", resolvedAt: undefined });
}

export function markNodeError(state: ExplorationState, nodeId: string, error: string): ExplorationState {
  const node = getNode(state, nodeId);
  return node ? { ...state, nodes: { ...state.nodes, [nodeId]: { ...node, error } } } : state;
}

export function migrateLegacyExploration(input: unknown): ExplorationState | null {
  const parsed = LegacyExplorationStateSchema.safeParse(input);
  if (!parsed.success) return null;
  const legacy = parsed.data;
  let state = createExploration(legacy.initialIdea, legacy.language);
  const oldNodes = legacy.nodes;
  const oldToNew: Record<string, string> = { root: state.rootNodeId };
  const nodes = state.nodes;

  for (const oldNode of Object.values(oldNodes)) {
    if (oldNode.id === "root" || !oldNode.option) continue;
    oldToNew[oldNode.id] = oldNode.id;
    const parentId = oldNode.parentId ?? state.rootNodeId;
    nodes[oldNode.id] = { id: oldNode.id, parentId, parentIds: [parentId], title: oldNode.option.title, description: oldNode.option.description, status: oldNode.options ? "explored" : "available", branchStatus: "active", state: "active", origin: "ai", children: [], activeChildIds: [], activeSuggestionIds: [], suggestionHistory: [], createdAt: now(), rejectedOptions: oldNode.rejectedOptions, alternativeGenerationCount: oldNode.alternativeGenerationCount, alternativeBatches: oldNode.alternativeBatches, expansionCache: oldNode.expansionCache, error: oldNode.error };
  }

  for (const oldNode of Object.values(oldNodes)) {
    const newId = oldToNew[oldNode.id];
    if (!newId) continue;
    const parentId = nodes[newId]?.parentId;
    if (parentId && nodes[parentId]) nodes[parentId].children = [...new Set([...nodes[parentId].children, newId])];
    if (!oldNode.options) continue;
    const generatedIds: string[] = [];
    oldNode.options.forEach((option, index) => {
      const childId = `${newId}:legacy:${index}`;
      if (!nodes[childId]) nodes[childId] = { id: childId, parentId: newId, parentIds: [newId], title: option.title, description: option.description, status: "available", branchStatus: "active", state: "active", origin: "ai", children: [], activeChildIds: [], activeSuggestionIds: [], suggestionHistory: [], createdAt: now(), rejectedOptions: [], alternativeGenerationCount: 0, alternativeBatches: [], expansionCache: {} };
      nodes[newId].children = [...new Set([...nodes[newId].children, childId])];
      generatedIds.push(childId);
    });
    nodes[newId].activeChildIds = generatedIds;
    nodes[newId].activeSuggestionIds = generatedIds;
  }

  const activeNodeId = nodes[legacy.activeNodeId] ? legacy.activeNodeId : state.rootNodeId;
  state = { ...state, nodes, activeNodeId, goal: legacy.goal, constraints: legacy.constraints, resolutionStatus: "active", journeySummary: legacy.journeySummary, journeySummaryPathKey: legacy.journeySummaryPathKey };
  return state;
}

export function parseExplorationState(input: unknown): ExplorationState | null {
  const parsed = ExplorationStateSchema.safeParse(input);
  if (!parsed.success) return migrateLegacyExploration(input);
  const rawNodes = input && typeof input === "object" && "nodes" in input && input.nodes && typeof input.nodes === "object" ? input.nodes as Record<string, unknown> : {};
  const nodes = Object.fromEntries(Object.entries(parsed.data.nodes).map(([id, node]) => {
    const rawNode = rawNodes[id] && typeof rawNodes[id] === "object" ? rawNodes[id] as Record<string, unknown> : {};
    if (Array.isArray(rawNode.activeSuggestionIds)) return [id, node];
    return [id, { ...node, activeSuggestionIds: node.activeChildIds.filter((childId) => parsed.data.nodes[childId]?.status !== "explored") }];
  }));
  const normalizedNodes: Record<string, ExplorationNode> = Object.fromEntries(Object.entries(nodes).map(([id, node]) => [id, { ...node, parentIds: node.parentIds.length ? node.parentIds : node.parentId ? [node.parentId] : [], state: node.state === "discarded" || node.branchStatus === "discarded" ? "discarded" as const : node.state, branchStatus: node.state === "discarded" || node.branchStatus === "discarded" ? "discarded" as const : "active" as const }]));
  return { ...parsed.data, nodes: normalizedNodes };
}
