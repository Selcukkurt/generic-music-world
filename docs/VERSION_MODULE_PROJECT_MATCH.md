# Version Module – Match Supabase Project

The error `"Could not find the table 'public.releases' in the schema cache"` means migrations were run on a **different** Supabase project than the one your app uses.

## Step 1: Get the project ref your app uses

### Option A: Call the debug endpoint

```bash
curl https://YOUR_PRODUCTION_URL/api/version/debug
```

Example response:
```json
{"projectRef":"abcdefghijklmnop","urlHint":"https://***.supabase.co"}
```

The `projectRef` is the project your app connects to.

### Option B: Check env vars

In **Vercel** (or your host): **Settings → Environment Variables**

- `NEXT_PUBLIC_SUPABASE_URL` = `https://<PROJECT_REF>.supabase.co`
- The part before `.supabase.co` is the project ref.

---

## Step 2: Open the correct Supabase project

1. Go to https://supabase.com/dashboard
2. Select the project whose ref matches the one from Step 1
3. Confirm the URL is `https://supabase.com/dashboard/project/<PROJECT_REF>`

---

## Step 3: Run verification query

In that project: **SQL Editor** → New query:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('releases', 'deployments', 'rollbacks');
```

**If 0 rows:** Tables don't exist. Continue to Step 4.  
**If 3 rows:** Tables exist. Wait 1–2 min and retry `/system/release`.

---

## Step 4: Apply migrations

In the **same** project: **SQL Editor** → New query:

1. Open `scripts/apply-version-migrations.sql` from the repo
2. Copy the entire file
3. Paste and run

---

## Step 5: Verify again

Re-run the query from Step 3. You must see 3 rows.

---

## Step 6: Retry

Wait 1–2 minutes, then open `/system/release`.

---

## Report back

| Item | Your answer |
|------|-------------|
| **Production project ref** | (from `/api/version/debug` or env) |
| **Verification query result** | 0 rows / 3 rows / other |
| **Supabase project you ran migrations on** | Same ref? Different? |
