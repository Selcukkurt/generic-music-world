# Generic Music World – Connected Platform Architecture

**Version:** 1.0  
**Status:** Architecture & Implementation Planning  
**Goal:** Keep all modules connected through shared platform contexts instead of isolated data islands.

---

## 1. Platform Cores (Backbone)

Three shared contexts form the backbone of the platform. All modules must consume these contexts for identity, organization, and event scope.

### 1.1 User / Role Context

| Entity | Source | Purpose |
|--------|--------|---------|
| `profiles` | Supabase | User identity, system RBAC role |
| `auth.users` | Supabase Auth | Authentication |
| `user_roles` | RBAC v1 | Role assignments |
| `role_permissions` | RBAC v1 | Permission matrix |

**Responsibilities:**
- Who is the current user?
- What is their system role (system_owner, ceo, admin, lead, staff, viewer)?
- What system permissions do they have?
- What business permissions do they have?

**Data flow:** `auth.users` → `profiles` → `user_roles` → `role_permissions` → effective permissions

**Existing foundation:** `src/lib/auth/mapAuthUser.ts`, `src/lib/rbac/canAccess.ts`, `src/lib/context/operational-context.ts` (SystemContext)

---

### 1.2 Organization Context

| Entity | Source | Purpose |
|--------|--------|---------|
| `org_units` | Org structure | Org hierarchy, module codes |
| `job_titles` | Org structure | Positions, org_unit linkage |
| `person_assignments` | Org structure | Person ↔ org_unit ↔ job_title |
| `assignments` | M04 HR | Personnel ↔ org_unit |

**Responsibilities:**
- What org unit is the user operating in?
- What job title is associated with the current scope?
- What is the org hierarchy for the current scope?

**Data flow:** `profiles` / `personnel` → `assignments` / `person_assignments` → `org_units` + `job_titles`

**Existing foundation:** `src/lib/org-structure/data.ts`, `src/lib/context/operational-context.ts` (OrganizationContext)

---

### 1.3 Event Context

| Entity | Source | Purpose |
|--------|--------|---------|
| `etkinlik_events` | Event Hub | Events (dates, venue, status) |
| `event_access` | Event-scoped RBAC | User ↔ event ↔ access_level (view/edit) |
| `event_organizations` | Event-scoped RBAC | Event ↔ venue/promoter/vendor |
| `organizations` | Event-scoped RBAC | Venues, promoters, partners |

**Responsibilities:**
- What event is currently selected?
- Does the user have view or edit access to this event?
- Is the user internal staff (full access) or partner (event-scoped only)?

**Data flow:** `auth.users` → `event_access` | `profiles.role` → `can_access_event()` → effective event access

**Existing foundation:** `src/lib/events/data.ts`, `can_access_event()` in migrations, `src/lib/context/operational-context.ts` (EventContext)

---

## 2. Module Connections

### 2.1 RBAC

| Connects to | Via | Rule |
|-------------|-----|------|
| User/Role Context | profiles, user_roles | Source of truth for system permissions |
| Org Context | — | RBAC role can be mapped to job_title.rbac_role (optional) |
| Event Context | event_access | Event-scoped access for partners |

**RBAC must not:** Store event-specific data or org-specific data. It owns system-wide permissions only.

---

### 2.2 M02 Event Operations

| Connects to | Via | Rule |
|-------------|-----|------|
| User/Role Context | profiles.role | Who can create/edit events |
| Event Context | etkinlik_events, event_access | All operations scoped to event |
| M04 | event_assignments, personnel | Personnel assigned to events |
| M03 | event_revenues, event_expenses, accounting_event_ledger | Financial data per event |
| Workflow | workflow_steps, workflow_tasks | Tasks per event |

**M02 must:** Use Event Context for all event-scoped reads/writes. Never bypass `can_access_event()`.

---

### 2.3 M03 Finance

| Connects to | Via | Rule |
|-------------|-----|------|
| User/Role Context | profiles.role | Who can view/manage finance |
| Event Context | event_id on revenues/expenses | Financial data tied to events |
| M02 | event_revenues, event_expenses | Source of event P&L |
| M04 | payroll_approvals, payroll_transfer_queue | Personnel → approved payments |

**M03 must:** Use event_id for event-level financial data. Use personnel_id for payroll flows.

---

### 2.4 M04 HR / Organization

| Connects to | Via | Rule |
|-------------|-----|------|
| User/Role Context | profiles.role | Who can manage personnel |
| Org Context | org_units, job_titles, assignments | Personnel ↔ org structure |
| Event Context | event_assignments, etkinlik_events | Personnel assigned to events |
| M02 | event_assignments | Personnel on events |
| M03 | payroll_approvals, payroll_transfer_queue | Approved payments → transfer |

**M04 must:** Use Organization Context for org-scoped data. Use Event Context for event assignments.

---

### 2.5 Workflow / Tasks

| Connects to | Via | Rule |
|-------------|-----|------|
| User/Role Context | profiles, created_by, assignee_id | Task ownership |
| Event Context | workflow_steps.event_id | Tasks tied to events |
| M02 | event_tasks | Event-level task summary |

**Workflow must:** Use event_id for event-scoped tasks. Use assignee_id for user context.

---

### 2.6 Notifications / Chat / Audit

| Connects to | Via | Rule |
|-------------|-----|------|
| User/Role Context | user_id, actor_user_id | Who triggered / who receives |
| Event Context | event_id (optional) | Notifications/audit can reference event |
| Org Context | — | Optional metadata |

**Audit must:** Store actor_user_id, target_entity, target_id. Optionally event_id for event-scoped actions.

---

## 3. Shared Entities and Data Flow

### 3.1 Shared Entity Summary

| Entity | Owner | Consumers | Event-scoped? |
|--------|-------|-----------|---------------|
| `profiles` | Auth | All modules | No |
| `org_units` | Org structure | M04, Org, RBAC mappings | No |
| `job_titles` | Org structure | M04, event_assignments | No |
| `personnel` | M04 HR | M04, Event assignments, Payroll | No |
| `etkinlik_events` | M02 | M02, M03, M04, Workflow | Yes (entity) |
| `event_access` | RBAC | M02, Event-scoped reads | Yes |
| `event_assignments` | M04 | M02, M04, Payroll | Yes |
| `event_revenues` | M02 | M02, M03 | Yes |
| `event_expenses` | M02 | M02, M03 | Yes |
| `payroll_approvals` | M04 | M04, M03 | Yes (event_id) |
| `payroll_transfer_queue` | M04 | M04, M03 | Yes (event_id) |
| `workflow_steps` | M02 | M02, Workflow | Yes |
| `workflow_tasks` | M02 | M02, Workflow | Yes |
| `audit_logs` | Platform | All modules | Optional (metadata) |

### 3.2 Data Flow Diagram (Conceptual)

```
                    ┌─────────────────┐
                    │  User/Role Ctx  │
                    │ (profiles, RBAC)│
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Org Context   │  │ Event Context   │  │ Event Context   │
│ (org_units,    │  │ (etkinlik_      │  │ (event_access)  │
│  job_titles)   │  │  events)        │  │                 │
└───────┬────────┘  └────────┬────────┘  └────────┬────────┘
        │                    │                    │
        │                    └──────────┬─────────┘
        │                               │
        ▼                               ▼
┌───────────────────────────────────────────────────────────┐
│  M04 HR / Organization                                     │
│  personnel, assignments, event_assignments,               │
│  payroll_approvals, payroll_transfer_queue                 │
└───────────────────────────────────────────────────────────┘
        │                               │
        │                               ▼
        │                    ┌───────────────────────────────────┐
        │                    │  M02 Event Operations              │
        │                    │  event_revenues, event_expenses,    │
        │                    │  workflow_steps, event_tasks        │
        │                    └───────────────────────┬────────────┘
        │                                            │
        │                                            ▼
        │                    ┌───────────────────────────────────┐
        └───────────────────►│  M03 Finance                       │
                             │  (consumes event + personnel data)  │
                             └───────────────────────────────────┘
```

---

## 4. Platform Connection Rules

### 4.1 No Module as Data Island

- **Rule:** Every module must read/write through shared platform entities or context.
- **Enforcement:** No module-specific tables that bypass `profiles`, `org_units`, `etkinlik_events`, or `event_access`.
- **Exception:** Module-specific config tables (e.g. `module_plans`) are allowed if they reference `module_code` or `event_id` for linkage.

### 4.2 Event-Centered Operations Use Event Context

- **Rule:** All operations that modify event-scoped data (revenues, expenses, crew, tasks, assignments) must use Event Context.
- **Enforcement:** Check `can_access_event()` before any event-scoped write. Use `event_id` from context for UI and API.
- **Data:** `event_access`, `event_organizations`, `etkinlik_events` are the source of truth for event scope.

### 4.3 Personnel / Org Flows Use Organization Context

- **Rule:** All operations that modify personnel or org structure must use Organization Context.
- **Enforcement:** Use `org_units`, `job_titles`, `assignments` from context. Personnel must belong to org_unit via assignment.
- **Data:** `org_units`, `job_titles`, `personnel`, `assignments` are the source of truth for org scope.

### 4.4 Permissions Use RBAC + Event-Scoped Access

- **Rule:** System permissions come from RBAC (profiles.role, user_roles). Event-scoped access comes from event_access.
- **Enforcement:** `can_access_event(uid, event_id, 'view'|'edit')` for event-scoped. `canAccess(role, resource, action)` for system.
- **Combined:** Internal staff (system_owner, ceo, admin, lead, staff) get full event access. Partners get event_access only.

---

## 5. Next Implementation Order

### Phase 1: Event Context Engine

**Goal:** Centralize event context resolution and expose it to the app.

**Tasks:**
1. Create `src/lib/context/event-context.ts` – resolve current event from URL or selection.
2. Create `getEventContext(userId, eventId?)` – returns `EventContext` with `eventAccessLevel`.
3. Integrate with `can_access_event()` from DB.
4. Add React context provider for event scope (optional, for UI).

**Deliverables:** Event context resolvable from `eventId` + `userId`. No UI changes.

---

### Phase 2: M02 Foundation

**Goal:** Ensure M02 Event Operations fully uses Event Context.

**Tasks:**
1. Audit all M02 data reads/writes – ensure they use `event_id` and `can_access_event()`.
2. Ensure `event_revenues`, `event_expenses`, `event_crew`, `event_tasks` are always event-scoped.
3. Ensure workflow_steps and workflow_tasks reference `event_id`.
4. Add `getEventContext` usage in M02 API routes.

**Deliverables:** M02 fully event-scoped. No data isolation.

---

### Phase 3: M02 ↔ M04 Integration

**Goal:** Event assignments and personnel flow correctly between M02 and M04.

**Tasks:**
1. Ensure `event_assignments` links `personnel_id` ↔ `event_id` ↔ `job_title_id`.
2. Ensure M02 event detail views can show assigned personnel from M04.
3. Ensure M04 kadro atama flows to M02 event visibility.
4. Ensure payroll_approvals and payroll_transfer_queue reference `event_id` for traceability.

**Deliverables:** Personnel assigned in M04 visible in M02. Event context shared.

---

### Phase 4: M02 ↔ M03 Integration

**Goal:** Event financial data flows correctly between M02 and M03.

**Tasks:**
1. Ensure `event_revenues`, `event_expenses`, `accounting_event_ledger` reference `event_id`.
2. Ensure M03 can consume event-level P&L from M02.
3. Ensure `payroll_transfer_queue` entries can be consumed by M03 Finance.
4. Add event_id to any M03 transfer/ledger records for audit trail.

**Deliverables:** Event P&L flows from M02 to M03. Payroll flows from M04 to M03.

---

## 6. Summary

| Platform Core | Shared Entities | Consumers |
|---------------|-----------------|-----------|
| **User/Role** | profiles, user_roles, role_permissions | RBAC, all modules |
| **Organization** | org_units, job_titles, assignments, personnel | M04, Org, RBAC mappings |
| **Event** | etkinlik_events, event_access, event_organizations | M02, M03, M04, Workflow |

**Connection model:** All modules must consume at least one platform core. Event-scoped modules must use Event Context. Personnel/org modules must use Organization Context. Permissions always use RBAC + event-scoped access.

---

## 7. Next Coding Phase

**Recommended start:** Phase 1 – Event Context Engine.

1. Implement `src/lib/context/event-context.ts` with `getEventContext(userId, eventId?)`.
2. Integrate with existing `can_access_event()` and `event_access` table.
3. Wire `OperationalContext` to include resolved Event Context when `eventId` is provided.
4. No UI changes. Foundation only.

**Then:** Phase 2 – M02 foundation audit and Event Context integration.
