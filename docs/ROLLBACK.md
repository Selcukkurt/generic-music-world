# Rollback Table

| Tag / Release | Commit | Description |
|---------------|--------|-------------|
| RB-003 | — | Global UI + RBAC Foundation Stable |
| RB-004 | — | Global UI + RBAC v1 + Module Status System |
| RB-006 | — | Sidebar UX + Active route fix + Login stabilization |
| RB-007 | — | GM DNA Okudum & Anladım acceptance + Kurumsal Onaylar |
| **RB-008** | — | Professional RBAC: SYSTEM_OWNER vs CEO separation |

## RB-008: Professional RBAC Separation

- **SYSTEM_OWNER**: Full system + business access. Seed: `selcuk@genericmusic.net`
- **CEO**: Business-only, no system permissions. Seed: `ceo@genericmusic.net`
- **Routes**: `/system/*` protected, SYSTEM_OWNER only
- **Rollback**: `git checkout tags/RB-007` (or prior tag)
