# Onboarding and activation architecture

This document defines how **pre-employment institutional onboarding** is separated from **personnel linking, employment setup, and final Hub activation**. Product rules and code should stay aligned with this split.

## Principles

- **Generic onboarding** covers only institutional approvals that apply before an employment relationship is fully defined. It must **not** include role-specific duties, responsibilities, or employment contracts.
- **Duties & responsibilities** and **contracts** depend on the actual assignment (role, work model, scope). They belong in the **personnel creation / linking** flow, after the user is marked ready for personnel assignment.
- **Full Hub (application) access** is granted only after personnel setup is complete and backend rules (`resolveHubEntitlement` and related fields) are satisfied—not when onboarding agreements finish.

## Phase 1 — Institutional onboarding (product shell: `/onboarding`)

**Scope (in order):**

1. **Welcome** — orientation; start of the compliance funnel.
2. **Confidentiality agreement** — recorded in `user_agreement_acceptances` (`agreement_key = confidentiality`).
3. **Intellectual property agreement** — same table (`intellectual_property`).
4. **Generic Music DNA** — section-by-section acknowledgment (`user_gm_dna_section_progress`) plus final approval (`gm_dna_final` in `user_agreement_acceptances`).
5. **Completed — ready for personnel assignment** — minimal profile capture (e.g. legal name) as needed for records; **no** duties, **no** contract.

**On success:**

- Set `app_users.compliance_completed_at` and `app_users.onboarding_completed_at` (institutional funnel finished).
- Set `app_users.hub_pipeline_phase` to **`awaiting_personnel`**.
- Do **not** set `access_phase` to `active` for the purpose of opening the Hub; do **not** set `hub_access_granted_at`; do **not** treat the user as fully activated.
- Route the user to **`/hub-pending`** (waiting / readiness UI until HR completes personnel setup).

**Explicitly out of scope for this phase:**

- Duties and responsibilities (definition or approval).
- Work model definition (belongs to personnel / employment).
- Employment or work contract creation and approval.
- RBAC business role content beyond what the system already assigned for **access to the funnel** (onboarding does not “define” the job).

## Phase 2 — Personnel linking and employment setup

**Scope:**

- Create or select the **personnel** record.
- **Link** the authenticated user to `personnel.profile_id` (subject to `compliance_completed_at` and DB policies).
- Define **work model** (and any other employment metadata required by product).
- Define and approve **duties & responsibilities** (role- and scope-specific).
- Create and approve **employment / work contract**; drive `employment_lifecycle`, `contract_status`, etc., per schema.
- Move `hub_pipeline_phase` through **`personnel_setup`** as appropriate until employment preconditions are met.

## Phase 3 — Final activation

- When personnel, employment, contract, and RBAC rules are satisfied, set **`hub_access_granted_at`** (and any related lifecycle fields) so **`hasHubShellAccess`** becomes true.
- User is then routed to the main app (`/dashboard` or `/system` per role).

## Code touchpoints (reference)

| Concern | Location |
|--------|----------|
| Hub routing, pending vs onboarding | `src/lib/auth/hubPipeline.ts`, `src/lib/auth/accessRedirect.ts` |
| Full entitlement rule set | `resolveHubEntitlement` in `hubPipeline.ts` |
| Agreement POST | `src/app/api/me/compliance/agreement/route.ts` |
| GM DNA section progress POST | `src/app/api/me/compliance/gm-dna-section/route.ts` |
| Compliance / progress GET | `src/app/api/me/compliance/status/route.ts` |
| Institutional completion | `src/app/api/me/onboarding/complete/route.ts` |
| Onboarding UI | `src/app/(onboarding-shell)/onboarding/OnboardingFlow.tsx` |
| Waiting UI | `src/app/(onboarding-shell)/hub-pending/page.tsx` |

## Versioning

Agreement keys and document versions live in `src/lib/compliance/constants.ts` and must match rows written to `user_agreement_acceptances`.

---

## Performance and load path (implementation)

### Critical vs non-critical

- **Critical path to first shell:** `useAccessGate` (auth + client `app_users` for redirects) → `GET /api/me/onboarding/state` → React `loading` false so the welcome step and step chrome render.
- **Non-critical:** `GET /api/me/compliance/status` runs **in parallel** with onboarding state and merges when ready (agreement checkboxes, GM DNA list). It is intentionally **not** awaited before showing step 0 so time-to-first-shell does not include compliance latency.

### Client caches (short TTL)

- **Bearer token** (`src/lib/me/meApiSession.ts`): avoids repeated `getSession()` bursts; **invalidated** on any `onAuthStateChange` via `AuthCacheInvalidation` in root layout, and on explicit `signOut`.
- **`app_users` row** (`fetchAppUserForAuth`): ~5s client map dedupes gate + header; **invalidated** on auth changes and by `invalidateAppUserClientCache()`.

### Observability

- Development: one console summary from `onboardingLoadMetrics` after compliance merges (`[OnboardingLoad] measured summary`).
- Benchmark template: `docs/internal/ONBOARDING_LOAD_BENCHMARKS.md`.

### Lighter gate (future)

The access gate must still produce a `CurrentUser` for `getAccessRedirect` / `hubPipeline` (needs `access_phase`, lifecycle, hub fields). A **narrower `SELECT`** targeting only those columns could reduce payload and PostgREST work for `/onboarding` without changing product rules. This is optional; measure first.

### Phase-2 server refactor: duplicate `app_users` resolution

Today, `GET /api/me/onboarding/state` calls `getApiUser`, which runs `fetchAppUserForAuth` (anon Supabase client → `app_users`), then the handler runs **another** `app_users` `select` via `createServerClient()` for the full onboarding column set.

**Worth doing when:** API latency or DB load from onboarding traffic becomes material.

**Safe directions:**

1. **JWT-only auth + one read:** Validate the bearer with `getUser(jwt)` (or `auth.getClaims`) without loading `app_users`, then perform **one** service-role `app_users` query with the columns onboarding needs. Centralize column fallback (migration drift) in one place.
2. **Reuse row from a shared helper:** Refactor `getApiUser` to optionally return the already-fetched `app_users` row for routes that need the same row shape, avoiding a second round-trip.

Trade-offs: touch auth middleware surface area; add tests for 401/404; keep RLS and service-role usage consistent with security review.
