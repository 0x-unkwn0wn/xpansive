import { createHmac, randomBytes } from "node:crypto";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { feedbackSubmissions, productEvents, users } from "@/lib/db/schema";

export const productEventNames = [
  "beta_entry",
  "exploration_started",
  "generation_requested",
  "generation_succeeded",
  "generation_failed",
  "generation_cancelled",
  "first_generation_success",
  "branch_selected",
  "alternative_generation_succeeded",
  "branch_discarded",
  "branch_favorited",
  "exploration_goal_set",
  "constraint_added",
  "steer_applied",
  "branch_generated",
  "manual_branch_added",
  "compare_started",
  "compare_completed",
  "merge_started",
  "merge_completed",
  "synthesis_requested",
  "synthesis_completed",
  "synthesis_regenerated",
  "conclusion_marked",
  "conclusion_changed",
  "conclusion_removed",
  "exploration_resolved",
  "steer_submitted",
  "steer_generation_succeeded",
  "exploration_reopened",
  "return_to_explore",
  "export_completed",
  "saved",
  "share",
  "share_opened_by_recipient",
  "fork",
  "node_forked",
] as const;
export type ProductEventName = typeof productEventNames[number];
export type ProductEventOutcome = "success" | "error" | "cancelled" | "accepted";
export type ProductEventActor = "owner" | "recipient";
export type ProductEventVariant = "initial" | "alternative" | "steer";

type EventProperties = {
  variant?: ProductEventVariant;
  errorCategory?: "invalid_request" | "byok_required" | "rate_limited" | "provider" | "revision" | "unknown";
  source?: "private" | "shared";
  explicit?: boolean;
  branchCount?: number;
  nodeCount?: number;
  depth?: number;
};

const allowedProperties: Partial<Record<ProductEventName, (keyof EventProperties)[]>> = {
  generation_requested: ["variant"],
  generation_succeeded: ["variant"],
  generation_failed: ["variant", "errorCategory"],
  branch_generated: ["variant"],
  compare_started: ["branchCount", "depth"],
  compare_completed: ["branchCount", "depth"],
  merge_started: ["branchCount", "depth"],
  merge_completed: ["branchCount", "depth"],
  synthesis_requested: ["nodeCount", "depth"],
  synthesis_completed: ["nodeCount", "depth"],
  synthesis_regenerated: ["nodeCount", "depth"],
  generation_cancelled: ["variant"],
  first_generation_success: ["variant"],
  alternative_generation_succeeded: ["variant"],
  steer_submitted: ["variant"],
  steer_generation_succeeded: ["variant"],
  share_opened_by_recipient: ["source"],
  fork: ["source"],
  node_forked: ["source"],
  saved: ["explicit"],
};

const eventDefinitions: Record<ProductEventName, string> = {
  beta_entry: "Primera entrada autenticada con acceso beta activo.",
  exploration_started: "Creación confirmada de una exploración persistida.",
  generation_requested: "Solicitud de generación aceptada por el servidor.",
  generation_succeeded: "Respuesta de generación validada y entregada.",
  generation_failed: "Solicitud de generación terminada con una categoría de error controlada.",
  generation_cancelled: "Solicitud cancelada cuando la cancelación es observable.",
  first_generation_success: "Primera generación exitosa observada por usuario.",
  branch_selected: "Selección confirmada de una sugerencia para continuar.",
  alternative_generation_succeeded: "Generación exitosa de una tanda adicional de ramas.",
  branch_discarded: "Descarte confirmado de una sugerencia.",
  branch_favorited: "Rama marcada o desmarcada como favorita.",
  exploration_goal_set: "Objetivo de exploración definido o actualizado.",
  constraint_added: "Restricción añadida a la exploración.",
  steer_applied: "Steer aplicado a una generación.",
  branch_generated: "Rama generada y persistida.",
  manual_branch_added: "Rama añadida manualmente.",
  compare_started: "Comparación iniciada entre ramas de la misma exploración.",
  compare_completed: "Comparación estructurada completada.",
  merge_started: "Fusión iniciada entre dos ramas de la misma exploración.",
  merge_completed: "Fusión estructurada completada.",
  synthesis_requested: "Síntesis global solicitada.",
  synthesis_completed: "Síntesis global completada.",
  synthesis_regenerated: "Síntesis global regenerada.",
  conclusion_marked: "Nodo marcado como conclusión principal.",
  conclusion_changed: "Conclusión principal cambiada.",
  conclusion_removed: "Conclusión principal retirada.",
  exploration_resolved: "Exploración marcada como resuelta.",
  steer_submitted: "Envío confirmado de una instrucción de steer.",
  steer_generation_succeeded: "Generación exitosa después de un steer.",
  exploration_reopened: "Primera apertura tras un periodo de inactividad de la exploración.",
  return_to_explore: "Entrada posterior para iniciar o continuar tras al menos 24 horas.",
  export_completed: "Exportación completada y confirmada; no existe exportación en el producto actual.",
  saved: "Decisión explícita de conservar confirmada; los autosaves no generan este evento.",
  share: "Creación confirmada de un enlace compartido.",
  share_opened_by_recipient: "Apertura autorizada por una persona distinta del propietario.",
  fork: "Fork completado y copia persistida.",
  node_forked: "Fork independiente creado desde un nodo específico.",
};

export function getProductEventsRetentionDays() {
  const parsed = Number.parseInt(process.env.PRODUCT_EVENTS_RETENTION_DAYS ?? "180", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 3650) : 180;
}

export function explorationEventKey(explorationId: string) {
  const secret = process.env.PRODUCT_EVENTS_SECRET ?? process.env.DATABASE_URL ?? "xpansive-product-events";
  return createHmac("sha256", secret).update(`exploration:${explorationId}`).digest("hex");
}

function validateProperties(eventName: ProductEventName, properties: EventProperties = {}) {
  const allowed = new Set(allowedProperties[eventName] ?? []);
  for (const key of Object.keys(properties) as (keyof EventProperties)[]) if (!allowed.has(key)) throw new Error("Unsupported product event property.");
  return properties;
}

export type ProductEventOptions = {
  dedupeKey?: string;
  explorationId?: string;
  outcome?: ProductEventOutcome;
  actorType?: ProductEventActor;
  properties?: EventProperties;
  excludeFromMetrics?: boolean;
};

function normalizeOptions(options?: string | ProductEventOptions): ProductEventOptions {
  return typeof options === "string" ? { dedupeKey: options } : options ?? {};
}

export async function recordProductEvent(userId: string, eventName: ProductEventName, options?: string | ProductEventOptions) {
  const normalized = normalizeOptions(options);
  const properties = validateProperties(eventName, normalized.properties);
  const dedupeKey = normalized.dedupeKey ?? randomBytes(16).toString("hex");
  const db = getDb();
  const user = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  const result = await db.insert(productEvents).values({
    id: randomBytes(16).toString("hex"),
    userId,
    eventName,
    dedupeKey,
    subjectKey: normalized.explorationId ? explorationEventKey(normalized.explorationId) : null,
    outcome: normalized.outcome ?? null,
    actorType: normalized.actorType ?? null,
    properties,
    excluded: normalized.excludeFromMetrics ?? user?.role === "admin",
  }).onConflictDoNothing({ target: [productEvents.userId, productEvents.eventName, productEvents.dedupeKey] }).returning({ id: productEvents.id });
  return Boolean(result[0]);
}

export async function tryRecordProductEvent(userId: string, eventName: ProductEventName, options?: string | ProductEventOptions) {
  try { return await recordProductEvent(userId, eventName, options); } catch { return false; }
}

export async function recordBetaEntry(userId: string) {
  return tryRecordProductEvent(userId, "beta_entry", "beta_entry");
}

export async function recordReturnToExplore(userId: string) {
  try {
    const last = (await getDb().select({ occurredAt: productEvents.occurredAt }).from(productEvents).where(and(eq(productEvents.userId, userId), inArray(productEvents.eventName, ["beta_entry", "return_to_explore"]))).orderBy(desc(productEvents.occurredAt)).limit(1))[0];
    if (!last || Date.now() - last.occurredAt.getTime() < 24 * 60 * 60 * 1000) return false;
    const bucket = new Date().toISOString().slice(0, 13);
    return await tryRecordProductEvent(userId, "return_to_explore", `return:${bucket}`);
  } catch { return false; }
}

export async function recordExplorationReopen(userId: string, explorationId: string) {
  try {
    const subjectKey = explorationEventKey(explorationId);
    const last = (await getDb().select({ occurredAt: productEvents.occurredAt }).from(productEvents).where(and(eq(productEvents.userId, userId), eq(productEvents.subjectKey, subjectKey))).orderBy(desc(productEvents.occurredAt)).limit(1))[0];
    if (!last || Date.now() - last.occurredAt.getTime() < 30 * 60 * 1000) return false;
    return await tryRecordProductEvent(userId, "exploration_reopened", { dedupeKey: `reopen:${new Date().toISOString().slice(0, 13)}`, explorationId, outcome: "success" });
  } catch { return false; }
}

export async function createFeedback(userId: string, message: string) {
  await getDb().insert(feedbackSubmissions).values({ id: randomBytes(16).toString("hex"), userId, message });
}

export async function deleteExplorationProductEvents(explorationId: string) {
  await getDb().delete(productEvents).where(eq(productEvents.subjectKey, explorationEventKey(explorationId)));
}

export async function getProductAggregates() {
  const db = getDb();
  const now = new Date();
  const periodStart = new Date(now.getTime() - getProductEventsRetentionDays() * 24 * 60 * 60 * 1000);
  const inPeriod = and(gte(productEvents.occurredAt, periodStart), eq(productEvents.excluded, false));
  const eventRows = await db.select({ eventName: productEvents.eventName, events: sql<number>`count(*)`, users: sql<number>`count(distinct ${productEvents.userId})`, explorations: sql<number>`count(distinct ${productEvents.subjectKey})` }).from(productEvents).where(inPeriod).groupBy(productEvents.eventName).orderBy(desc(sql`count(*)`));
  const feedback = (await db.select({ count: sql<number>`count(*)` }).from(feedbackSubmissions).where(gte(feedbackSubmissions.createdAt, periodStart)))[0];
  const sequenceRows = await db.select({ subjectKey: productEvents.subjectKey, eventName: productEvents.eventName, outcome: productEvents.outcome, actorType: productEvents.actorType, properties: productEvents.properties, occurredAt: productEvents.occurredAt }).from(productEvents).where(and(inPeriod, isNotNull(productEvents.subjectKey))).orderBy(productEvents.subjectKey, productEvents.occurredAt).limit(2000);
  const sequences = new Map<string, { events: Array<{ eventName: string; outcome: string | null; actorType: string | null; properties: unknown; occurredAt: string }> }>();
  for (const row of sequenceRows) {
    if (!row.subjectKey) continue;
    const sequence = sequences.get(row.subjectKey) ?? { events: [] };
    sequence.events.push({ eventName: row.eventName, outcome: row.outcome, actorType: row.actorType, properties: row.properties, occurredAt: row.occurredAt.toISOString() });
    sequences.set(row.subjectKey, sequence);
  }
  const sequenceList = [...sequences.values()].slice(0, 100).map((sequence, index) => ({ explorationRef: `exploration-${index + 1}`, ...sequence }));
  const userEventRows = await db.select({ userId: productEvents.userId, eventName: productEvents.eventName }).from(productEvents).where(inPeriod).groupBy(productEvents.userId, productEvents.eventName);
  const userEvents = new Map<string, Set<string>>();
  for (const row of userEventRows) (userEvents.get(row.userId) ?? (userEvents.set(row.userId, new Set()), userEvents.get(row.userId)!)).add(row.eventName);
  const userMetric = (denominatorEvent: ProductEventName, numeratorEvent: ProductEventName) => {
    const denominatorUsers = [...userEvents.values()].filter((events) => events.has(denominatorEvent));
    return { numerator: denominatorUsers.filter((events) => events.has(numeratorEvent)).length, denominator: denominatorUsers.length };
  };
  const subjectMetric = (trigger: ProductEventName, success: ProductEventName) => {
    let denominator = 0;
    let numerator = 0;
    for (const sequence of sequences.values()) {
      const triggerIndex = sequence.events.findIndex((event) => event.eventName === trigger);
      if (triggerIndex < 0) continue;
      denominator += 1;
      if (sequence.events.slice(triggerIndex + 1).some((event) => event.eventName === success && event.outcome === "success")) numerator += 1;
    }
    return { numerator, denominator };
  };
  const startedToFirst = userMetric("exploration_started", "first_generation_success");
  const branchToSuccess = subjectMetric("branch_selected", "generation_succeeded");
  const reopenToContinue = subjectMetric("exploration_reopened", "generation_succeeded");
  const returnToContinue = userMetric("return_to_explore", "generation_succeeded");
  return {
    period: { from: periodStart.toISOString(), to: now.toISOString(), timezone: "UTC", retentionDays: getProductEventsRetentionDays() },
    definitions: eventDefinitions,
    metrics: [
      { key: "started_to_first_generation", definition: "Usuarios con exploración iniciada que completaron al menos una primera generación.", ...startedToFirst },
      { key: "branch_selection_to_success", definition: "Exploraciones con selección de rama que después tuvieron una generación exitosa.", ...branchToSuccess },
      { key: "reopen_to_continue", definition: "Exploraciones reabiertas que después tuvieron una generación exitosa.", ...reopenToContinue },
      { key: "return_to_continue", definition: "Usuarios con regreso en periodo posterior que después tuvieron una generación exitosa; no implica valor ni intención.", ...returnToContinue },
    ],
    events: eventRows.map((row) => ({ eventName: row.eventName, events: Number(row.events), users: Number(row.users), explorations: Number(row.explorations) })),
    feedbackCount: Number(feedback?.count ?? 0),
    sequences: sequenceList,
  };
}
