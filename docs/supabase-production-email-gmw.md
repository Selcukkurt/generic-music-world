# Generic Music World — production auth e-postası (davet)

Bu doküman **Supabase Dashboard** üzerinde yapılandırılır. **Uygulama davet API’si ve yönlendirme mantığı değiştirilmez** (`/api/rbac/users/invite`, `redirectTo` → `/auth/callback`).

---

## Gönderici kimliği

| Alan | Değer |
|------|--------|
| **From name** | Generic Music World |
| **From email** | info@genericmusic.net |
| **Reply-To** | info@genericmusic.net |

**Google Workspace:** SMTP kullanıcı adı genelde posta kutusu ile aynı olmalıdır (`info@genericmusic.net` veya Workspace’in tanımladığı gönderim hesabı). **App Password** veya sağlayıcı talimatına uyun.

---

## Supabase SMTP alanları — kontrol listesi

**Authentication → Providers → Email** (custom SMTP etkin):

| Alan | Açıklama |
|------|----------|
| **Host** | SMTP sunucusu (örn. `smtp.gmail.com`) |
| **Port** | Genelde `587` (STARTTLS) veya `465` (SSL) |
| **User** | SMTP kullanıcı adı (çoğu senaryoda `info@genericmusic.net`) |
| **Password** | SMTP şifresi / uygulama şifresi |
| **Sender email** | `info@genericmusic.net` |
| **Sender name** | `Generic Music World` |
| **Reply-To** | `info@genericmusic.net` (Dashboard’da alan varsa) |

Ayrıca: **Enable custom SMTP** açık olmalı. Üretimde varsayılan Supabase postası yerine özel SMTP önerilir; SPF/DKIM için DNS’i doğrulayın.

---

## URL yapılandırması

Uygulama `getInviteRedirectOrigin` ile `redirectTo = {origin}/auth/callback` üretir; **`NEXT_PUBLIC_SITE_URL`** ortam değişkeni ile hizalayın.

**Authentication → URL Configuration**

| Ortam | Site URL (örnek) | Redirect URLs |
|--------|------------------|----------------|
| Local | `http://localhost:3005` | `http://localhost:3005/auth/callback` |
| Prod | `https://online.genericmusic.net` | `https://online.genericmusic.net/auth/callback` |

**Env (ortam başına):**

- Local: `NEXT_PUBLIC_SITE_URL=http://localhost:3005`
- Prod: `NEXT_PUBLIC_SITE_URL=https://online.genericmusic.net`

Ayrıntılar: `env.example`.

---

## Repo referansları

| Dosya | Amaç |
|--------|------|
| [templates/supabase-invite-user.html](./templates/supabase-invite-user.html) | Supabase “Invite user” gövdesine yapıştırılacak HTML |
| [../src/lib/rbac/inviteToast.ts](../src/lib/rbac/inviteToast.ts) | Başarı toast’ları: birincil yol **gönderim başlatıldı**; fallback’ler **e-posta gönderildiği iddia edilmez** |
| `src/lib/supabase/env.ts` | `getInviteRedirectOrigin` |
| `src/app/api/rbac/users/invite/route.ts` | Davet API (davranış değişmez) |

**Fallback:** `inviteUserByEmail` başarısız olursa API `createUser` + `generateLink` ile devam eder; bu davranış **aynı kalır**.

---

## Manuel adımlar (Supabase Dashboard)

Aşağıdakiler kod deposunda otomatik yapılamaz; her ortam için elle uygulanır.

### 1. Authentication → Providers → Email

- Özel **SMTP**’yi etkinleştirin.
- **Host**, **Port**, **User**, **Password** alanlarını doldurun.
- **Sender email** = `info@genericmusic.net`
- **Sender name** = `Generic Music World`
- **Reply-To** = `info@genericmusic.net` (destekleniyorsa)

### 2. Authentication → URL Configuration

- Ortama göre **Site URL** ayarlayın (local vs prod).
- **Redirect URLs** listesine şunları ekleyin:
  - `http://localhost:3005/auth/callback`
  - `https://online.genericmusic.net/auth/callback`

### 3. Authentication → Email Templates → Invite user

- **Subject:** `Generic Music World davetiniz`
- **Body:** `docs/templates/supabase-invite-user.html` dosyasının tamamını HTML olarak yapıştırın.

Şablonda yalnızca **`{{ .ConfirmationURL }}`** kullanılır (CTA butonu). Sabit localhost/production URL yazmayın.

---

## Uygulama içi toast (sınırlama)

Gelen kutusuna **kesin teslimat** uygulama tarafından doğrulanamaz. Birincil başarı yolunda metinler **“davet tamamlandı”** ve **“gönderim başlatıldı”** şeklindedir; fallback yollarında **giden e-posta gönderildiği iddia edilmez** (`inviteToast.ts`).

---

## Test listeleri

### Local

1. `NEXT_PUBLIC_SITE_URL=http://localhost:3005`
2. RBAC üzerinden davet gönderin
3. Davet e-postasının geldiğini doğrulayın
4. Bağlantının `/auth/callback` üzerinden çözüldüğünü doğrulayın

### Production

1. `NEXT_PUBLIC_SITE_URL=https://online.genericmusic.net` (hosting env)
2. `https://online.genericmusic.net` üzerinde aynı davet akışını test edin
3. Özel alan SMTP kullanıyorsanız **SPF/DKIM** kayıtlarını doğrulayın
