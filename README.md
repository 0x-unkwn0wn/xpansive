# Xpansive

Xpansive is a quiet interface for expanding an idea into three conceptually different directions, then continuing down whichever path is most interesting.

## Stack

Next.js App Router, React, strict TypeScript, Tailwind CSS, Zod, and PostgreSQL with Drizzle ORM.

## Requirements

Node.js 20+ and npm. PostgreSQL is required for authentication, beta access, persistence, editable `/e/:id` URLs, Share and Fork.

## Local setup

```bash
npm install
Copy-Item .env.example .env.local
npm run db:up
npm run db:migrate
npm run dev
```

`npm run db:up` starts the local PostgreSQL service defined in `docker-compose.yml`.
The default local connection is `postgresql://xpansive:xpansive_local@localhost:5432/xpansive`.
Docker Desktop must be running before starting the service.

Xpansive uses the AI provider keys connected by the user. Multiple providers can stay connected in the current tab, while one active provider is selected for the next request. Keys are kept only in memory, sent only to the selected provider through the server request, and cleared when the tab/session is closed or the user disconnects (BYOK). Xpansive does not persist them in browser storage or the database.

## Environment variables

- `DATABASE_URL`: PostgreSQL connection string, required for persistence, Share and Fork.
- `AUTH_APP_URL`: public origin used when producing invitation URLs; falls back to the request origin.
- `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_SECRET`, `ADMIN_BOOTSTRAP_CONFIRMATION`: local one-time first-admin bootstrap inputs; never expose them to the browser.
- `EMAIL_PROVIDER`: set to `resend` to enable transactional delivery.
- `RESEND_API_KEY`: server-only Resend API key; never expose it to the browser.
- `AUTH_EMAIL_FROM`: verified sender, for example `Xpansive <auth@your-domain.example>`.
- `AUTH_EMAIL_REPLY_TO`: optional reply-to address.
- `RESEND_WEBHOOK_SECRET`: Resend webhook signing secret used to update delivery status.
- `WAITLIST_ALLOWED_ORIGINS`: optional comma-separated browser origins for a separately hosted landing; leave empty for same-origin requests.
- `PRODUCT_EVENTS_SECRET`: optional server-only secret used to derive pseudonymous exploration references in measurement; it is never sent to the browser.
- `PRODUCT_EVENTS_RETENTION_DAYS`: configurable retention for product events and feedback; defaults to 180 days. Run `npm run ops:purge` from a scheduled operational job; it also removes expired sessions, magic links and rate-limit buckets.

`/health` is a lightweight liveness endpoint. Configure the production platform readiness check to use `/ready`, which verifies that the PostgreSQL schema is reachable.

The public landing page stores waitlist entries in `waitlist_entries`, reusing the former newsletter table through a migration. Email is normalized and unique; the optional use case, invitation consent, optional marketing consent, and lifecycle status are stored server-side. Joining the waitlist never creates a user or grants beta access.

## Email authentication and invitations

Authentication uses the existing PostgreSQL-backed custom flow. `POST /api/beta/invitations` accepts only an email already present on the waitlist, sends an individual invitation, and never returns its token or URL. `POST /api/auth/request` sends a one-time access link only to an invited or already active beta user. Both endpoints return generic results for eligible and ineligible addresses; persistent limits are stored in `auth_rate_limits`. Email must be configured: missing or failed delivery returns an error and does not report a successful send.

The invitation and magic-link token hashes are stored separately, expire, and are consumed with conditional PostgreSQL updates. Email links use a URL fragment; the browser posts the token only after an explicit confirmation, so the token is not sent in the HTTP request URL. Sessions are `httpOnly`, `SameSite=Lax` cookies and state-changing requests require a same-origin `Origin` or `Referer` check. A beta-access revocation is checked on every protected request, including requests made with an existing session.

Resend setup is external: create and verify the sending domain in Resend, publish the DNS records Resend provides (including SPF and DKIM), then set the variables above. Administrative browser requests use the signed-in session plus a same-origin `Origin`/`Referer`; no client-provided secret grants admin access. No Server Actions exist in this repository; any future state-changing Server Action must call the same authorization/CSRF helpers before changing data.

## Private beta administration

`/admin` is rendered only for a signed-in user with `users.role = 'admin'`. Every admin GET and mutation re-checks that role on the server; the client cannot grant itself permissions. The panel paginates and filters the existing waitlist by status, request date, email, and use case. It shows invitation expiry, provider acceptance, delivery webhook status, provider errors, and user acceptance/entry dates.

Batch sends are sequential and partial: already-active users and live invitations are skipped, provider failures are recorded, and retrying a failed item creates a new invitation without duplicating a live one. Resending explicitly creates a new invitation and revokes the previous one first. Invitation/access revocations require confirmation in the UI, are audited with the acting admin, and do not delete explorations.

To assign the first administrator, run the local one-time procedure with `ADMIN_BOOTSTRAP_EMAIL`, a 32+ character `ADMIN_BOOTSTRAP_SECRET`, and `ADMIN_BOOTSTRAP_CONFIRMATION=I_UNDERSTAND_FIRST_ADMIN`:

```bash
npm run admin:bootstrap
```

If the email is not yet a verified user, the first run creates and sends a one-time bootstrap invitation through the configured email provider. The recipient must accept it at `/auth/verify`; then run `npm run admin:bootstrap` again to assign the role. If a bootstrap invitation is already pending, the command does not create a duplicate. The procedure is not an HTTP endpoint, has no default password, requires that no administrator exists, and never marks an email as verified without the recipient accepting the invitation. `admin_audit_log` records who created, resent, failed, or revoked invitations and who changed beta access; it never stores tokens.

For delivery updates, register `https://your-origin.example/api/webhooks/resend` in Resend for email events and set `RESEND_WEBHOOK_SECRET`. The webhook verifies the raw-body signature and updates `accepted`, `delivered`, `delayed`, `bounced`, or `failed`; without the webhook, the panel can only show provider acceptance, not recipient delivery. The existing `BETA_ADMIN_SECRET` header is no longer an authorization mechanism.

## Public waitlist integration

The landing is part of this repository and uses the existing `POST /api/newsletter` route as the waitlist contract. It accepts JSON with `email` (required), `useCase` (optional), `invitationConsent: true` (required), `marketingConsent` (optional boolean), `language`, and the empty honeypot field `website`. Emails are trimmed and lowercased before validation and storage.

Successful new and duplicate submissions return the same body: `{ "ok": true }`. The API does not reveal whether the address was already registered. Invalid input returns `400`; oversized requests return `413`; persistent abuse limiting returns `429`. The limiter stores only a hash of the client address plus user agent in `waitlist_rate_limits`, and uses an atomic PostgreSQL upsert. The endpoint is same-origin by default; when the landing is separate, set `WAITLIST_ALLOWED_ORIGINS` and use the configured origins for the browser CORS preflight. CORS is only an origin check; the persistent limiter remains active.

Turnstile is not enabled. If it is added later, the token must be sent by the landing and verified server-side with the provider secret before writing `waitlist_entries`; no browser secret belongs in the landing.

Authentication is passwordless: invited users receive a one-time link, which creates a server-side session in `auth_sessions`. `/app`, `/e/:id`, generation, summary, AI validation, save, Share, and Fork require an authenticated user with `beta_access.status = 'active'`. Shared reads at `/x/:id` and `/api/shared/:shareId` also require an authenticated beta user during the private beta. Login links preserve a safe internal `next` path so shared links return to the intended exploration after authentication. The commercial `commercial_plans` table is intentionally separate and starts at `beta`.

Existing anonymous explorations are not assigned from an ID or Share URL. `POST /api/explorations/:id/claim` can be called only while authenticated with active beta access and while presenting the original edit-token cookie. If that proof is unavailable, the exploration remains unassigned and its data is preserved. Public Share pages remain read-only by design; public Fork now requires beta access and assigns the new exploration to the authenticated user.

Private listing (`GET /api/explorations`), reads, edits, branch changes, and deletion are filtered by the server-side owner. The app exposes the saved-exploration library and deletion action. `DELETE /api/explorations/:id` never accepts a client-supplied owner and removes the exploration’s scoped measurement rows in the same database transaction. `DELETE /api/account` deletes a non-admin user's account, sessions, explorations, feedback, waitlist/invitation records and associated audit references transactionally. Share reads are beta-authenticated, owner revocation removes the link, and Fork copies only the visible state into a new exploration owned by the caller; no edit token, BYOK key, or share permission is copied.

## Beta learning signals and feedback

The authenticated app records a closed server-side catalog: `beta_entry`, `exploration_started`, `generation_requested`, `generation_succeeded`, `generation_failed`, `generation_cancelled` when observable, `first_generation_success`, `branch_selected`, `alternative_generation_succeeded`, `branch_discarded`, `steer_submitted`, `steer_generation_succeeded`, `exploration_reopened`, `return_to_explore`, `export_completed` only if a future export can be confirmed, `share`, `share_opened_by_recipient`, and `fork`. Events contain an internal user reference, operation deduplication key, timestamps, controlled outcome/actor fields, and—when needed—a keyed pseudonymous exploration reference. They do not contain ideas, prompts, node text, AI responses, emails, API keys, tokens, complete URLs, or raw browser metadata. Admin activity is excluded automatically; test activity can be explicitly marked excluded by server-side instrumentation.

Definitions used for validation:

- Activation: the first authenticated visit to `/app` while beta access is active (`beta_entry`), deduplicated per user.
- Return to explore: an authenticated visit to `/app` or `/e/:id` at least 24 hours after the last recorded beta entry/return, deduplicated by time bucket.
- Exploration start: the server has persisted a new exploration with the authenticated session owner.
- Generation request/result: the server accepts a generation request and records only a controlled outcome (`success`, `error`, or `cancelled`); a failed generation never counts as completed. Initial, alternative, and steer variants remain distinct.
- Branch selection/discard/steer: the authenticated owner sends one of the closed event types for the current exploration; the request contains only a validated operation identifier.
- First generation: the first successful server response from the generation endpoint, regardless of which supported branch generated it.
- Exploration reopen: an authenticated owner opens a persisted exploration after at least 30 minutes without a scoped event; this is a measurement heuristic, not proof of a new session or value.
- Share opened by recipient: an authenticated beta user other than the owner reads a currently shared exploration. The owner’s own opening is not counted as recipient activity.
- Save: no autosave is counted as a value signal. The current product has autosave but no separate explicit “conserve” action, so `saved` is intentionally not emitted until such an action exists.

The in-app feedback form sends only the text the user voluntarily enters. It does not attach the current exploration, prompt, response, email, API key, URL, or browser fingerprint. Feedback and event rows are retained for `PRODUCT_EVENTS_RETENTION_DAYS` days (180 by default); a production deployment must schedule `npm run product-events:purge`. Deleting an account cascades its rows, and deleting an exploration removes its pseudonymous scoped events. These pseudonymous references remain linkable within the retained operational data and are not described as anonymous.

Administrators can view aggregate event counts, unique users/explorations, definitions, UTC period, numerator/denominator for the initial-generation metric, and content-free per-exploration event sequences at `/admin`; the view does not display exploration content or personal profiles. Technical errors are separate from absence of later events; no session is labelled definitive abandonment. Users with insufficient observation time are not presented as a completed-return cohort. These numbers describe observed product use, not demand, market size, utility, or willingness to pay.

## Commercial plan preparation

`beta_access`, `users.role`, and `commercial_plans` remain separate. Server-side capability checks now sit in `lib/commercial.ts`; current beta users have the existing exploration, save, Share, and Fork capabilities. The configuration has placeholders for `free`, `pro`, and `team` without prices, payments, team functionality, or arbitrary limits. Direct API calls use the same capability checks as the UI and cannot bypass them.

Possible future plan differences to validate—not demonstrated demand—include saved capacity, history depth, organization tools, and exports. No purchase buttons or pricing claims are shown during beta. BYOK means the user's AI provider bills AI usage according to that provider's pricing; Xpansive does not promise permanent free access to future functions.

## Exploration tree and suggestion batches

Each generation, including Alternative and Steer, returns a batch of exactly three suggestions. `children` is the complete tree and is not capped at three. `activeSuggestionIds` identifies the currently selectable suggestions; explored children remain in `activeChildIds` and are never removed by Steer. When Steer replaces un-explored suggestions, their nodes remain preserved but inactive and their options are copied to `suggestionHistory`, which can be restored from “Previous suggestions”.

Discarding the current suggestions can leave a node empty. Xpansive does not regenerate automatically: the user can request another batch or use Steer. The separation is persisted in `exploration_nodes` by migration `0013_suggestion_batches.sql`; existing rows are backfilled from active, non-explored children.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run test:authorization
npm run test:integration
```

## Database and deployment

Generate and apply the Drizzle migration against a PostgreSQL-compatible provider:

```bash
npm run db:generate
npm run db:migrate
```

For local development, stop the database with `npm run db:down` when it is no longer needed.

## Railway production runbook

Xpansive is prepared for Railway rather than Vercel. Railway can detect the Node.js build automatically; use the following service setup:

1. Create a Railway project with a web service connected to the repository and a PostgreSQL service. Link the database service so the web service receives `DATABASE_URL`.
2. Set the web service build command to `npm run build` and the start command to `npm start`.
3. Set the pre-deploy command to `npm run db:migrate`. Railway runs it before the new deployment receives traffic; a failed migration must stop the deployment.
4. Configure the production variables from `.env.example`. Set `AUTH_APP_URL` to the final HTTPS origin and keep all secrets server-side. Validate them with `npm run ops:check-env` using `railway run`.
5. Configure `/health` as the Railway healthcheck path.
6. Add a separate Railway Cron service using this repository and the command `npm run ops:purge`. Run it daily in UTC. The command is intentionally plain Node.js, closes its database connection, and removes expired operational data according to the configured retention.
7. After the first successful migration, run `npm run admin:bootstrap` once from a trusted shell with the bootstrap variables set. Accept the invitation, then run it again to assign the first administrator.
8. Register `/api/webhooks/resend` in Resend, verify the sending domain, and test invitation and magic-link delivery end to end.

Keep `DATABASE_URL` server-side; do not prefix it with `NEXT_PUBLIC_`. Railway's dashboard remains the source for service variables, domains, cron schedule, backups, and deployment approvals.
