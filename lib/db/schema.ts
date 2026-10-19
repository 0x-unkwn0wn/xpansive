import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  role: varchar("role", { length: 16 }).notNull().default("user"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailUnique: uniqueIndex("users_email_unique").on(table.email),
}));

export const authSessions = pgTable("auth_sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIndex: index("auth_sessions_user_id_idx").on(table.userId),
}));

export const authMagicLinks = pgTable("auth_magic_links", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  invitationId: varchar("invitation_id", { length: 32 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIndex: index("auth_magic_links_email_idx").on(table.email),
}));

export const invitations = pgTable("invitations", {
  id: varchar("id", { length: 32 }).primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  invitedByUserId: varchar("invited_by_user_id", { length: 64 }).references(() => users.id, { onDelete: "set null" }),
  revokedByUserId: varchar("revoked_by_user_id", { length: 64 }).references(() => users.id, { onDelete: "set null" }),
  providerAcceptedAt: timestamp("provider_accepted_at", { withTimezone: true }),
  providerMessageId: varchar("provider_message_id", { length: 128 }),
  deliveryStatus: varchar("delivery_status", { length: 24 }).notNull().default("not_sent"),
  providerError: varchar("provider_error", { length: 120 }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  deliveryUpdatedAt: timestamp("delivery_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenUnique: uniqueIndex("invitations_token_unique").on(table.tokenHash),
  emailIndex: index("invitations_email_idx").on(table.email),
}));

export const betaAccess = pgTable("beta_access", {
  userId: varchar("user_id", { length: 64 }).primaryKey().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const commercialPlans = pgTable("commercial_plans", {
  userId: varchar("user_id", { length: 64 }).primaryKey().references(() => users.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 32 }).notNull().default("beta"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const explorations = pgTable("explorations", {
  id: varchar("id", { length: 32 }).primaryKey(),
  slug: varchar("slug", { length: 16 }).unique(),
  initialIdea: text("initial_idea").notNull(),
  goal: varchar("goal", { length: 500 }),
  constraints: jsonb("constraints").notNull().default([]),
  summary: text("summary"),
  conclusionNodeId: varchar("conclusion_node_id", { length: 80 }),
  resolutionStatus: varchar("resolution_status", { length: 16 }).notNull().default("active"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  synthesis: jsonb("synthesis"),
  synthesisSourceRevision: integer("synthesis_source_revision"),
  synthesisCreatedAt: timestamp("synthesis_created_at", { withTimezone: true }),
  synthesisStale: boolean("synthesis_stale").notNull().default(false),
  snapshot: jsonb("snapshot"),
  language: varchar("language", { length: 8 }).default("auto").notNull(),
  rootNodeId: varchar("root_node_id", { length: 80 }),
  currentNodeId: varchar("current_node_id", { length: 80 }),
  shareId: varchar("share_id", { length: 32 }).unique(),
  editTokenHash: varchar("edit_token_hash", { length: 64 }),
  isShared: boolean("is_shared").default(false).notNull(),
  journeySummary: jsonb("journey_summary"),
  journeySummaryPathKey: text("journey_summary_path_key"),
  steer: varchar("steer", { length: 100 }),
  revision: integer("revision").default(0).notNull(),
  userId: varchar("user_id", { length: 64 }).references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIndex: index("explorations_user_id_idx").on(table.userId),
}));

export const explorationNodes = pgTable("exploration_nodes", {
  explorationId: varchar("exploration_id", { length: 32 }).notNull().references(() => explorations.id, { onDelete: "cascade" }),
  id: varchar("id", { length: 80 }).notNull(),
  parentId: varchar("parent_id", { length: 80 }),
  title: varchar("title", { length: 280 }).notNull(),
  description: varchar("description", { length: 240 }).notNull().default(""),
  status: varchar("status", { length: 16 }).notNull(),
  branchStatus: varchar("branch_status", { length: 16 }).notNull().default("active"),
  state: varchar("state", { length: 16 }).notNull().default("active"),
  origin: varchar("origin", { length: 16 }).notNull().default("ai"),
  generationId: varchar("generation_id", { length: 120 }),
  activeChildIds: jsonb("active_child_ids").notNull().default([]),
  activeSuggestionIds: jsonb("active_suggestion_ids").notNull().default([]),
  suggestionHistory: jsonb("suggestion_history").notNull().default([]),
  rejectedOptions: jsonb("rejected_options").notNull().default([]),
  alternativeGenerationCount: integer("alternative_generation_count").notNull().default(0),
  alternativeBatches: jsonb("alternative_batches").notNull().default([]),
  error: varchar("error", { length: 300 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.explorationId, table.id] }),
}));

/** Normalized DAG edges. Legacy nodes keep parent_id as a compatibility column. */
export const explorationNodeEdges = pgTable("exploration_node_edges", {
  explorationId: varchar("exploration_id", { length: 32 }).notNull().references(() => explorations.id, { onDelete: "cascade" }),
  parentNodeId: varchar("parent_node_id", { length: 80 }).notNull(),
  childNodeId: varchar("child_node_id", { length: 80 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.explorationId, table.parentNodeId, table.childNodeId] }),
  childIndex: index("exploration_node_edges_child_idx").on(table.explorationId, table.childNodeId),
}));

export const waitlistEntries = pgTable("waitlist_entries", {
  email: varchar("email", { length: 320 }).primaryKey(),
  useCase: text("use_case"),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  invitationConsentGiven: boolean("invitation_consent_given").notNull().default(true),
  invitationConsentedAt: timestamp("invitation_consented_at", { withTimezone: true }).defaultNow().notNull(),
  marketingConsentGiven: boolean("marketing_consent_given").notNull().default(false),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const explorationGenerations = pgTable("exploration_generations", {
  id: varchar("id", { length: 120 }).primaryKey(),
  explorationId: varchar("exploration_id", { length: 32 }).notNull().references(() => explorations.id, { onDelete: "cascade" }),
  nodeId: varchar("node_id", { length: 80 }).notNull(),
  steer: varchar("steer", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  explorationNodeIndex: index("exploration_generations_node_idx").on(table.explorationId, table.nodeId),
}));

export const waitlistRateLimits = pgTable("waitlist_rate_limits", {
  key: varchar("key", { length: 128 }).primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  requestCount: integer("request_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authRateLimits = pgTable("auth_rate_limits", {
  key: varchar("key", { length: 128 }).primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  requestCount: integer("request_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminAuditLog = pgTable("admin_audit_log", {
  id: varchar("id", { length: 32 }).primaryKey(),
  actorUserId: varchar("actor_user_id", { length: 64 }).references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 64 }).notNull(),
  targetEmail: varchar("target_email", { length: 320 }),
  targetUserId: varchar("target_user_id", { length: 64 }).references(() => users.id, { onDelete: "set null" }),
  targetInvitationId: varchar("target_invitation_id", { length: 32 }).references(() => invitations.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  actorIndex: index("admin_audit_actor_idx").on(table.actorUserId),
  targetEmailIndex: index("admin_audit_target_email_idx").on(table.targetEmail),
}));

export const productEvents = pgTable("product_events", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  eventName: varchar("event_name", { length: 64 }).notNull(),
  dedupeKey: varchar("dedupe_key", { length: 128 }),
  subjectKey: varchar("subject_key", { length: 64 }),
  outcome: varchar("outcome", { length: 24 }),
  actorType: varchar("actor_type", { length: 16 }),
  properties: jsonb("properties").notNull().default({}),
  excluded: boolean("excluded").notNull().default(false),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  eventIndex: index("product_events_name_idx").on(table.eventName),
  userEventIndex: index("product_events_user_name_idx").on(table.userId, table.eventName),
  subjectIndex: index("product_events_subject_idx").on(table.subjectKey, table.occurredAt),
  dedupeUnique: uniqueIndex("product_events_dedupe_unique").on(table.userId, table.eventName, table.dedupeKey),
}));

export const feedbackSubmissions = pgTable("feedback_submissions", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  createdIndex: index("feedback_submissions_created_idx").on(table.createdAt),
}));
