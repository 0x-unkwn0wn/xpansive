# Railway production checklist

## Before creating the project

- Push this repository to GitHub and protect `main`.
- Confirm the CI workflow is green.
- Decide the Railway region and create separate `staging` and `production` environments.
- Have the final domain and Resend sending domain ready.

## Staging

1. Create a Railway project and a staging environment.
2. Add a PostgreSQL service and connect its `DATABASE_URL` to the web service.
3. Configure the web service with:
   - Build: `npm run build`
   - Start: `npm start`
   - Pre-deploy: `npm run db:migrate`
   - Liveness healthcheck: `/health`
   - Readiness healthcheck: `/ready`
4. Set the variables from `.env.example`, using staging-only secrets and an HTTPS staging origin.
5. Run `railway run npm run ops:check-env`.
6. Verify the public waitlist, invitation, magic-link with return path, AI validation, exploration library, persistence, autosave conflict recovery, Share, Fork error handling, account deletion, logout, revoke, and admin flows.
7. Run the database-backed integration tests against staging only if the test data is disposable. Never run them against production.

## Production

1. Create the production environment and provision a separate PostgreSQL service.
2. Configure backups/PITR and record how to restore the database.
3. Copy only the required variables into production; generate new secrets.
4. Verify Resend SPF, DKIM, DMARC, sender identity, and webhook signing secret.
5. Deploy with `npm run db:migrate` as the pre-deploy command.
6. Configure the final custom domain, `/health` liveness check and `/ready` readiness check.
7. Run `railway run npm run ops:check-env`.
8. Run `railway run npm run admin:bootstrap` once, accept the invitation, and run it again.
9. Create the separate Cron service for `npm run ops:purge` with schedule `0 3 * * *` (03:00 UTC). It removes expired sessions/magic links and applies the configured product-event retention.
10. Test one complete invitation and one complete AI exploration with real but controlled accounts.

## Release gate

Do not open the beta until the deployment is healthy, `/ready` confirms database access, migrations have completed, the first admin can operate the waitlist, email delivery is visible through the Resend webhook, the Cron service has one successful run, and a database restore has been rehearsed. Rotate every local/development credential before production and create fresh production secrets; never copy `.env.local` or `.env.production` into a deployment or commit.
