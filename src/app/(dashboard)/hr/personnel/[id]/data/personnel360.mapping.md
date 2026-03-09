# Personnel 360 Real Data Mapping Plan

This document maps each section of `Personnel360Data` to real data sources for future integration. No backend fetching is implemented yet.

---

## Data Source Categories

| Category | Tables / Sources | Notes |
|----------|------------------|-------|
| **Core Personnel** | `personnel`, `assignments`, `job_titles`, `org_units` | HR records, assignments, org structure |
| **RBAC / Access** | `profiles`, `user_roles`, `roles`, `event_access` | System roles, event access |
| **Tasks / Events** | `tasks`, `task_boards`, `etkinlik_events`, `event_access` | Tasks (auth.users), events (M02) |
| **Finance / Contracts** | `personnel` (salary fields), `personnel_documents` | Salary, documents; contracts may need new table |
| **Audit / History** | `audit_logs` | System activity, IP, user agent |

---

## 1. header (PersonnelHeaderData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| initials | Derived from name | `personnel` | `first_name`, `last_name` → first letters | **Computed** | Or `profiles.avatar_url` if available |
| fullName | Core personnel | `personnel` | `full_name` or `first_name` + `last_name` | **Direct** | `getFullName()` exists in `lib/m04/personnel.ts` |
| title | Job title | `job_titles` via `personnel.job_title_id` or `assignments` | `job_titles.name` | **Direct** | Prefer primary assignment |
| email | Core personnel | `personnel` | `email` | **Direct** | |
| manager | Reports-to | `personnel.reports_to_person_id` or `assignments.reports_to_personnel_id` | Join to `personnel` for manager name | **Direct** | Resolve via assignment or personnel FK |
| status | Core personnel | `personnel` | `status` | **Direct** | `active` \| `inactive` \| `blacklist` \| `on_leave` |
| statusVariant | Derived | App layer | Map `status` → `active` \| `inactive` \| `warning` | **Computed** | |

---

## 2. kpi (KpiItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| Açık Görev | Tasks | `tasks` | `COUNT(*) WHERE assignee_id = profile_id AND status != 'done'` | **Aggregated** | Tasks use `auth.users`; need `profile_id` from `personnel.profile_id` |
| Aktif Event Ataması | Event access | `event_access` | `COUNT(*) WHERE profile_id = personnel.profile_id` | **Aggregated** | Event access is profile-based |
| Yetki Seviyesi | RBAC | `user_roles`, `roles` | Highest role or `personnel.rbac_role` | **Direct / Aggregated** | `personnel.rbac_role` exists; RBAC v1 may differ |
| Bekleyen Onay | Approvals | `approval_requests` | Count pending for person | **Aggregated** | Schema exists; verify personnel linkage |
| Son Değerlendirme | Performance | **Mock-only** | — | **Mock-only** | No performance/feedback table yet |
| Son Aktivite | Audit | `audit_logs` | `MAX(created_at) WHERE target_id = personnel_id` | **Aggregated** | Need `target_entity = 'personnel'` and `target_id` |

---

## 3. overview (OverviewData)

### 3.1 identity (OverviewIdentityData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| adSoyad | Core personnel | `personnel` | `full_name` or `first_name` + `last_name` | **Direct** | |
| kurumsalEposta | Core personnel | `personnel` | `email` | **Direct** | |
| kisiselEposta | **Mock-only** | — | — | **Mock-only** | No personal email column; may need schema extension |
| telefon | Core personnel | `personnel` | `phone` | **Direct** | |
| unvan | Job title | `job_titles` | `name` | **Direct** | Via `personnel.job_title_id` or assignment |
| departman | Org unit | `org_units` | `name` | **Direct** | Via `personnel.org_unit_id` or assignment |
| yonetici | Reports-to | `personnel` / `assignments` | Manager `full_name` | **Direct** | |
| lokasyon | **Mock-only** | — | — | **Mock-only** | No location column in personnel |
| iseGirisTarihi | Core personnel | `personnel` | `hire_date` | **Direct** | |
| toplamKidem | Derived | App layer | `hire_date` → years/months | **Computed** | |
| calismaModeli | **Mock-only** | — | — | **Mock-only** | No work model; `assignments.assignment_type` may partially cover |
| sistemDurumu | Core personnel | `personnel` | `status` or `is_active` | **Direct** | |

### 3.2 orgPosition (OverviewOrgPositionData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| costCenter | **Mock-only** | — | — | **Mock-only** | No cost_center; may need `org_units` or new field |
| rbacRolu | RBAC | `personnel.rbac_role` or `user_roles` + `roles` | Role name | **Direct** | |
| sistemHesabiDurumu | Profiles | `profiles.is_active` | `is_active` | **Direct** | Via `personnel.profile_id` → `profiles` |
| maasBandi | **Mock-only** | — | — | **Mock-only** | `salary_monthly` exists but band (P1–P5) is derived; no band table |
| modulSorumlulugu | **Mock-only** | — | — | **Mock-only** | No module responsibility table |
| hiyerarsikSeviye | **Mock-only** | — | — | **Mock-only** | `job_titles.rank_order` could inform; no explicit level |
| kisaProfesyonelOzet | **Mock-only** | — | — | **Mock-only** | No biography column |

### 3.3 compliance (OverviewComplianceData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| gmwDnaOnayi | **Mock-only** | — | — | **Mock-only** | `gm_dna_profiles` may exist; verify linkage |
| ndaDurumu | **Mock-only** | — | — | **Mock-only** | No NDA status table; `personnel_documents` by type? |
| isSozlesmesiDurumu | **Mock-only** | — | — | **Mock-only** | No contract status table |
| arsivDurumu | **Mock-only** | — | — | **Mock-only** | No archive status |

### 3.4 responsibilities (OverviewResponsibilitiesData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| etkinlikler | Event access | `event_access` + `etkinlik_events` | Join by `profile_id`; need role per event | **Aggregated** | `event_access` has `access_level`; role label may need extension |
| roller | RBAC | `user_roles`, `roles` | Role names for user | **Aggregated** | Via `personnel.profile_id` → `user_roles` |
| anaSorumluluklar | **Mock-only** | — | — | **Mock-only** | No responsibility list table |

### 3.5 activity (ActivityEntry[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| title, description, time | Audit | `audit_logs` | `action`, `message`, `created_at` | **Aggregated** | Filter by `target_entity = 'personnel'`, `target_id = personnel.id` |
| iconKey | App layer | — | Map `action` / `category` to icon | **Computed** | |

---

## 4. finance (FinanceTabData)

### 4.1 agreementFramework (AgreementFrameworkData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| calismaModeli | **Mock-only** | `assignments.assignment_type`? | `full_time` etc. | **Derived** | Partial mapping possible |
| sozlesmeTipi | **Mock-only** | — | — | **Mock-only** | No contract type table |
| baslangicTarihi | Assignments | `assignments` | `start_date` | **Direct** | Primary assignment |
| bitisTarihi | **Mock-only** | `assignments.end_date`? | — | **Direct** | If contract = assignment |
| kalanGun | Derived | App layer | From `bitisTarihi` | **Computed** | |
| gmwDnaOnayi, ndaDurumu, isSozlesmesiDurumu | **Mock-only** | — | — | **Mock-only** | See compliance |

### 4.2 paymentMethod (PaymentMethodData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| odemeTuru | Core personnel | `personnel` | `compensation_type`, `salary_type` | **Direct** | |
| faturaGerekliligi | **Mock-only** | — | — | **Mock-only** | |
| vergiBelgeDurumu | **Mock-only** | — | — | **Mock-only** | |
| odemeKanali | **Mock-only** | — | — | **Mock-only** | |
| hesapYontemOzeti | Core personnel | `personnel` | `iban` (masked) | **Direct** | |

### 4.3 dynamicHakedis (DynamicHakedisData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| temelUcret | Core personnel | `personnel` | `salary_monthly`, `daily_rate` | **Direct** | |
| bonusModeli, projeBazliEkOdeme | **Mock-only** | — | — | **Mock-only** | |
| toplamTahakkuk | **Mock-only** | — | — | **Mock-only** | Would need payroll/earnings table |
| sonOdemeTarihi | **Mock-only** | — | — | **Mock-only** | |
| guncelOdemeStatusu | **Mock-only** | — | — | **Mock-only** | |
| recentEarnings | **Mock-only** | `event_expenses`? | Per-event payments to person | **Aggregated** | No personnel→expense link yet |

### 4.4 documentArchive (DocumentArchiveItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| belgeAdi, belgeTipi, tarih, versiyonDurum | Documents | `personnel_documents` | `name`, `doc_type`, `created_at` | **Direct** | `doc_type` for tip; version may need extension |

---

## 5. tasks (WorkloadTabData)

### 5.1 openTasks (OpenTaskItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| gorevAdi, kisaAciklama | Tasks | `tasks` | `title`, `description` | **Direct** | |
| oncelik | Tasks | `tasks` | `priority` | **Direct** | Map to high/medium/low |
| durum | Tasks | `tasks` | `status` | **Direct** | Map todo/doing → open/in_progress |
| teslimTarihi | Tasks | `tasks` | `due_date` | **Direct** | |
| ilgiliAlan | Tasks | `tasks` | `tags` or `metadata` | **Derived** | **Gap**: `tasks.assignee_id` → `auth.users`, not `personnel`. Need `personnel.profile_id` join. |

### 5.2 completedTasks (CompletedTaskItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| gorevAdi, tamamlanmaTarihi, meta | Tasks | `tasks` | `title`, `completed_at`, `tags` | **Direct** | Same personnel↔profile linkage |

### 5.3 eventAssignments (EventAssignmentItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| etkinlikAdi, lokasyon, tarih | Events | `etkinlik_events` | `name`, `venue`, `date` | **Direct** | |
| atananRol | **Mock-only** | `event_access.access_level`? | `view` \| `edit` | **Partial** | No role label (Sahne Yöneticisi etc.); may need `event_personnel_roles` |
| durum | Events | `etkinlik_events` | `status` | **Direct** | Map to upcoming/ongoing/completed |
| operasyonOzeti | **Mock-only** | — | — | **Mock-only** | |
| **Linkage** | — | `event_access` + `personnel.profile_id` | Join events where `profile_id = personnel.profile_id` | **Aggregated** | |

### 5.4 relatedDocuments (RelatedDocumentItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| belgeAdi, belgeTipi, tarih, boyutVersiyon | Documents | `personnel_documents` or event docs | `name`, `doc_type`, `created_at` | **Direct** | Version/size may need extension |

---

## 6. organization (OrganizationTabData)

### 6.1 hierarchySchema (HierarchySchemaData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| ustYonetici | Assignments | `assignments.reports_to_personnel_id` | Join to personnel for manager | **Direct** | `fetchPersonAssignments` in org-structure |
| mevcutPersonel | Core personnel | `personnel` + assignment | Current person + job title | **Direct** | |
| direktRaporlayanlar | Assignments | `assignments` WHERE `reports_to_personnel_id = id` | Direct reports | **Aggregated** | Org-structure has tree helpers |

### 6.2 reportingAuthority (ReportingAuthorityData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| dogrudanYonetici | Assignments | `reports_to` person name | **Direct** | |
| fonksiyonelYonetici | **Mock-only** | — | — | **Mock-only** | No functional manager; may = dogrudan |
| hiyerarsikSeviye | **Mock-only** | `job_titles.rank_order`? | **Derived** | |
| onayZinciri | **Mock-only** | — | — | **Mock-only** | |
| modulSorumlulugu | **Mock-only** | `org_units.module_code`? | **Partial** | |
| departmanSahibi | Org units | `org_units.manager_id` → personnel | **Direct** | |

### 6.3 departmentInfo (DepartmentInfoData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| departman | Org units | `org_units.name` | **Direct** | Via assignment |
| butce | **Mock-only** | — | — | **Mock-only** | No org budget table |
| costCenter | **Mock-only** | — | — | **Mock-only** | |
| departmanBaskani | Org units | `org_units.manager_id` → personnel | **Direct** | |
| ekipUyeSayisi | Assignments | `COUNT(assignments) WHERE org_unit_id = X` | **Aggregated** | |
| anaSorumlulukAlani | **Mock-only** | — | — | **Mock-only** | |

### 6.4 delegation (DelegationData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| All fields | **Mock-only** | — | — | **Mock-only** | No delegation/vekalet table |

### 6.5 fallbackRules (FallbackRule[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| kosul, sonuc | **Mock-only** | — | — | **Mock-only** | Config or system_settings; not per-person |

---

## 7. performance (PerformanceTabData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| performanceSummary | **Mock-only** | — | — | **Mock-only** | No performance/feedback tables |
| competencies | **Mock-only** | — | — | **Mock-only** | No competency/skill tables |
| feedback | **Mock-only** | — | — | **Mock-only** | No 360 feedback table |
| developmentAreas | **Mock-only** | — | — | **Mock-only** | |
| trainingCertifications | **Mock-only** | — | — | **Mock-only** | No training/cert table |
| trendData | **Mock-only** | — | — | **Mock-only** | |

**Entire performance section**: Requires new schema (e.g. `personnel_feedback`, `personnel_competencies`, `personnel_training`).

---

## 8. history (HistoryTabData)

### 8.1 activitySummary (ActivitySummaryData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| son30GunIslemSayisi | Audit | `audit_logs` | `COUNT(*) WHERE target_id = personnel_id AND created_at > now() - 30d` | **Aggregated** | Need `target_entity`, `target_id` for personnel |
| sonRolDegisikligi | Audit | `audit_logs` | Latest `action` like 'role_change' | **Aggregated** | |
| sonSozlesmeGuncellemesi | **Mock-only** | — | — | **Mock-only** | |
| sonPerformansDegerlendirmesi | **Mock-only** | — | — | **Mock-only** | |

### 8.2 careerJourney (CareerJourneyItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| All fields | **Schema extension** | New `personnel_career_events`? | `event_type`, `title`, `description`, `date`, `before`, `after` | **New table** | Or derive from `assignments` history (no history table) |

### 8.3 auditLog (AuditLogItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| islemTipi | Audit | `audit_logs` | `action` | **Direct** | |
| kisaAciklama | Audit | `audit_logs` | `message` | **Direct** | |
| tarihSaat | Audit | `audit_logs` | `created_at` | **Direct** | |
| yapanKisi | Audit | `audit_logs` | `actor_email` or join `profiles` | **Direct** | |
| ipBilgisi | Audit | `audit_logs` | `request_ip` | **Direct** | |
| cihazOturumOzeti | Audit | `audit_logs` | `request_user_agent` | **Direct** | |
| **Filter** | — | `target_entity = 'personnel'`, `target_id = personnel.id` | — | — | Ensure audit logs set target for personnel actions |

### 8.4 milestones (MilestoneItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| All fields | **Mock-only** | — | — | **Mock-only** | New `personnel_milestones` table or derive from assignments/audit |

### 8.5 revisionHistory (RevisionHistoryItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| belgeAdi, versiyon, tarih, durum | Documents | `personnel_documents` | `name`, version from metadata?, `created_at` | **Direct** | Version/durum may need `metadata` or new columns |

---

## 9. sidebar (SidebarData)

### 9.1 currentStatus (CurrentStatusData)

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| durum | Core personnel | `personnel` | `status` | **Direct** | |
| sistemHesabi | Profiles | `profiles.is_active` | **Direct** | Via `personnel.profile_id` |
| onayBekleyen | Approvals | `approval_requests` | Count pending | **Aggregated** | Verify personnel linkage |
| acikGorev | Tasks | `tasks` | Count open (see tasks section) | **Aggregated** | |

### 9.2 criticalAlerts (CriticalAlertItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| All fields | **Mock-only** | — | — | **Mock-only** | Business rules: contract expiry, NDA, archive. Need alert engine or config. |

### 9.3 upcomingDates (UpcomingDateItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| All fields | **Derived** | `assignments.end_date`, contract dates, performance cycles | Aggregate from multiple sources | **Computed** | No single upcoming_dates table |

### 9.4 recentActions (RecentActionItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| All fields | Audit | `audit_logs` | Last N rows for personnel target | **Aggregated** | Same as history.auditLog |

### 9.5 quickAccess (QuickAccessItem[])

| UI Field | Expected Source | Table / Query | Column / Logic | Type | Notes |
|----------|-----------------|---------------|----------------|------|-------|
| All fields | App layer | — | Static links with `personnelId` | **Computed** | No DB; build hrefs in app |

---

## Summary: Mock-Only vs Mappable

| Section | Direct/Existing | Computed/Aggregated | Mock-Only / New Schema |
|---------|-----------------|---------------------|-------------------------|
| header | Most | statusVariant | — |
| kpi | 2–3 | 2–3 | 1–2 |
| overview | ~60% | ~15% | ~25% |
| finance | ~30% | ~10% | ~60% |
| tasks | ~50% | ~30% | ~20% (personnel↔tasks link) |
| organization | ~70% | ~10% | ~20% |
| performance | 0% | 0% | 100% |
| history | ~40% | ~30% | ~30% |
| sidebar | ~40% | ~30% | ~30% |

---

## Schema Gaps / New Tables

| Gap | Suggested Solution |
|-----|--------------------|
| Personnel ↔ Tasks | Link `tasks` to `personnel` via `personnel.profile_id` = `tasks.assignee_id` (profile), or add `personnel_assignee_id` to tasks |
| Event role labels | Add `event_personnel_roles` (event_id, personnel_id, role_label) or extend `event_access` |
| Performance / 360 | New tables: `personnel_feedback`, `personnel_competencies`, `personnel_training` |
| Career journey | New `personnel_career_events` or audit-based derivation |
| Contracts / NDA status | New `personnel_contracts` or extend `personnel_documents` with status |
| Delegation (vekalet) | New `personnel_delegations` |
| Cost center, budget | Extend `org_units` or new `org_unit_finance` |
| Personal email, location | Extend `personnel` or `profiles` |

---

## Recommended Read-Only Integration Order

1. **Phase 1: Core Personnel (header, overview.identity, overview.orgPosition partial)**
   - Use `fetchPersonnelById`, `job_titles`, `org_units`, `assignments`
   - Lowest risk; data exists and is used elsewhere

2. **Phase 2: Organization (hierarchy, reporting, department)**
   - Use `org-structure` data: `fetchOrgUnits`, `fetchPersonAssignments`
   - Already used by HR org tree

3. **Phase 3: RBAC & Profiles (kpi.Yetki Seviyesi, overview.orgPosition.rbacRolu, sistemHesabi)**
   - Use `user_roles`, `roles`, `profiles` via `personnel.profile_id`
   - Requires user-personnel linking

4. **Phase 4: Documents (finance.documentArchive, tasks.relatedDocuments, history.revisionHistory)**
   - Use `personnel_documents`
   - Simple, low risk

5. **Phase 5: Audit Log (history.auditLog, sidebar.recentActions)**
   - Use `audit_logs` with `target_entity = 'personnel'`, `target_id = personnel.id`
   - Ensure write path sets target for personnel actions

6. **Phase 6: Tasks (kpi.Açık Görev, tasks.openTasks, tasks.completedTasks)**
   - Use `tasks` joined via `personnel.profile_id` = `tasks.assignee_id`
   - Verify RLS and assignee semantics

7. **Phase 7: Event Assignments (overview.responsibilities.etkinlikler, tasks.eventAssignments)**
   - Use `event_access` + `etkinlik_events` via `personnel.profile_id`
   - Add role labels if needed (schema extension)

8. **Phase 8: Finance (payment method, salary, partial agreement)**
   - Use `personnel` salary fields, `assignments` dates
   - Rest remains mock until contract/salary schema exists

9. **Phase 9: Sidebar (currentStatus, upcomingDates partial)**
   - Derive from personnel, assignments, audit
   - criticalAlerts needs business rules

10. **Phase 10: Performance & History (career, milestones)**
    - Requires new schema; defer until tables exist

---

*Document version: 1.0 — Created for Personnel 360 Phase 2 data centralization.*
