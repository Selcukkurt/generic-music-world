# Personnel 360 Real Data Integration — Phase 1 Summary

Phase 1 replaces mock data with real read-only data for the safest first slice: header, overview identity, overview orgPosition (partial), and KPI (partial).

## Files

| File | Purpose |
|------|---------|
| `personnel360.real.ts` | Loader (`loadPersonnel360RealDataSlice`) and mapper (`mapRawToPersonnel360Slice`) |
| `personnel360.merge.ts` | Merge helper (`mergePersonnel360Data`) — real overrides mock where present |
| `Personnel360Page.tsx` | Uses loader + merge; shows mock immediately, then merges real when loaded |

## Fields Now Real (from DB)

### Header
| Field | Source |
|-------|--------|
| initials | Derived from `personnel.first_name` + `last_name` |
| fullName | `personnel.full_name` or `first_name` + `last_name` |
| title | `job_titles.name` via `personnel.job_title_id` |
| email | `personnel.email` |
| manager | `personnel.reports_to_person_id` → `personnel` |
| status | `personnel.status` (mapped to Turkish label) |
| statusVariant | Derived from `personnel.status` |

### Overview — Identity
| Field | Source |
|-------|--------|
| adSoyad | `personnel.full_name` or `first_name` + `last_name` |
| kurumsalEposta | `personnel.email` |
| unvan | `job_titles.name` |
| departman | `org_units.name` via `personnel.org_unit_id` |
| yonetici | Manager `full_name` via `reports_to_person_id` |
| telefon | `personnel.phone` |
| iseGirisTarihi | `personnel.hire_date` (formatted DD.MM.YYYY) |
| toplamKidem | Derived from `personnel.hire_date` |
| sistemDurumu | `personnel.status` (mapped to Turkish) |

### Overview — Org Position (partial)
| Field | Source |
|-------|--------|
| rbacRolu | `personnel.rbac_role` |
| sistemHesabiDurumu | `profiles.is_active` via `personnel.profile_id` → `app_users` |

### KPI
| Field | Source |
|-------|--------|
| Yetki Seviyesi | `personnel.rbac_role` |

## Fields Still Mock

- **Header**: None (all real in Phase 1)
- **Overview identity**: `kisiselEposta`, `lokasyon`, `calismaModeli`
- **Overview orgPosition**: `costCenter`, `maasBandi`, `modulSorumlulugu`, `hiyerarsikSeviye`, `kisaProfesyonelOzet`
- **Overview**: `compliance`, `responsibilities`, `activity` (entire sections)
- **KPI**: Açık Görev, Aktif Event Ataması, Bekleyen Onay, Son Değerlendirme, Son Aktivite
- **Finance, tasks, organization, performance, history, sidebar**: Unchanged (all mock)

## Not Integrated Yet

- Performance, compliance, delegation, milestones, career journey
- Critical alerts, advanced finance logic, approval logic
- Mutable actions

## Technical Notes

- Read-only queries only; no mutations
- Null-safe: missing fields fall back to mock
- `Personnel360Data` remains the page contract
- Loader uses `fetchPersonnelById`, `fetchReportsToPersonnel`, `fetchLinkedUsers` from `@/lib/m04/personnel`
