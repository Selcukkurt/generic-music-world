# Rollback Table

| Tag / Release | Commit | Description |
|---------------|--------|-------------|
| RB-003 | — | Global UI + RBAC Foundation Stable |
| RB-004 | — | Global UI + RBAC v1 + Module Status System |
| RB-006 | — | Sidebar UX + Active route fix + Login stabilization |
| RB-007 | — | GM DNA Okudum & Anladım acceptance + Kurumsal Onaylar |
| **RB-008** | — | Supabase profiles + Seed users setup (PROFILES-v1) |
| **RB-004-version-management** | — | Version Management (Sürüm Yönetimi) – production-ready |
| **GMW-RBAC-v1.0** | — | Rol Yönetimi module – production-ready |
| **RBAC-V1-roles-checkpoint** | — | RBAC roles restored and aligned with RBAC V1 model |
| **RBAC-M04-STABLE** | 4193d4e | RBAC + M04 İK & Organizasyon – stabilization checkpoint |
| **RB-024** | — | Onboarding end-to-end stabilized; first/last name; invite identity; completion API & state; final waiting screen; booking user test passed |
| **RB-025** | — | Onboarding milestone: load path + persistence + review mode + UX + internal benchmarks (LOCKED) |

---

## RB-025: Onboarding load, persistence, review mode, UX (milestone LOCKED)

**Tag:** `RB-025` (annotated)  
**Scope:** Stable checkpoint for onboarding as delivered in March 2026.

**Summary:**
- Onboarding **performance:** parallel `state` + `compliance` fetch; no sequential waterfall; loader semantics aligned with **persisted step** (first paint after both merge).
- **Critical vs deferred** loading path documented in code + `docs/internal/ONBOARDING_LOAD_BENCHMARKS.md`.
- **Hints / waiting** copy (e.g. `OnboardingInfoHints`, ETA **1–2 iş günü**).
- **Review mode:** read-only revisit of completed steps; `reviewStep` **UI-only**; no backend writes from review navigation.
- **Heading hierarchy** and page structure; **step chips** overflow/consistency (`onboardingStepNavStyles`).
- **Persistence / resume:** `deriveOnboardingStepWithFallbackCompliance` from **backend** profile + compliance; refresh, logout/login, retry path validated for scope.
- **Completed users** leave `/onboarding` via `shouldLeaveOnboarding` + access gate.
- **Internal doc** `docs/internal/ONBOARDING_LOAD_BENCHMARKS.md` finalized for this milestone.

**Stable state:** Onboarding persistence/resume is **complete and stable** for the current scope.

**Main risks / deferred:**
- **Multi-tab / silent re-sync** of wizard `step` without remount is **explicitly out of scope**; optional future enhancement.
- Compliance fetch failure falls back to conservative step derivation (see `onboardingWizardProgress.ts`).

**Rollback target:** Prior stable onboarding checkpoint **`RB-024`** (or immediately preceding commit if tag not present):

```bash
git checkout RB-024
```

**Next recommended work:**
- Optional: multi-tab / silent compliance re-sync (monotonic rules, no fighting Geri).
- Optional: phase-2 server dedupe for `app_users` on onboarding APIs (metrics-driven).

---

## Rollback Tracking Table

| Rollback ID | Tarih | Saat | Ortam | Versiyon/Tag | Sayfa/Modül | Aktif Durum | Kilitle | Yedek | Yayın | Prod |
|-------------|-------|------|-------|--------------|-------------|-------------|---------|-------|-------|------|
| RB-021 | 2026-03-21 | 14:49 | Local + Dev | GMW-2026-03-RB021 | System / RBAC | Active | FALSE | TRUE | FALSE | FALSE |
| RB-024 | 2026-03-28 | 12:00 | Local + Dev | RB-024 | Onboarding / Hub pipeline | Stabil | TRUE | TRUE | FALSE | FALSE |
| **RB-025** | **2026-03-28** | **—** | **Local + Dev** | **RB-025** | **Onboarding** | **Stabil** | **TRUE** | **TRUE** | **FALSE** | **FALSE** |

**RB-021 – Yapılan İşlem Özeti:**
RBAC enforcement phase started.
- role_level is now used as the single source of truth
- login restriction implemented (role_level 5 cannot log in)
- route access rules introduced (e.g. /system/rbac limited to role_level <= 2)
- UI behavior aligned with role_level (read-only, no-login roles, etc.)
- permission helpers (canAccessRoute, canLogin, etc.) integrated

RBAC is transitioning from bypass mode to controlled enforcement.

**RB-021 – Son Stabil Durum:** Stabil (Dev - Enforcement Phase)

**RB-021 – Bilinen Sorun:** RBAC enforcement partially active, not fully validated across all modules.

**RB-021 – Risk Seviyesi:** Medium-High

**RB-021 – Rollback Hedefi:** RB-020

**RB-021 – Sıradaki Teknik İş:**
- full permission matrix implementation
- module-level access control
- remove RBAC bypass safely

---

**RB-024 – Yapılan İşlem Özeti:**
- Onboarding akışı uçtan uca stabilize edildi
- `first_name` / `last_name` desteği eklendi
- Davet akışı kimlik alanlarını kalıcı olacak şekilde güncellendi
- Onboarding completion API ve state transition düzeltildi
- Son bekleme ekranı çalışır hale getirildi
- Booking kullanıcı testi geçti

Bu checkpoint kapsamında **personel aktivasyon** implementasyonu başlatılmadı; sıradaki iterasyonda ele alınacak.

**RB-024 – Son Stabil Durum:** Stabil (Dev – onboarding tamam)

**RB-024 – Bilinen Sorun:** —

**RB-024 – Risk Seviyesi:** Low–Medium

**RB-024 – Rollback Hedefi:** RB-022

**RB-024 – Git:** Annotated tag `RB-024` (rollback: `git checkout RB-024`).

**RB-024 – Sıradaki Teknik İş:**
- Personel atama / aktivasyon akışı (admin; `awaiting_activation` → `active`)

---

## RBAC-M04-STABLE: RBAC + M04 İK & Organizasyon Stabilization

**Tag:** RBAC-M04-STABLE  
**Date:** 2026-02  
**Scope:** RBAC stabilized; M04 right-panel architecture finalized; Organizational, Personnel, and Field & Planning cores implemented; Supabase migrations stabilized and applied.

**Summary:**
- RBAC stabilized (is_admin, is_lead_or_admin, is_system_owner, can_access_event)
- M04 right-panel architecture finalized (Personel Üssü, Organizasyonel Yapı, Saha ve Planlama)
- Organizational Core: Organizasyon Birimleri, Hiyerarşi Şeması, Vekalet Paneli
- Personnel Core: 360° Personel Kartı, Dijital Sicil & Feedback, Kara Liste
- Field & Planning Core: Etkinlik Kadro Atama, Açık Pozisyonlar, Çakışma Kontrolü, Hak Ediş Onayı, Finans Aktarım
- Supabase migrations stabilized (idempotent policies, enums, functions) and applied
- Local app + RBAC screens verified

**Rollback:** `git checkout RBAC-M04-STABLE` (or prior tag)

---

## RBAC-V1-roles-checkpoint: RBAC Roles Restored and Aligned

**Date:** 2026-03  
**Scope:** RBAC V1 roles fixed and synchronized with database  

**Summary:**
- RBAC V1 roles correctly visible in `/system/rbac`
- Roles: Owner, Admin, Director, Manager, Staff, Field (+ Viewer legacy)
- Missing roles inserted: director, staff, field
- Migration `20260235000000_rbac_v1_clean_model.sql` applied
- UI shows new roles/permissions by default; legacy behind toggle

**Rollback:** `git checkout <prior-commit>` before this checkpoint.

---

## GMW-RBAC-v1.0: Role Management Module

**Tag:** GMW-RBAC-v1.0  
**Date:** 2026-02  
**Scope:** /system/rbac – full CRUD, permissions matrix, user assignment  

**Production roles:**
- **Super Admin** (locked): `isLocked: true` – cannot delete, rename, or change level/permissions. System-level access only.

**Features:** Roles table, Permission matrix, User assignment, localStorage persistence, Checkbox component, Toasts.

---

## RB-008: Supabase Migrations + Seed Users Setup

**Environment:** Local  
**Date:** 2026-02-21  
**Scope:** Supabase migrations + Seed users setup  

**Summary:**
- Supabase profiles table created
- RLS policies applied
- role and email columns added
- Seed script executed successfully
- system_owner and ceo users created

**DB Schema Version:** PROFILES-v1  
**Tag:** GMW-2026-02-21-2  

| Field | Value |
|-------|-------|
| Active Status | AKTIF |
| Lock | TRUE |
| Backup | TRUE |
| Publish | FALSE |
| Prod | FALSE |

---

### Roles
- **SYSTEM_OWNER**: Full system + business access. Only role that can access `/system/*`
- **CEO**: Business-only, no system permissions. Cannot assign or create SYSTEM_OWNER role.

### Dev-Only Seed Users (fixed credentials)
| Email | Role | Password (env) |
|-------|------|----------------|
| info@genericmusic.net | SYSTEM_OWNER | SEED_PASSWORD_SYSTEM_OWNER |
| selcuk@genericmusic.net | CEO | SEED_PASSWORD_CEO |

### Seed Script
- **Run**: `npm run seed:users`
- **Guard**: Only runs when `SEED_USERS=true`. NEVER run in production.
- **Required env**: `SEED_USERS`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SEED_PASSWORD_SYSTEM_OWNER`, `SEED_PASSWORD_CEO`
- Creates Supabase Auth users if missing, upserts `profiles` (id, email, role, created_at, updated_at).

### Post-Login Redirect
- SYSTEM_OWNER → `/system`
- CEO (and others) → `/dashboard`
- Redirect loops prevented: CEO accessing `/system` → 403 Forbidden.

### Route Protection
- `/system/*` protected by `RequireSystemOwner`. Only SYSTEM_OWNER can access.
- CEO cannot assign or create SYSTEM_OWNER role (enforced in RBAC UI when implemented).

### Rollback
`git checkout tags/RB-007` (or prior tag)

---

## RB-004: Version Management (Sürüm Yönetimi)

**RB ID:** RB-004  
**Date:** 2026-02-21  
**Module:** Version Management (Sürüm Yönetimi)  
**Tag:** RB-004-version-management  

**What changed:**
- DB tables: `releases`, `deployments`, `rollbacks`, `audit_log` (insert policy)
- RLS policies for authenticated users on these tables
- UI tabs: Genel Bakış / Release'ler / Deploy Geçmişi / Rollback
- API routes: `/api/version/overview`, `/api/version/releases`, `/api/version/deployments`, `/api/version/rollbacks`
- Auth: anon key + user token (no service role required for version endpoints)

**Status:** Production'a alındı  

**Next step:** Add test data + simulate flows  

**Rollback:** `git checkout tags/RB-008` (or prior tag). Tables remain; drop manually if needed.

---

## RB-013: Audit Logs (Log Kayıtları)

**RB ID:** RB-013  
**Date:** 2026-02-22  
**Module:** Log Kayıtları (/audit-log)  
**Tag:** RB-013-audit-logs  

**What changed:**
- Added `public.audit_logs` table + indexes (meta, target_type, target_id, ip, user_agent)
- API `/api/audit-logs` with filters, pagination, service-role fetch
- Wired `/audit-log` UI to Supabase (filters, table, details drawer, empty/error states)
- Fixed column mismatches: target_entity→target_type, metadata→meta, request_ip→ip, request_user_agent→user_agent
- PUT `/api/settings` persists to Supabase + inserts audit_logs on System Settings update
- Veri Taşıma page (5 tabs), Log Kayıtları sidebar (systemOnly)

**Status:** Local OK  

**Rollback:** `git checkout tags/RB-013-audit-logs` (or prior tag)
