# Supabase Auth: invite email & redirects

**Production:** Branded Turkish invite template, SMTP (`info@genericmusic.net`), and URL checklist — see **[supabase-production-email-gmw.md](./supabase-production-email-gmw.md)** and **[templates/supabase-invite-user.html](./templates/supabase-invite-user.html)**.

Use this checklist when **invite email fails** or **redirect after invite link** breaks. App code logs `redirectTo` and full Auth errors on the server; clients only see generic messages.

## 1. Authentication → Email / SMTP

- Enable the **Email** provider.
- Configure **SMTP** (custom or provider) if you need reliable delivery; check Supabase project logs for SMTP errors.

## 2. Authentication → URL Configuration

- **Site URL**: set to your real app origin (e.g. `https://your-domain.com` in production).
- **Redirect URLs**: add every origin + path the app uses, **exactly** (scheme + host + port + path):
  - `http://localhost:3005/auth/callback` (dev, if you use `NEXT_PUBLIC_SITE_URL=http://localhost:3005`)
  - `http://127.0.0.1:3005/auth/callback` (only if you open the app via 127.0.0.1)
  - `https://your-domain.com/auth/callback` (production)
  - Optionally `/auth/set-password` if you still link there.

Mismatch here often surfaces as **redirect URL not allowed** in logs (see `failure_hint` in server logs).

## 3. Authentication → Email Templates

- Open **Invite user** (or equivalent) and ensure the template is present and variables are valid.
- Broken templates can cause send failures; check Auth logs in the dashboard.

## 4. App environment

- Set `NEXT_PUBLIC_SITE_URL` in `.env.local` to the same origin you added to **Redirect URLs** (recommended for dev: `http://localhost:3005`).
- The invite API builds `redirectTo` as `{origin}/auth/callback` using `getInviteRedirectOrigin()` (env overrides request origin).

## 5. Fallback (app)

If `inviteUserByEmail` fails, the API attempts **createUser** + **generateLink** and may return `manualInviteLink` for admins to share manually—without exposing raw Supabase errors to the UI.

The RBAC UI uses shared copy in `src/lib/rbac/inviteToast.ts` so success toasts differ between **e-posta gönderildi** (normal path) and **elle davet** / hesap-only fallback paths.

---

## 6. Branding, tone & production email (non-blocking improvements)

These are configured in the **Supabase Dashboard**, not in app code.

### Replace the default invite template

1. Go to **Authentication → Email Templates** → **Invite user**.
2. Replace the default subject/body with Generic Music World wording (product name, support contact, tone).
3. Keep Supabase template variables intact, e.g. `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}` — see [Supabase Auth email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
4. Send a test invite in staging and proofread on mobile clients.

### Sender identity & SMTP (production)

- **Authentication → Providers → Email**: use **custom SMTP** when you need a fixed **From** domain (SPF/DKIM), higher quotas, or compliance.
- Decide **From** name (e.g. `Generic Music World`) and **reply-to** if support should receive replies.
- Document the chosen setup in your internal runbook (not in this repo).

### Align language with product tone

- Turkish vs English: match your primary user locale; Supabase allows one template per project — use the language your users expect, or plan i18n at the template layer if you maintain multiple projects/environments.

---

## 7. Quick HTML sketch (customize in Dashboard)

Subject example: `Generic Music World — Hesabınızı tamamlayın`

Body (HTML) — adjust branding; preserve `{{ .ConfirmationURL }}`:

```html
<p>Merhaba,</p>
<p>Generic Music World platformuna davet edildiniz. Hesabınızı etkinleştirmek için aşağıdaki bağlantıya tıklayın:</p>
<p><a href="{{ .ConfirmationURL }}">Daveti kabul et</a></p>
<p>Bu e-postayı siz beklemiyorsanız yok sayabilirsiniz.</p>
```
