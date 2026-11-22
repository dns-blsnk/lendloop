# LendLoop

Take-home project: a neighborhood tool-lending board. Neighbors list tools, request to borrow them for
a date range, and get notifications and overdue reminders through n8n. Brief: `TASK.md`.

## Stack

- pnpm workspaces + Turborepo: `apps/web` (Next.js 16 App Router, FSD), `packages/backend` (Convex),
  `packages/contracts` (shared constants, permission matrix, error codes, zod schemas, n8n payloads)
- Clerk for authentication; roles and the Trusted Lender flag live in Convex
- n8n for automation (request notifications, daily overdue reminders, error workflow), signed with HMAC
  in both directions
- Local stack in Docker: self-hosted Convex backend + dashboard, n8n, Mailpit

## Commands

```
pnpm install
pnpm dev                      # all apps
pnpm lint | lint:fix | format | format:check | typecheck | test | build
pnpm check                    # lint + format:check + typecheck + test
```

## Git

- Work on `dev`; `main` only receives merges through GitHub pull requests
- Conventional Commits in English: `feat(web): ...`, `fix(backend): ...`, `test(contracts): ...`,
  `refactor: ...`, `chore: ...`, `ci: ...`, `docs: ...` (enforced by commitlint)
- One logical change per commit, small commits. No `Co-Authored-By`, no mention of AI or co-authors
- Before every commit: lint, typecheck and tests are green
- Every plan stage ends with `/code-review`; stages touching auth, RBAC, loans, admin, HMAC, HTTP
  endpoints or n8n also end with `/security-review`

## Coding standards

Rules marked **[lint]** are enforced by ESLint, Steiger or the TypeScript compiler; the build fails on
them. The rest are reviewed by hand.

### General principles

- **DRY by knowledge, not by look.** Code that must always change together shares knowledge: extract
  it. Code that only looks alike but changes for different reasons stays separate
- **KISS and YAGNI.** Build what the task needs now. No speculative options or abstractions
- **Single responsibility.** A function does one thing; a module owns one domain
- **No magic values [lint].** Values with meaning become named constants. Constants that the web app,
  the backend or n8n share live in `packages/contracts`
- **Single source of truth.** Enums, roles, the permission matrix, status transitions, error codes and
  input/output schemas are defined once in `packages/contracts` and imported everywhere
- **Fail fast at the edges, trust inside.** Validate at the boundary (function args, HTTP bodies, env).
  Inside the domain, work with typed, already valid data
- **No dead code [lint]:** no unused variables, imports, parameters or commented-out code

### Size and complexity [lint]

| Rule                      | Limit                            |
| ------------------------- | -------------------------------- |
| `complexity` (cyclomatic) | 10                               |
| `max-depth`               | 3                                |
| `max-params`              | 4 (otherwise one options object) |
| `max-lines-per-function`  | 60 (TSX components 120)          |
| `max-lines` per file      | 300                              |
| `no-nested-ternary`       | on                               |

Tests are exempt from size limits and `no-magic-numbers`.

### TypeScript [lint]

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
  `verbatimModuleSyntax`
- typescript-eslint `strict-type-checked` + `stylistic-type-checked`
- No `any`, no non-null `!`, no `@ts-ignore`; `import type` for type-only imports
- No default exports except where a framework requires them (Next route files, configs)
- Exhaustive `switch`; no floating promises; no `console`; import order and no cycles
- `process.env` only in the env modules (`apps/web/src/shared/config/env.ts`,
  `packages/backend/convex/auth.config.ts` (evaluated at deploy time, validates its own variable),
  `packages/backend/convex/lib/env.ts`), validated with zod

### Naming

- `PascalCase` types and components, `camelCase` values and functions, `UPPER_SNAKE_CASE` fixed
  module-level constants. Booleans read as questions (`isOverdue`, `canApprove`)
- Files `kebab-case.ts`; tests next to the code as `*.spec.ts`

### Comments

- Code says what; comments say why: a non-obvious business rule, a security reason, a workaround

### Contracts (`packages/contracts`)

- Constants as `as const` objects plus derived union types; zod schemas for every input the web app
  sends and every DTO a public Convex function returns; integration payloads for n8n
- Ships TypeScript source; no runtime dependencies besides zod

### Backend (Convex, `packages/backend/convex`)

- Modular monolith by domain: `convex/<module>/` with `queries.ts`, `mutations.ts`, `model.ts`
  (data access and orchestration through `ctx.db`) and `index.ts` (what neighbour modules may use).
  Pure business rules the web app also needs (status transitions, date ranges) live in
  `packages/contracts`; backend-only pure rules (availability, overdue selection) live in
  `convex/domain/` without `ctx`
- Public functions are thin: validated args → current user → one model call → DTO
- Deny by default: functions are built only from the wrappers in `convex/functions.ts`
  (`publicQuery`, `userQuery`, `userMutation`, `adminQuery`, `adminMutation`); raw
  `query`/`mutation` from `_generated/server` are forbidden elsewhere **[lint]**. Everything n8n calls
  is an `internal*` function behind a signed `httpAction`
- The user id always comes from `ctx.auth`, never from arguments. Ownership is checked on the
  specific record in the model, not only in the UI
- Every public function declares `returns`: the DTO schema from contracts, so no extra field (owner
  email, internal ids) can leak
- Throw `domainError(code, message)` (a `ConvexError` with a code from contracts); the UI maps codes
  to messages. Never throw strings or bare `Error` for expected cases
- Never log secrets, tokens, signatures, emails or full payloads. One documented exception: n8n
  keeps the payload of a _failed_ execution for three days so it can be inspected and retried

### Frontend (Next.js, `apps/web`)

- Feature-Sliced Design: `src/app` → `pages` → `widgets` → `features` → `entities` → `shared`. A layer
  imports only layers below it; slices of one layer never import each other **[lint: Steiger]**
- Next routing lives in the root `app/` folder and only re-exports pages from `src/pages`; the empty
  root `pages/` keeps Next from treating `src/pages` as the Pages Router
- Across slices import only a slice's public API (`@/entities/tool`); inside a slice use relative paths
- Server state comes from Convex hooks; no `useEffect` + `fetch`. Derived values are computed in render
- Forms use react-hook-form with the zod schema from contracts
- Hiding a button is UX, not security: the backend enforces every rule
- Accessibility basics **[lint]**; no `dangerouslySetInnerHTML` **[lint]**

### Integration (n8n)

- Convex decides who is notified and what data leaves; n8n only delivers
- Every request in both directions is signed: HMAC-SHA256 over `timestamp.body`, a 5-minute window,
  constant-time comparison, a separate secret per direction
- Write-backs are idempotent (idempotency key per event or per loan and day)
- Secrets live in env and n8n credentials, never in code or exported workflow JSON

### Tests

- Every behaviour gets a test: happy path, each validation failure, each role, each error code
- Unit tests for pure domain functions and contracts; `convex-test` for functions, RBAC and
  idempotency
- One behaviour per test; the name says the rule: `rejects approval by someone who is not the owner`

### Security checklist (every change)

- Input validated at the boundary; output never includes secrets, emails of other users or internals
- Authorization checked on the server for the specific record
- No real secrets in code, tests or fixtures; `.env.example` keeps real secrets empty
