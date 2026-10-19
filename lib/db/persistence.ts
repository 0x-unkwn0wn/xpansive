import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { explorationGenerations, explorationNodeEdges, explorationNodes, explorations, productEvents } from "@/lib/db/schema";
import { createExploration, getVisibleChildren, parseExplorationState } from "@/lib/exploration-tree";
import { explorationEventKey } from "@/lib/product-events";
import { ExpansionOptionSchema, ExplorationStateSchema, SuggestionHistoryEntrySchema } from "@/lib/schemas/expansion";
import { type PersistedNode, PersistedGenerationSchema, PersistedNodeSchema } from "@/lib/schemas/persistence";
import type { ExpansionOption, ExplorationGeneration, ExplorationNode, ExplorationState, LanguagePreference } from "@/lib/types";
import { ExplorationSynthesisSchema } from "@/lib/schemas/convergence";

export class ExplorationNotFoundError extends Error {}
export class ExplorationUnauthorizedError extends Error {}
export class ExplorationRevisionError extends Error {}

export function createEditToken() {
  return randomBytes(32).toString("base64url");
}

export function hashEditToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function editCookieName(explorationId: string) {
  return `xpansive-edit-${explorationId}`;
}

export function verifyEditToken(storedHash: string | null, token: string | undefined) {
  if (!storedHash || !token) return false;
  const actual = Buffer.from(hashEditToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function options(value: unknown): ExpansionOption[] {
  const parsed = ExpansionOptionSchema.array().safeParse(value);
  return parsed.success ? parsed.data : [];
}

function optionsBatches(value: unknown): ExpansionOption[][] {
  return Array.isArray(value) ? value.map(options).filter((batch) => batch.length >= 1 && batch.length <= 3) : [];
}

function suggestionHistory(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => SuggestionHistoryEntrySchema.safeParse(entry)).filter((result) => result.success).map((result) => result.data).slice(-100) : [];
}

export function nodeToPersistence(node: ExplorationNode): PersistedNode {
  return PersistedNodeSchema.parse({
    id: node.id,
    parentId: node.parentId,
    parentIds: node.parentIds?.length ? node.parentIds : node.parentId ? [node.parentId] : [],
    title: node.title,
    description: node.description,
    status: node.status,
    branchStatus: node.branchStatus,
    state: node.state,
    origin: node.origin,
    generationId: node.generationId,
    mergedInto: node.mergedInto,
    activeChildIds: node.activeChildIds,
    activeSuggestionIds: node.activeSuggestionIds,
    suggestionHistory: node.suggestionHistory,
    createdAt: node.createdAt,
    rejectedOptions: node.rejectedOptions,
    alternativeGenerationCount: node.alternativeGenerationCount,
    alternativeBatches: node.alternativeBatches,
    error: node.error,
  });
}

function stateFromRows(row: typeof explorations.$inferSelect, rows: typeof explorationNodes.$inferSelect[], generationRows: typeof explorationGenerations.$inferSelect[] = [], edgeRows: typeof explorationNodeEdges.$inferSelect[] = []): ExplorationState {
  const childrenByParent = new Map<string, string[]>();
  const parentsByChild = new Map<string, string[]>();
  for (const node of rows) {
    if (!node.parentId) continue;
    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node.id);
    childrenByParent.set(node.parentId, children);
    parentsByChild.set(node.id, [node.parentId]);
  }
  for (const edge of edgeRows) {
    const children = childrenByParent.get(edge.parentNodeId) ?? [];
    if (!children.includes(edge.childNodeId)) children.push(edge.childNodeId);
    childrenByParent.set(edge.parentNodeId, children);
    const parents = parentsByChild.get(edge.childNodeId) ?? [];
    if (!parents.includes(edge.parentNodeId)) parents.push(edge.parentNodeId);
    parentsByChild.set(edge.childNodeId, parents);
  }
  const nodes: Record<string, ExplorationNode> = {};
  for (const node of rows) {
    nodes[node.id] = {
      id: node.id,
      parentId: parentsByChild.get(node.id)?.[0] ?? node.parentId,
      parentIds: parentsByChild.get(node.id) ?? (node.parentId ? [node.parentId] : []),
      title: node.title,
      description: node.description,
      status: node.status === "explored" ? "explored" : "available",
      branchStatus: node.branchStatus === "discarded" ? "discarded" : "active",
      state: node.state === "discarded" || node.branchStatus === "discarded" ? "discarded" : node.state === "favorite" || node.state === "conclusion" || node.state === "merged" ? node.state : "active",
      origin: node.origin === "manual" || node.origin === "merge" ? node.origin : "ai",
      ...(node.generationId ? { generationId: node.generationId } : {}),
      children: childrenByParent.get(node.id) ?? [],
      activeChildIds: Array.isArray(node.activeChildIds) ? node.activeChildIds.filter((id): id is string => typeof id === "string").slice(0, 100) : [],
      activeSuggestionIds: Array.isArray(node.activeSuggestionIds) ? node.activeSuggestionIds.filter((id): id is string => typeof id === "string").slice(0, 100) : [],
      suggestionHistory: suggestionHistory(node.suggestionHistory),
      createdAt: node.createdAt.toISOString(),
      rejectedOptions: options(node.rejectedOptions),
      alternativeGenerationCount: Math.max(0, node.alternativeGenerationCount),
      alternativeBatches: optionsBatches(node.alternativeBatches),
      expansionCache: {},
      ...(node.error ? { error: node.error } : {}),
    };
  }
  for (const mergeNode of Object.values(nodes).filter((node) => node.origin === "merge")) {
    const parentIds = parentsByChild.get(mergeNode.id) ?? (mergeNode.parentId ? [mergeNode.parentId] : []);
    for (const parentId of parentIds) {
      const parent = nodes[parentId];
      if (parent && !parent.mergedInto) nodes[parentId] = { ...parent, mergedInto: mergeNode.id };
    }
  }
  const rootNodeId = row.rootNodeId ?? rows.find((node) => !node.parentId)?.id ?? "root";
  const activeCandidate = row.currentNodeId ? nodes[row.currentNodeId] : undefined;
  const activeNodeId = activeCandidate?.mergedInto ?? (activeCandidate ? activeCandidate.id : rootNodeId);
  return {
    id: row.id,
    initialIdea: row.initialIdea,
    language: (row.language === "en" || row.language === "es" ? row.language : "auto") as LanguagePreference,
    rootNodeId,
    nodes,
    generations: Object.fromEntries(generationRows.map((generation) => [generation.id, { id: generation.id, nodeId: generation.nodeId, ...(generation.steer ? { steer: generation.steer } : {}), createdAt: generation.createdAt.toISOString() }])),
    activeNodeId,
    ...(row.goal ? { goal: row.goal } : {}),
    constraints: Array.isArray(row.constraints) ? row.constraints.filter((item): item is string => typeof item === "string").slice(0, 20) : [],
    ...(row.summary ? { summary: row.summary } : {}),
    ...(row.conclusionNodeId ? { conclusionNodeId: row.conclusionNodeId } : {}),
    resolutionStatus: row.resolutionStatus === "resolved" ? "resolved" : "active",
    ...(row.resolvedAt ? { resolvedAt: row.resolvedAt.toISOString() } : {}),
    ...(row.synthesis ? (() => { const parsed = ExplorationSynthesisSchema.safeParse(row.synthesis); return parsed.success ? { synthesis: parsed.data, synthesisStale: row.synthesisStale || parsed.data.sourceRevision < row.revision } : {}; })() : {}),
    ...(row.journeySummary ? { journeySummary: row.journeySummary as ExplorationState["journeySummary"] } : {}),
    ...(row.journeySummaryPathKey ? { journeySummaryPathKey: row.journeySummaryPathKey } : {}),
    ...(row.steer ? { steer: row.steer } : {}),
    ...(row.shareId ? { shareId: row.shareId } : {}),
    isShared: row.isShared,
    remoteRevision: row.revision,
  };
}

export type StoredExploration = {
  row: typeof explorations.$inferSelect;
  state: ExplorationState;
  nodes: typeof explorationNodes.$inferSelect[];
};

export function publicExplorationState(state: ExplorationState): ExplorationState {
  const visibleIds = new Set<string>();
  function visit(nodeId: string) {
    const node = state.nodes[nodeId];
    if (!node || node.branchStatus === "discarded" || visibleIds.has(nodeId)) return;
    visibleIds.add(nodeId);
    getVisibleChildren(state, nodeId).forEach((child) => visit(child.id));
  }
  visit(state.rootNodeId);
  const nodes = Object.fromEntries([...visibleIds].map((id) => {
    const node = state.nodes[id];
    return [id, {
      ...node,
      children: node.children.filter((childId) => visibleIds.has(childId)),
      activeChildIds: node.activeChildIds.filter((childId) => visibleIds.has(childId)),
      activeSuggestionIds: node.activeSuggestionIds.filter((childId) => visibleIds.has(childId)),
      suggestionHistory: [],
      rejectedOptions: [],
      alternativeGenerationCount: 0,
      alternativeBatches: [],
      expansionCache: {},
    }];
  }));
  return { ...state, nodes, activeNodeId: visibleIds.has(state.activeNodeId) ? state.activeNodeId : state.rootNodeId };
}

function legacyState(row: typeof explorations.$inferSelect) {
  const parsed = row.snapshot ? parseExplorationState(row.snapshot) : null;
  if (!parsed) return null;
  return ExplorationStateSchema.parse({
    ...parsed,
    id: row.id,
    shareId: row.shareId ?? undefined,
    isShared: row.isShared,
    remoteRevision: row.revision,
  });
}

export async function getStoredExploration(id: string): Promise<StoredExploration | null> {
  const db = getDb();
  const row = (await db.select().from(explorations).where(eq(explorations.id, id)).limit(1))[0];
  if (!row) return null;
  const nodes = await db.select().from(explorationNodes).where(eq(explorationNodes.explorationId, id)).orderBy(asc(explorationNodes.createdAt), asc(explorationNodes.id));
  const generations = await db.select().from(explorationGenerations).where(eq(explorationGenerations.explorationId, id)).orderBy(asc(explorationGenerations.createdAt), asc(explorationGenerations.id));
  const edges = await db.select().from(explorationNodeEdges).where(eq(explorationNodeEdges.explorationId, id));
  if (nodes.length) return { row, nodes, state: stateFromRows(row, nodes, generations, edges) };
  const state = legacyState(row);
  return state ? { row, nodes, state } : null;
}

export async function listOwnedExplorations(userId: string) {
  return getDb().select({ id: explorations.id, createdAt: explorations.createdAt, updatedAt: explorations.updatedAt, isShared: explorations.isShared }).from(explorations).where(eq(explorations.userId, userId)).orderBy(sql`${explorations.updatedAt} desc`);
}

export async function deleteStoredExploration(id: string, userId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const deleted = (await tx.delete(explorations).where(and(eq(explorations.id, id), eq(explorations.userId, userId))).returning({ id: explorations.id }))[0];
    if (!deleted) return false;
    await tx.delete(productEvents).where(eq(productEvents.subjectKey, explorationEventKey(id)));
    return true;
  });
}

export async function getPublicExploration(shareId: string): Promise<StoredExploration | null> {
  const db = getDb();
  const row = (await db.select().from(explorations).where(and(eq(explorations.isShared, true), or(eq(explorations.shareId, shareId), eq(explorations.slug, shareId)))).limit(1))[0];
  if (!row) return null;
  const nodes = await db.select().from(explorationNodes).where(eq(explorationNodes.explorationId, row.id)).orderBy(asc(explorationNodes.createdAt), asc(explorationNodes.id));
  const generations = await db.select().from(explorationGenerations).where(eq(explorationGenerations.explorationId, row.id)).orderBy(asc(explorationGenerations.createdAt), asc(explorationGenerations.id));
  const edges = await db.select().from(explorationNodeEdges).where(eq(explorationNodeEdges.explorationId, row.id));
  if (nodes.length) return { row, nodes, state: stateFromRows(row, nodes, generations, edges) };
  const state = legacyState(row);
  return state ? { row, nodes, state } : null;
}

async function insertNodes(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], explorationId: string, nodes: PersistedNode[]) {
  if (!nodes.length) return;
  await tx.insert(explorationNodes).values(nodes.map((node) => ({
    explorationId,
    id: node.id,
    parentId: node.parentId,
    title: node.title,
    description: node.description,
    status: node.status,
      branchStatus: node.branchStatus,
      state: node.state,
      origin: node.origin,
      generationId: node.generationId,
      activeChildIds: node.activeChildIds,
      activeSuggestionIds: node.activeSuggestionIds,
      suggestionHistory: node.suggestionHistory,
    rejectedOptions: node.rejectedOptions,
    alternativeGenerationCount: node.alternativeGenerationCount,
    alternativeBatches: node.alternativeBatches,
    error: node.error,
    createdAt: new Date(node.createdAt),
    updatedAt: new Date(),
  }))).onConflictDoUpdate({
    target: [explorationNodes.explorationId, explorationNodes.id],
    set: {
      parentId: sql`excluded.parent_id`,
      title: sql`excluded.title`,
      description: sql`excluded.description`,
      status: sql`excluded.status`,
      branchStatus: sql`excluded.branch_status`,
      state: sql`excluded.state`,
      origin: sql`excluded.origin`,
      generationId: sql`excluded.generation_id`,
      activeChildIds: sql`excluded.active_child_ids`,
      activeSuggestionIds: sql`excluded.active_suggestion_ids`,
      suggestionHistory: sql`excluded.suggestion_history`,
      rejectedOptions: sql`excluded.rejected_options`,
      alternativeGenerationCount: sql`excluded.alternative_generation_count`,
      alternativeBatches: sql`excluded.alternative_batches`,
      error: sql`excluded.error`,
      updatedAt: new Date(),
    },
  });
  const edges = nodes.flatMap((node) => (node.parentIds.length ? node.parentIds : node.parentId ? [node.parentId] : []).map((parentNodeId) => ({ explorationId, parentNodeId, childNodeId: node.id, createdAt: new Date(node.createdAt) })));
  if (edges.length) await tx.insert(explorationNodeEdges).values(edges).onConflictDoNothing();
}

async function insertGenerations(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], explorationId: string, generations: ExplorationGeneration[]) {
  if (!generations.length) return;
  const parsed = generations.map((generation) => PersistedGenerationSchema.parse(generation));
  await tx.insert(explorationGenerations).values(parsed.map((generation) => ({ ...generation, explorationId, createdAt: new Date(generation.createdAt) }))).onConflictDoNothing({ target: explorationGenerations.id });
}

export async function createStoredExploration(initialIdea: string, language: LanguagePreference, userId?: string, goal?: string, constraints: string[] = []) {
  const state = createExploration(initialIdea, language);
  state.goal = goal?.trim() || undefined;
  state.constraints = constraints;
  return createStoredExplorationFromState(state, userId);
}

export async function createStoredExplorationFromState(source: ExplorationState, userId?: string) {
  const state = { ...source, shareId: undefined, isShared: false, remoteRevision: 0 };
  const id = randomBytes(16).toString("hex");
  const token = createEditToken();
  state.id = id;
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.insert(explorations).values({ id, initialIdea: state.initialIdea, goal: state.goal, constraints: state.constraints, summary: state.summary, conclusionNodeId: state.conclusionNodeId, resolutionStatus: state.resolutionStatus, resolvedAt: state.resolvedAt ? new Date(state.resolvedAt) : undefined, synthesis: state.synthesis, synthesisSourceRevision: state.synthesis?.sourceRevision, synthesisCreatedAt: state.synthesis?.createdAt ? new Date(state.synthesis.createdAt) : undefined, synthesisStale: state.synthesisStale ?? false, language: state.language, rootNodeId: state.rootNodeId, currentNodeId: state.activeNodeId, journeySummary: state.journeySummary, journeySummaryPathKey: state.journeySummaryPathKey, steer: state.steer, editTokenHash: hashEditToken(token), revision: 0, userId });
    await insertNodes(tx, id, Object.values(state.nodes).map(nodeToPersistence));
    await insertGenerations(tx, id, Object.values(state.generations));
  });
  return { id, token, state: { ...state, remoteRevision: 0 } };
}

export async function createForkFromExploration(source: StoredExploration, userId?: string) {
  const token = createEditToken();
  const id = randomBytes(16).toString("hex");
  const sourceState = source.state;
  const generationIdMap = new Map(Object.keys(sourceState.generations).map((generationId) => [generationId, `${id}:${generationId}`]));
  const state = {
    ...sourceState,
    id,
    shareId: undefined,
    isShared: false,
    remoteRevision: 0,
    resolutionStatus: "active" as const,
    resolvedAt: undefined,
    conclusionNodeId: undefined,
    synthesisStale: Boolean(sourceState.synthesis),
    generations: Object.fromEntries(Object.entries(sourceState.generations).map(([generationId, generation]) => [generationIdMap.get(generationId)!, { ...generation, id: generationIdMap.get(generationId)! }])),
    nodes: Object.fromEntries(Object.entries(sourceState.nodes).map(([nodeId, node]) => [nodeId, { ...node, state: node.state === "conclusion" ? "active" as const : node.state, ...(node.generationId && generationIdMap.has(node.generationId) ? { generationId: generationIdMap.get(node.generationId)! } : {}) }])),
  };
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.insert(explorations).values({ id, initialIdea: state.initialIdea, goal: state.goal, constraints: state.constraints, summary: state.summary, conclusionNodeId: state.conclusionNodeId, resolutionStatus: state.resolutionStatus, resolvedAt: state.resolvedAt ? new Date(state.resolvedAt) : undefined, synthesis: state.synthesis, synthesisSourceRevision: state.synthesis?.sourceRevision, synthesisCreatedAt: state.synthesis?.createdAt ? new Date(state.synthesis.createdAt) : undefined, synthesisStale: state.synthesisStale ?? false, language: state.language, rootNodeId: state.rootNodeId, currentNodeId: state.activeNodeId, journeySummary: state.journeySummary, journeySummaryPathKey: state.journeySummaryPathKey, steer: state.steer, editTokenHash: hashEditToken(token), revision: 0, userId });
    await insertNodes(tx, id, Object.values(state.nodes).map(nodeToPersistence));
    await insertGenerations(tx, id, Object.values(state.generations));
  });
  return { id, token, state };
}

export async function createForkFromNode(source: StoredExploration, nodeId: string, userId?: string) {
  const sourceNode = source.state.nodes[nodeId];
  if (!sourceNode || sourceNode.branchStatus === "discarded") throw new ExplorationNotFoundError();
  const state = createExploration(source.state.initialIdea, source.state.language);
  state.goal = source.state.goal;
  state.constraints = [...source.state.constraints];
  state.summary = [source.state.summary, `Forked from: ${sourceNode.title} — ${sourceNode.description}`].filter(Boolean).join("\n\n") || undefined;
  state.nodes[state.rootNodeId] = { ...state.nodes[state.rootNodeId], title: sourceNode.title, description: sourceNode.description };
  return createStoredExplorationFromState(state, userId);
}

export async function shareStoredExploration(id: string) {
  const shareId = randomBytes(16).toString("hex");
  const row = (await getDb().update(explorations).set({ shareId, slug: null, isShared: true, updatedAt: new Date() }).where(eq(explorations.id, id)).returning())[0];
  if (!row) throw new ExplorationNotFoundError();
  return shareId;
}

export async function revokeStoredShare(id: string) {
  await getDb().update(explorations).set({ shareId: null, isShared: false, updatedAt: new Date() }).where(eq(explorations.id, id));
}

export async function persistExploration(id: string, revision: number, currentNodeId: string, nodes: PersistedNode[], journeySummary?: ExplorationState["journeySummary"] | null, journeySummaryPathKey?: string | null, steer?: string | null, generations: ExplorationGeneration[] = [], goal?: string | null, constraints: string[] = [], summary?: string | null, conclusionNodeId?: string | null, resolutionStatus: "active" | "resolved" = "active", resolvedAt?: string | null, synthesis?: ExplorationState["synthesis"] | null, synthesisStale = false) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const updated = (await tx.update(explorations).set({ currentNodeId, goal: goal ?? null, constraints, summary: summary ?? null, conclusionNodeId: conclusionNodeId ?? null, resolutionStatus, resolvedAt: resolvedAt ? new Date(resolvedAt) : null, synthesis: synthesis ?? null, synthesisSourceRevision: synthesis?.sourceRevision ?? null, synthesisCreatedAt: synthesis?.createdAt ? new Date(synthesis.createdAt) : null, synthesisStale, journeySummary: journeySummary ?? null, journeySummaryPathKey: journeySummaryPathKey ?? null, steer: steer ?? null, revision: sql`${explorations.revision} + 1`, updatedAt: new Date() }).where(and(eq(explorations.id, id), eq(explorations.revision, revision))).returning({ revision: explorations.revision }))[0];
    if (!updated) throw new ExplorationRevisionError();
    await insertNodes(tx, id, nodes);
    await insertGenerations(tx, id, generations);
    return updated.revision;
  });
}
