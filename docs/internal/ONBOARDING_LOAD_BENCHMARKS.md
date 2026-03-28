# Onboarding load benchmarks (internal)

This document captures how we measure `/onboarding` first load, the **parallel** state + compliance fetch, why the **full loader** stays up until **both** responses are merged (for **persisted step** correctness), and what is intentionally left for **phase-2** server work.

---

## 1. Before / after measured timings (`[OnboardingLoad]` dev logs)

### How to capture

1. `npm run dev`
2. DevTools → **Console**
3. Hard-reload `/onboarding` (user must be in onboarding phase, not redirected away)
4. Copy: **`[OnboardingLoad] measured summary (durations, ms)`** (object row)
5. Paste into **Your capture** below when replacing placeholders

The line is emitted only in **`NODE_ENV === "development"`** after compliance merges (success path). Interpretation line follows immediately in the console.

### Log field reference

| Console key | Meaning |
|-------------|--------|
| `gate_auth_ms` | `supabase.auth.getUser()` in `useAccessGate` |
| `gate_profile_ms` | Client `fetchAppUserForAuth` (often `0` if `gate_hook_cache`) |
| `gate_hook_cache` | In-hook 5s cache hit for `app_users` in the gate |
| `api_state_ms` | `GET /api/me/onboarding/state` round-trip |
| `api_compliance_ms` | `GET /api/me/compliance/status` round-trip (starts **in parallel** with state) |
| `flow_critical_shell_ms` | Time from flow bootstrap start → **`onboarding state` response ready** (used as early milestone in metrics; see note below) |
| `flow_full_ready_ms` | Flow bootstrap start → **compliance merged** and **`setLoading(false)`** (first paint of wizard) |

**Note (RB-025 milestone):** The product requires **persisted step** from backend on first paint, so **`setLoading(false)`** runs only after **both** APIs complete (or compliance error path). Therefore **`flow_full_ready_ms`** is the meaningful “time to interactive wizard” line; it is approximately **max**(`api_state_ms`, `api_compliance_ms`) plus glue work—not the sum.

### Before (reconstructed — fully sequential compliance)

Legacy behavior issued compliance **after** state and only then cleared loading. Wall-clock to first paint ≈ **`api_state_ms` + `api_compliance_ms`**.

**Example reconstructed row:**

```text
[OnboardingLoad] measured summary (durations, ms) {
  gate_auth_ms: 95,
  gate_profile_ms: 52,
  gate_hook_cache: false,
  api_state_ms: 210,
  api_compliance_ms: 265,
  flow_critical_shell_ms: 210,
  flow_full_ready_ms: 475
}
```

### After (parallel fetch + persistence-correct first paint)

Both requests start together; first paint waits for **both** so `deriveOnboardingStepWithFallbackCompliance` can run on real data.

**Sample row (replace with your machine):**

```text
[OnboardingLoad] measured summary (durations, ms) {
  gate_auth_ms: 88,
  gate_profile_ms: 41,
  gate_hook_cache: false,
  api_state_ms: 198,
  api_compliance_ms: 251,
  flow_critical_shell_ms: 198,
  flow_full_ready_ms: 258
}
```

Expected pattern:

- **Wall time** to first paint ≈ **max**(`api_state_ms`, `api_compliance_ms`), not the sum.
- `flow_full_ready_ms` tracks first paint; it should align with that max plus small merge/React overhead.

### Your capture (fill in)

| Run | Date / env | Paste summary object or CSV |
|-----|------------|------------------------------|
| Production-like | | |
| Local dev | 2026-03-28 | *(optional)* |

---

## 2. Current critical path summary

1. **Access gate** (`useAccessGate` in onboarding shell layout): `getUser()` → client `app_users` (`fetchAppUserForAuth`) → `getAccessRedirect` → `isChecking` false so `OnboardingFlow` mounts.
2. **Onboarding bootstrap** (`OnboardingFlow` `useEffect`): **`GET /api/me/onboarding/state`** and **`GET /api/me/compliance/status`** in **parallel**.
3. **Redirect check:** if `shouldLeaveOnboarding(state)` → `router.replace` (completed users leave `/onboarding`).
4. **Critical + first paint:** compliance merged (or error path) → **`setStep(deriveOnboardingStepWithFallbackCompliance(...))`** → **`setLoading(false)`**. Step 0 welcome does not require compliance **for copy**, but the **loader** stays until compliance is known so resume is correct.
5. **Review mode:** `reviewStep` is client-only; never written to the backend.

Supporting pieces: **short TTL** bearer cache (`meApiSession`), short **client `app_users` map** (`fetchAppUserForAuth`), both **invalidated on auth changes** (`AuthCacheInvalidation` + sign-out handlers).

**Deferred (out of scope for this milestone):** multi-tab / silent re-sync of wizard step without remount.

---

## 3. Remaining bottlenecks

| Bottleneck | Detail |
|------------|--------|
| **Gate `getUser()` network cost** | Validates session with Supabase Auth; unavoidable for a secure gate unless product accepts riskier session-only checks. |
| **One cold client `app_users` query** | Gate (and header) need RBAC/phase fields; first navigation still pays one PostgREST read; cache softens repeats within TTL. |
| **Duplicated server-side `app_users`** | `getApiUser` loads `app_users` (anon), then `GET /api/me/onboarding/state` loads `app_users` again (service client + column fallback loop). Extra latency/DB work. |
| **Compliance API: two DB round-trips** | `user_agreement_acceptances` and `user_gm_dna_section_progress` are **parallel server-side** (single API), but still two PostgREST calls per request. Could become one RPC/join later if needed. |

---

## 4. Conclusion

- **Waterfall removed:** state and compliance **start together**; wall-clock is dominated by the **slower** of the two legs, not their sum.
- **First paint is persistence-correct:** step is derived from **backend profile + compliance snapshot**; refresh / logout / login resume reliably.
- **Phase-2 server dedupe** (single `app_users` read per authenticated onboarding-state request, or JWT-only auth + one service read) is **optional**. Do it only if **production metrics** justify it.

Code reference: `docs/ONBOARDING_AND_ACTIVATION_ARCHITECTURE.md` § *Performance and load path* (if present).

---

## Revision history

| Date | Note |
|------|------|
| 2026-03-28 | Finalized: parallel fetch, persistence-first `setLoading`, RB-025 milestone scope; deferred multi-tab re-sync noted. |
