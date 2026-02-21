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
