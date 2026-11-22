# LendLoop

**Borrow what you need. Lend what you don't.**

A neighbourhood tool-lending board: neighbours list tools, ask to borrow them for a few days, and
get email notifications and overdue reminders from n8n. Built with Next.js (App Router), Clerk,
Convex and n8n in TypeScript.

- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Architecture](#architecture)
- [Security decisions](#security-decisions)
- [Data minimisation](#data-minimisation)
- [Reliability of the n8n integration](#reliability-of-the-n8n-integration)
- [Running this in production](#running-this-in-production)
- [Known limitations](#known-limitations)

## What it does

| Who            | Can                                                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anyone         | See today's available tools (name and category only) and sign in                                                                                                                                   |
| Signed-in user | List, edit and delete their own tools; request a tool for a date range; approve, decline or mark returned on their own tools; cancel their own requests; see My listings, My requests and Incoming |
| Admin          | Everything above, plus remove any listing, see all loans, mark a lender as Trusted Lender, watch the automation (heartbeat, failed notifications, workflow errors)                                 |

n8n sends an email when a request is created or changes status, and a daily reminder for every
overdue loan. Each loan shows what the automation did ("Borrower emailed: approved · 5 minutes
ago", "Overdue reminder · 2 days ago").

## Local setup

Everything runs on your machine: Convex (self-hosted), n8n and Mailpit (a local SMTP inbox) in
Docker, the web app with `pnpm`. Only Clerk is a hosted service (a free development instance).

**Requirements:** Node 24, pnpm 10 (`corepack enable`), Docker.

1. **Install**

   ```sh
   pnpm install
   cp .env.example .env               # then fill in the four secrets: openssl rand -hex 32
   cp apps/web/.env.example apps/web/.env.local
   ```

2. **Clerk** (free dev instance at [dashboard.clerk.com](https://dashboard.clerk.com))
   - Copy the publishable and secret keys into `apps/web/.env.local`.
   - _JWT templates → New → Convex_. Keep the name `convex`; its claims must include `email` and
     `name`. Copy the template's **Issuer** URL into `CLERK_JWT_ISSUER_DOMAIN` in `.env`.
   - Keep email verification on (Clerk's default): Convex trusts the email in the token.

3. **Start the stack and configure it**

   ```sh
   docker compose up -d --wait        # Convex, Convex dashboard, n8n, Mailpit
   pnpm setup:convex                  # admin key, Convex env from .env, deploys the functions
   pnpm setup:n8n                     # imports the Mailpit credential and the three workflows
   pnpm seed                          # optional: demo neighbours, tools and loans
   pnpm dev                           # web app on http://localhost:3000, Convex in watch mode
   ```

4. **Make yourself admin:** sign in once in the app, then `pnpm make-admin you@example.com`.

| Service          | URL                   |
| ---------------- | --------------------- |
| Web app          | http://localhost:3000 |
| Convex dashboard | http://localhost:6791 |
| n8n editor       | http://localhost:5678 |
| Mailpit inbox    | http://localhost:8025 |

The seed sends a real notification: open Mailpit to see Olga's "Someone would like to borrow your
Cordless drill". In n8n, open _LendLoop – Overdue reminders_ and press **Run now** to send the
reminder for the seeded overdue ladder; run it again and nothing new is sent (one reminder per loan
per day).

**Checks:** `pnpm check` runs ESLint (with Steiger for FSD), Prettier, the type checker, all unit
and Convex tests, and verifies the exported n8n JSON is current and free of secrets. CI runs the
same plus the build, a dependency audit and gitleaks.

## Environment variables

Real values never go into the repository; every `.env.example` keeps secrets empty.

| Variable                                | Where                                     | Purpose                                                                   |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `CONVEX_INSTANCE_SECRET`                | `.env` → Convex container                 | Self-hosted Convex instance secret                                        |
| `N8N_ENCRYPTION_KEY`                    | `.env` → n8n (as a Docker secret file)    | Encrypts n8n's stored credentials; kept out of the env workflows can read |
| `CONVEX_TO_N8N_SECRET`                  | `.env` → n8n env and Convex env           | HMAC key for Convex → n8n webhooks                                        |
| `N8N_TO_CONVEX_SECRET`                  | `.env` → n8n env and Convex env           | HMAC key for n8n → Convex calls (a different key per direction)           |
| `CLERK_JWT_ISSUER_DOMAIN`               | `.env` → Convex env                       | Clerk issuer Convex trusts; empty means no tokens are accepted            |
| `N8N_WEBHOOK_BASE_URL`                  | Convex env (set by `pnpm setup:convex`)   | Where Convex reaches n8n inside Docker: `http://n8n:5678/webhook`         |
| `NEXT_PUBLIC_CONVEX_URL`                | `apps/web/.env.local`                     | Convex client URL                                                         |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`     | `apps/web/.env.local`                     | Clerk publishable key                                                     |
| `CLERK_SECRET_KEY`                      | `apps/web/.env.local`                     | Clerk secret key (server side only)                                       |
| `CONVEX_SELF_HOSTED_URL` / `_ADMIN_KEY` | `packages/backend/.env.local` (generated) | Convex CLI access to the local backend                                    |

All of them are validated with zod where they are read (`apps/web/src/shared/config/env.ts`,
`packages/backend/convex/lib/env.ts`); ESLint forbids `process.env` anywhere else.

## Architecture

```
┌────────────┐  Clerk JWT   ┌──────────────────────────────┐  signed POST  ┌───────────┐  SMTP  ┌─────────┐
│  Next.js   │─────────────▶│ Convex                       │──────────────▶│   n8n     │───────▶│ Mailpit │
│ (App Router│  queries &   │  RBAC wrappers → model →     │  (outbox,     │ 3 workflows│        └─────────┘
│  FSD)      │◀─ mutations ─│  db; outbox; signed HTTP     │◀── retries) ──│           │
└────────────┘  (reactive)  │  endpoints for n8n           │  signed POST  └───────────┘
                            └──────────────────────────────┘  write-backs
```

**Monorepo** (pnpm workspaces + Turborepo):

| Package              | Role                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/contracts` | Single source of truth: domain constants, the loan transition table, the permission matrix, error codes, zod schemas for every input and DTO, n8n payloads and HMAC signing |
| `packages/backend`   | Convex: modular monolith by domain (`users`, `tools`, `loans`, `admin`, `audit`, `automation`)                                                                              |
| `apps/web`           | Next.js with Feature-Sliced Design (`app` → `pages` → `widgets` → `features` → `entities` → `shared`)                                                                       |
| `n8n/`               | Workflow sources (`n8n/src`) and the exported JSON they build into                                                                                                          |

**Backend layering.** Public functions are thin: validated args → current user → one model call →
DTO. Each module has `model.ts` (data access and orchestration), `queries.ts`/`mutations.ts`, and an
`index.ts` that is the only thing other modules may import (enforced by ESLint). Pure rules live in
`contracts` (shared with the UI) or `convex/domain`.

**One loan state machine.** `LOAN_TRANSITIONS` in contracts says, for every action, from which
statuses it is allowed, who may take it (owner, borrower or the system), when (until the first
day, from the first day, any time) and who is notified. The backend's single `applyTransition`
enforces it against the server clock, writes the audit entry and queues the notification in the
same transaction; the UI uses the same table to show only the buttons that can succeed.

```
requested ──approve (owner, until start)──▶ approved ──mark returned (owner, from start)──▶ returned
    │                                          │
    ├─decline (owner)──▶ declined              └─cancel (borrower, until start)──▶ cancelled
    ├─cancel (borrower, until start)──▶ cancelled
    └─auto-decline (system: overlapping request approved, or never answered)──▶ declined
listing removed (owner or admin) ──▶ open requests and future loans cancelled (system)
```

**Notification flow (Convex → n8n).**

1. A mutation changes a loan and, in the same transaction, writes an `outboundEvents` row (a
   snapshot of the change plus the recipient's id) and schedules delivery.
2. The `deliver` action claims the event (counts the attempt, takes a 60 s lease), reads the
   recipient's email, signs the body and POSTs it to n8n.
3. n8n verifies the signature on the raw body, sends the email and answers **200** once it is sent
   or **503** if sending failed, then writes the result back to Convex (signed).
4. Convex marks the event delivered, or retries with backoff (30 s, 2 min, 10 min, 1 h) and marks
   it failed after five attempts; a cron re-schedules events whose job was lost. Admins can send a
   failed event again.

**Overdue reminders (n8n → Convex).** A daily schedule (09:00 UTC, or **Run now**) asks Convex for
today's overdue loans (Convex decides what "today" is), emails each borrower and writes back one
result per loan and day under the key `reminder:<loanId>:<YYYY-MM-DD>`. Each call also records a
heartbeat; the admin page shows the workflow as "Not running" if it has not checked in for 25 h.

**Error workflow.** Both workflows name _LendLoop – Error handler_ as their error workflow. It
reports where a run failed (workflow, node, a short message with emails masked) to Convex, which
shows it on the admin Automation tab.

## Security decisions

- **Authorization lives in Convex, not the UI.** Every function is built from wrappers in
  `convex/functions.ts` (`publicQuery`, `userQuery`, `userMutation`, `adminQuery`,
  `adminMutation`, `internal*`); ESLint forbids the raw builders anywhere else. The acting user
  always comes from the verified Clerk token, never from arguments.
- **Record-level checks.** Only the owner edits or deletes a tool; only the owner or borrower of a
  loan sees or acts on it, each only as the transition table allows. Anyone else gets `NOT_FOUND`,
  so ids cannot be probed. Admins can view all loans but cannot act on other people's loans.
- **Roles and Trusted Lender live in Convex**, not in Clerk metadata: changes apply immediately,
  new accounts always start as `user`, and the first admin is set from the CLI. Role and trust
  changes are audited.
- **Fails closed.** Without a Clerk issuer Convex accepts no tokens; without n8n secrets the HTTP
  endpoints answer 401 and outgoing events wait.
- **HMAC in both directions**, one secret per direction: HMAC-SHA256 over `timestamp.body`, a
  ±5 minute window against replay, constant-time comparison, verified on the raw body before
  anything is parsed, bodies capped at 16 KB. n8n re-signs every retry, so retries never carry a
  stale timestamp.
- **Validated at every edge** with the same zod schemas: forms, Convex arguments, Convex return
  values, HTTP bodies, env. Return validators guarantee no unexpected field (an email, an internal
  id) leaves a function.
- **Idempotent write-backs.** One activity row per key; a recorded success is final, so a late
  "failed" from a retry cannot overwrite it; workflow errors are stored once per execution.
- **Secrets** live in `.env`, Convex env and n8n credentials. The n8n encryption key is passed as
  a Docker secret file so workflows cannot read it through `$env`. `pnpm n8n:check` and gitleaks
  keep secrets out of the repository; exported workflows reference credentials by id only.
- **Errors shown to users** are fixed messages per error code; anything unexpected becomes a
  generic line, with no internals.
- **Local exposure:** every container port binds to `127.0.0.1`; images are pinned by digest.
- **Audit log:** every listing, loan and role change records who did it (a user id or `system`)
  and which records it touched, with ids only.

## Data minimisation

- **Public page:** tool name and category only (plus the id as a list key). No owner, no
  availability details.
- **Signed-in users** see a lender's or borrower's name and Trusted Lender badge, never an email.
  Admins see names and join dates, not emails.
- **Convex → n8n:** the recipient's first name and email, the tool's name, the dates and the
  status. No user ids, no other party's details. The outbox stores references; the email is read
  only at send time.
- **n8n → Convex:** ids and a fixed status; error reports carry no payload and mask emails.
- **n8n execution data:** successful runs keep no payloads; failed runs are kept 72 hours for
  troubleshooting, then pruned. n8n telemetry is off.
- **Clerk** holds the identity; Convex keeps only a display name, the email (for notifications) and
  the Clerk subject.

## Reliability of the n8n integration

| Failure                               | What happens                                                                  | Where it shows                |
| ------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------- |
| n8n is down or slow                   | Outbox retries with backoff, then marks the event failed                      | Admin → Automation            |
| SMTP fails                            | n8n retries, answers 503; Convex retries the event                            | Loan activity "(failed)"      |
| Convex answered n8n, n8n's reply lost | Event is sent again with the same id (at-least-once)                          | —                             |
| A delivery job is lost                | Cron sweep re-schedules it; the attempt count stops endless loops             | —                             |
| Write-back to Convex fails            | n8n retries (re-signed); then the run fails and the error workflow reports it | Admin → workflow errors       |
| The daily workflow stops running      | Heartbeat goes stale after 25 h                                               | Admin → "Not running"         |
| n8n is not configured yet             | Events wait without using attempts; endpoints answer 401                      | Admin → notifications waiting |

Verified against the running stack: signed and forged requests (202/200 vs 401), a real outbox
event delivered to Mailpit with its acknowledgement, a failed event recovering on retry after the
workflow was fixed, overdue reminders sent once per day across reruns, and the error workflow
recording a failed run in Convex.

## Running this in production

What I would change before real users:

- **Hosting.** Convex Cloud (or self-hosted Convex on Postgres with backups and point-in-time
  recovery), the web app on Vercel, n8n in queue mode with Postgres and Redis, workers scaled
  separately, behind TLS. Clerk production instance with its own domain.
- **Secrets.** A secrets manager (AWS Secrets Manager, Doppler, 1Password) instead of `.env`;
  rotate the HMAC keys by accepting two keys during a rollover window; n8n's external secrets
  instead of `$env`.
- **Email.** A real provider (SES, Postmark, Resend) with SPF, DKIM and DMARC, bounce handling, an
  unsubscribe link and HTML templates. Only the n8n SMTP credential changes.
- **Signature scope.** Include the endpoint path in the signed string (today a captured request
  could be replayed to another n8n endpoint within five minutes, which the schemas make harmless)
  and keep a short-lived nonce store to drop exact replays.
- **Exactly-once emails.** n8n could ask Convex to claim an event before sending, closing the
  rare duplicate when n8n's reply is lost.
- **Observability.** Sentry for the web app and Convex functions, structured logs to a log store,
  alerts on failed outbox events, workflow errors and a stale heartbeat (today they are only
  visible in the admin page).
- **Abuse limits.** A rate limiter on requests and listings beyond the open-request cap, bot
  protection on sign-up, content moderation for listing text.
- **Scale.** Paginate lists instead of caps, denormalise availability and the latest activity
  onto tools and loans, and move the admin lists to cursor pagination.
- **Time zones.** Store a time zone per neighbourhood and compute "today" in it instead of UTC.
- **Privacy.** Account deletion and data export, retention for the audit log and activity, a
  privacy notice, and a DPA with each processor (Clerk, email provider, hosting).
- **Delivery.** Preview deployments per pull request with seeded data, Playwright end-to-end
  tests against the full stack in CI, and a staging n8n.

## Known limitations

- "Today" is the UTC day everywhere, and loans are whole calendar days in UTC.
- Notifications are delivered at least once; a duplicate email is possible in the rare case above.
- Admin lists and loan lists are capped (they say when they are cut) instead of paginated.
- The seeded neighbours cannot sign in; they exist to make the board look lived in.

## Repository tour

```
apps/web/                 Next.js app (FSD); app/ only re-exports src/pages
packages/contracts/       shared constants, schemas, transition table, HMAC
packages/backend/convex/  Convex functions by domain; functions.ts holds the access wrappers
n8n/src/                  workflow builder and Code-node sources; n8n/workflows/ is its output
scripts/                  setup, seed and admin helpers, export check
docker-compose.yml        Convex, Convex dashboard, n8n, Mailpit
CLAUDE.md                 coding standards (enforced ones are marked [lint])
```
