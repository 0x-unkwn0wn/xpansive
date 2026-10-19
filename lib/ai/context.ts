import { getParentIds } from "@/lib/exploration-tree";
import type { ExplorationNode, ExplorationState } from "@/lib/types";

export type ExplorationContext = {
  rootPrompt: string;
  goal?: string;
  constraints: string[];
  summary?: string;
  path: Array<{ title: string; description: string; steer?: string; decision?: string }>;
};

export type SynthesisBranchContext = {
  nodeId: string;
  title: string;
  description: string;
  depth: number;
  state: ExplorationNode["state"];
  origin: ExplorationNode["origin"];
  path: Array<{ title: string; description: string }>;
  parentPaths?: Array<Array<{ title: string; description: string }>>;
};

export type SynthesisContext = ExplorationContext & { branches: SynthesisBranchContext[] };

function compact(value: string, max: number) {
  return value.trim().slice(0, max);
}

export function buildExplorationContext(state: ExplorationState, nodeId = state.activeNodeId): ExplorationContext {
  const node = state.nodes[nodeId];
  const paths = node ? parentPaths(state, node) : [];
  const path: ExplorationNode[] = [];
  const seen = new Set<string>();
  for (const candidate of paths.flat()) if (!seen.has(candidate.id)) { seen.add(candidate.id); path.push(candidate); }
  return buildBranchContext({
    rootPrompt: state.initialIdea,
    goal: state.goal,
    constraints: state.constraints,
    summary: state.summary ?? state.journeySummary?.summary,
    nodes: path,
    generations: state.generations,
  });
}

export function buildBranchContext(input: {
  rootPrompt: string;
  goal?: string;
  constraints?: string[];
  summary?: string;
  nodes: ExplorationNode[];
  generations?: ExplorationState["generations"];
}): ExplorationContext {
  return {
    rootPrompt: compact(input.rootPrompt, 280),
    ...(input.goal?.trim() ? { goal: compact(input.goal, 500) } : {}),
    constraints: (input.constraints ?? []).map((constraint) => compact(constraint, 240)).filter(Boolean).slice(0, 20),
    ...(input.summary?.trim() ? { summary: compact(input.summary, 2000) } : {}),
    path: input.nodes.slice(-12).map((node) => ({
      title: compact(node.title, 120),
      description: compact(node.description, 240),
      ...(node.generationId && input.generations?.[node.generationId]?.steer ? { steer: compact(input.generations[node.generationId].steer!, 100) } : {}),
      ...(node.state === "favorite" || node.state === "conclusion" ? { decision: node.state } : node.origin === "merge" ? { decision: "merge" } : {}),
    })),
  };
}

function nodePath(state: ExplorationState, node: ExplorationNode) {
  const path: ExplorationNode[] = [];
  const seen = new Set<string>();
  let cursor: ExplorationNode | undefined = node;
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    path.unshift(cursor);
    cursor = cursor.parentId ? state.nodes[cursor.parentId] : undefined;
  }
  return path.slice(1).map((item) => ({ title: compact(item.title, 120), description: compact(item.description, 240) }));
}

function parentPaths(state: ExplorationState, node: ExplorationNode, limit = 3): ExplorationNode[][] {
  const parents = getParentIds(node).map((id) => state.nodes[id]).filter(Boolean);
  if (!parents.length) return [[node]];
  return parents.flatMap((parent) => parentPaths(state, parent, limit).map((path) => [...path, node])).slice(0, limit);
}

function compactParentPaths(state: ExplorationState, node: ExplorationNode) {
  const paths = parentPaths(state, node).map((path) => path.slice(1).map((item) => ({ title: compact(item.title, 120), description: compact(item.description, 240) })));
  const primary = paths[0] ?? [];
  return { primary, alternatives: paths.slice(1).filter((path) => JSON.stringify(path) !== JSON.stringify(primary)).slice(0, 2) };
}

export function buildSynthesisContext(state: ExplorationState): SynthesisContext {
  const allNodes = Object.values(state.nodes);
  const conclusion = state.conclusionNodeId ? state.nodes[state.conclusionNodeId] : undefined;
  const favorites = allNodes.filter((node) => node.state === "favorite");
  const explored = allNodes.filter((node) => node.status === "explored" || node.children.length > 0);
  const active = allNodes.filter((node) => node.branchStatus === "active" && node.state !== "discarded");
  const discarded = allNodes.filter((node) => node.state === "discarded" && node.children.length > 0);
  const selected: ExplorationNode[] = [];
  for (const node of [conclusion, ...favorites, ...explored, ...active, ...discarded]) {
    if (node && !selected.some((item) => item.id === node.id)) selected.push(node);
  }
  const branches = selected.slice(0, 28).map((node) => {
    const paths = compactParentPaths(state, node);
    return {
    nodeId: node.id,
    title: compact(node.title, 120),
    description: compact(node.description, 240),
    depth: nodePath(state, node).length,
    state: node.state,
    origin: node.origin,
    path: paths.primary,
    ...(paths.alternatives.length ? { parentPaths: paths.alternatives } : {}),
  }; });
  return {
    ...buildExplorationContext(state),
    branches,
  };
}

export function buildSelectedBranchContext(state: ExplorationState, nodeIds: string[]) {
  return nodeIds.map((nodeId) => {
    const node = state.nodes[nodeId];
    if (!node) return null;
    const paths = compactParentPaths(state, node);
    return { nodeId: node.id, title: node.title, description: node.description, path: paths.primary, ...(paths.alternatives.length ? { parentPaths: paths.alternatives } : {}) };
  }).filter((branch): branch is NonNullable<typeof branch> => Boolean(branch));
}

export function buildMergeContext(state: ExplorationState, nodeIds: string[]) {
  return {
    rootPrompt: compact(state.initialIdea, 280),
    ...(state.goal ? { goal: compact(state.goal, 500) } : {}),
    constraints: state.constraints.map((constraint) => compact(constraint, 240)).slice(0, 20),
    ...(state.summary ? { summary: compact(state.summary, 2000) } : {}),
    branches: buildSelectedBranchContext(state, nodeIds),
  };
}
