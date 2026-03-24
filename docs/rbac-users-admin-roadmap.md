# RBAC Users — Admin Module Roadmap

Phased delivery for the system RBAC **Kullanıcılar** screen (`src/app/(dashboard)/system/rbac/UsersTab.tsx`).

## Phase 1 — Critical operations (implemented first)

- **Permanent delete** (`POST /api/rbac/users/[userId]/permanent-delete`, system owner only): deletes Supabase Auth user; tombstones `app_users` (`deleted_at`, `deleted_by`) or hard-deletes row if column missing; clears `user_roles`; audit `RBAC_USER_PERMANENT_DELETE`. UI: “Kalıcı sil” + email-confirm modal. Excluded from all standard user lists via `deleted_at IS NULL`.
- **Lifecycle correctness**: Persist `lifecycle_status` on `app_users`; default list excludes archived; filters by lifecycle / invited-only / can login.
- **Table**: Email, system role, role level, **status** (Davet / Aktif / Pasif / Arşiv), can login, **invite status**, linked personnel, **last login**, **created at**, actions.
- **Row + drawer actions**: View details (drawer), **Resend invite**, **Copy invite link**, **Şifre sıfırlama bağlantısı** (generate recovery link; toasts do not claim inbox delivery), **Archive**, existing passive / restore / activate aligned with lifecycle.
- **APIs** (system owner, service role): `POST .../resend-invite`, `POST .../invite-link`, `POST .../password-reset`.
- **Non-goals**: Permanent delete, hierarchy rules, full audit UI — deferred.

## Phase 2 — Pro UX polish

- Unified **actions** dropdown / overflow menu on rows; keyboard focus and `aria` on modals.
- **Bulk** selection (optional), export CSV.
- **Details drawer**: richer audit snippet, invite timestamps if stored.
- **Search** debounce, saved filter presets.

## Phase 3 — Advanced admin

- **Permanent delete** (super-admin only, confirmation, soft-delete preference).
- **Hierarchy rules**: prevent lower-level admins from editing higher-level users; self-action guards.
- **Rate limits** and action logging dashboards.

Invite/onboarding flow (`/auth/callback` → `/auth/set-password`) remains unchanged; only admin surfaces and APIs are extended.
