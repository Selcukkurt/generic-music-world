# Global Foundation Pass – Summary of Changes

## 1. Global Design Tokens (`src/app/globals.css`)

- **Semantic CSS variables** added under `:root`:
  - `--primary`, `--surface`, `--surface2`, `--border`, `--muted`, `--text`, `--text-muted`
  - `--success`, `--warning`, `--danger`
  - `--color-surface-hover` for interactive hover states
- **Tailwind @theme** extended with semantic color mappings.
- **`[data-theme="dark"]`** block kept for future theming.
- Replaced hardcoded `slate` / `zinc` in shell, cards, and buttons with semantic tokens (e.g. `bg-[var(--color-surface2)]`, `hover:bg-[var(--color-surface-hover)]`).

## 2. State Pattern Foundation (`src/context/ShellUIContext.tsx`)

- **ShellUIProvider** (React Context) manages shell-level state:
  - `sidebarOpen`, `modulePanelOpen`, `searchOpen`
  - Actions: `openSidebar`, `closeSidebar`, `openModulePanel`, `closeModulePanel`, `openSearch`, `closeSearch`, `toggleSearch`
- **Layout** wraps dashboard shell with `ShellUIProvider`.
- **GlobalHeader**, **AppSidebar**, **ModuleRightPanel** use `useShellUI()` so behavior is the same across pages.

## 3. Mobile UX

- **Header**: responsive logo (`h-8 sm:h-10 lg:h-12`), padding `px-4 sm:px-6`, tap targets `min-h-[36px] min-w-[36px]`.
- **Sidebar**: off-canvas on mobile with backdrop; hamburger in header.
- **Module panel**: slide-in overlay on mobile; module menu button only on M01 routes.
- **Search**: overlay from header icon, Cmd+K shortcut.
- **Login**: responsive padding `px-4 sm:px-6`.
- **Content**: `px-4 sm:px-6 lg:px-8`, `overflow-x-hidden` on root.

## 4. Layout Lock

- **Header**: fixed height `--header-height: 56px`.
- **ContentArea**: `ui-section` with `max-width: 1440px` and centered layout.
- **PageHeader** (`src/components/shell/PageHeader.tsx`): shared header for Dashboard, Profile, and module pages with title, subtitle, and optional actions.
- **PageSlot** updated to use PageHeader.
- **ProfileIdentity** and **DashboardHomeClient** use `ui-heading-page` / `ui-heading-card`.

## 5. Metadata & SEO (`src/app/layout.tsx`)

- Root layout metadata: `title` (template), `description`, `icons`, `openGraph`.
- Route metadata unchanged: `/login`, `/dashboard`, `/profile`, `/m01` already define titles.

## 6. Production Readiness

- **Error boundaries**: `src/app/error.tsx` (root), `src/app/(dashboard)/error.tsx` (dashboard).
- **Debug logs** removed from `LoginForm.tsx`.
- **.env.example** added for Supabase env vars.
- Env usage remains correct: only `NEXT_PUBLIC_` for client.

## 7. UI Notes (No Visual Redesign)

- **Turkish labels**: `module_card_status_active` = "Aktif", `module_card_status_draft` = "Hazırlanıyor".
- **Sidebar footer**: "© 2026 Generic Music Studio. Tüm hakları saklıdır." when sidebar is expanded.
- Dark glass style, module cards, and welcome card kept as before.

---

## Verification Checklist

| Check | Where to verify |
|-------|-----------------|
| Design tokens | `globals.css` – semantic variables; shell uses `var(--color-*)` |
| Shell state | Open sidebar/search/module panel on any page – behavior matches |
| Mobile (320px–375px) | DevTools responsive mode, header + sidebar + no overflow |
| Tablet (768px) | Same, cards grid 2 columns |
| Desktop (1024px–1440px) | Sidebar visible, module panel on M01 |
| Metadata | Browser tab on /login, /dashboard, /profile, /m01 |
| Build | `npm run build` – succeeds |
| Lint | `npm run lint` – no errors (warnings only) |
