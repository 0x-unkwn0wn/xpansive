import type { ExpansionOption, ExplorationNode } from "@/lib/types";

export function alternativesAreAvailable(node: ExplorationNode, legacyMaxGenerations?: number) {
  void legacyMaxGenerations;
  return Boolean(node.activeChildIds.length);
}

export function rejectedOptionsForAlternative(node: ExplorationNode, currentOptions: ExpansionOption[]) {
  return [...node.rejectedOptions, ...currentOptions];
}

export function applyAlternativeBatch(node: ExplorationNode, batch: ExpansionOption[], legacyCurrentOptions: ExpansionOption[] = []): ExplorationNode {
  return {
    ...node,
    rejectedOptions: legacyCurrentOptions.length ? [...node.rejectedOptions, ...legacyCurrentOptions] : node.rejectedOptions,
    alternativeGenerationCount: node.alternativeGenerationCount + 1,
    alternativeBatches: [...node.alternativeBatches, batch],
    error: undefined,
  };
}
