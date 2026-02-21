# Version Module – Verification Checklist

## 1. Verify DB tables exist

Run in **Supabase SQL Editor**:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('releases', 'deployments', 'rollbacks');
```

**Expected:** 3 rows (`releases`, `deployments`, `rollbacks`).

**If any table is missing:**
- Run `supabase db push`, OR
- Manually execute:
  - `supabase/migrations/20260210000000_releases_deployments_rollbacks.sql`
  - `supabase/migrations/20260210000001_version_rls_policies.sql`

---

## 2. Verify RLS policies exist

Run in **Supabase SQL Editor**:

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('releases', 'deployments', 'rollbacks', 'audit_log')
ORDER BY tablename, policyname;
```

**Expected policies:**
- `releases`: Authenticated can select/insert/update
- `deployments`: Authenticated can select/insert
- `rollbacks`: Authenticated can select/insert
- `audit_log`: Authenticated can insert

**If policies are missing:** Run `20260210000001_version_rls_policies.sql`.

---

## 3. Test API directly

```bash
# Get your access token from browser DevTools → Application → Local Storage → supabase auth token
# Or from: supabase.auth.getSession() in console

curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3005/api/version/overview
```

**Expected:** `200` with JSON `{ lastRelease, lastDeployment, currentProduction, releases, deployments }`.

**If 401:** Token missing or invalid. Ensure you're logged in.

**If 500:** Check server logs for `[version/overview]` – the exact error is logged.

---

## 4. Server logs

When an error occurs, the server logs the exact message:

- `[version/api-auth] getApiUser error:` – Auth failure
- `[version/overview] releases error:` / `deployments error:` – DB/RLS error
- `[version/overview] GET error:` – Uncaught exception

Check your Next.js terminal or deployment logs for these prefixes.
