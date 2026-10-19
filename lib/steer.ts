import type { ExpansionOption, ExplorationNode } from "@/lib/types";
import { MAX_STEER_LENGTH, MIN_STEER_LENGTH } from "@/lib/constants";

export function normalizeSteer(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateSteer(value: string) {
  const normalized = normalizeSteer(value);
  if (normalized.length < MIN_STEER_LENGTH) return { ok: false as const, value: normalized, reason: "too-short" };
  if (normalized.length > MAX_STEER_LENGTH) return { ok: false as const, value: normalized, reason: "too-long" };
  if (!/[\p{L}\p{N}]/u.test(normalized)) return { ok: false as const, value: normalized, reason: "symbols-only" };
  return { ok: true as const, value: normalized };
}

export function cacheExpansion(node: ExplorationNode, key: string, options: ExpansionOption[]): ExplorationNode {
  return { ...node, expansionCache: { ...node.expansionCache, [key]: options }, error: undefined };
}
