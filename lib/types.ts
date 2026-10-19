export type ExpansionOption = {
  title: string;
  description: string;
  rationale?: string;
  conceptualType?: string;
};

export type JourneySummary = {
  summary: string;
  keyInsights: string[];
};

export type ExplorationResolutionStatus = "active" | "resolved";
export type ComparisonEntry = {
  nodeId: string;
  title: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  assumptions: string[];
};
export type ComparisonResult = {
  comparisons: ComparisonEntry[];
  keyDifferences: string[];
  tradeOffs: string[];
  situations: string[];
};
export type SynthesisRecommendation = { nodeId?: string; title: string; rationale: string };
export type ExplorationSynthesis = {
  whatWasExplored: string;
  strongestDirections: Array<{ nodeId?: string; title: string; reason: string }>;
  keyTradeoffs: string[];
  importantAssumptions: string[];
  risks: string[];
  openQuestions: string[];
  recommendedDirection: SynthesisRecommendation;
  nextActions: string[];
  sourceRevision: number;
  createdAt: string;
};

export type LanguagePreference = "auto" | "en" | "es";
export type ExplorationView = "explore" | "map";
export type ExplorationNodeStatus = "explored" | "available";
export type ExplorationBranchStatus = "active" | "discarded";
export type ExplorationNodeState = "active" | "discarded" | "favorite" | "conclusion" | "merged";
export type ExplorationNodeOrigin = "ai" | "manual" | "merge";
export type SuggestionHistorySource = "steer" | "discarded";
export type SuggestionHistoryEntry = {
  id: string;
  option: ExpansionOption;
  createdAt: string;
  source: SuggestionHistorySource;
};
export type AIProviderName = "openai" | "anthropic" | "gemini" | "openrouter" | "groq";
export type ProviderModel = { id: string; label: string };
export type ConnectedAIProvider = { provider: AIProviderName; model: string; apiKey: string; maskedKey: string; models: ProviderModel[] };

export type ExplorationNode = {
  id: string;
  parentId: string | null;
  /** Canonical DAG parents. parentId remains the primary/legacy parent for compatibility. */
  parentIds: string[];
  title: string;
  description: string;
  status: ExplorationNodeStatus;
  branchStatus: ExplorationBranchStatus;
  state: ExplorationNodeState;
  origin: ExplorationNodeOrigin;
  generationId?: string;
  /** ID of the fusion result that consumed this branch as an input. */
  mergedInto?: string;
  children: string[];
  activeChildIds: string[];
  activeSuggestionIds: string[];
  suggestionHistory: SuggestionHistoryEntry[];
  createdAt: string;
  rejectedOptions: ExpansionOption[];
  alternativeGenerationCount: number;
  alternativeBatches: ExpansionOption[][];
  expansionCache: Record<string, ExpansionOption[]>;
  error?: string;
};

export type ExplorationGeneration = {
  id: string;
  nodeId: string;
  steer?: string;
  createdAt: string;
};

export type ExplorationState = {
  id: string;
  initialIdea: string;
  language: LanguagePreference;
  rootNodeId: string;
  nodes: Record<string, ExplorationNode>;
  generations: Record<string, ExplorationGeneration>;
  activeNodeId: string;
  goal?: string;
  constraints: string[];
  summary?: string;
  conclusionNodeId?: string;
  resolutionStatus: ExplorationResolutionStatus;
  resolvedAt?: string;
  synthesis?: ExplorationSynthesis;
  synthesisStale?: boolean;
  journeySummary?: JourneySummary;
  journeySummaryPathKey?: string;
  steer?: string;
  shareId?: string;
  isShared?: boolean;
  remoteRevision?: number;
};
