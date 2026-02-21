# Version Module – Apply Migrations to Supabase

The error `"Could not find the table 'public.releases' in the schema cache"` means the `releases`, `deployments`, and `rollbacks` tables do not exist in your connected Supabase project.

## Step 1: Check which tables exist

In **Supabase Dashboard → SQL Editor**, run:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('releases', 'deployments', 'rollbacks');
```

**Expected before migration:** 0 rows (or fewer than 3).  
**Expected after migration:** 3 rows.

---

## Step 2: Apply migrations

Use one of these methods.

### Option A: Supabase CLI (recommended)

```bash
# Ensure you're linked to the correct project
supabase link --project-ref YOUR_PROJECT_REF

# Push all pending migrations
supabase db push
```

### Option B: Run SQL manually in Supabase SQL Editor

1. Open **Supabase Dashboard → SQL Editor**.
2. Run the contents of `supabase/migrations/20260210000000_releases_deployments_rollbacks.sql` (copy/paste).
3. Then run the contents of `supabase/migrations/20260210000001_version_rls_policies.sql`.

---

## Step 3: Refresh PostgREST schema cache

After applying migrations:

- Wait 1–2 minutes for PostgREST to pick up schema changes, **or**
- In Supabase Dashboard: **Settings → API → Restart server** (if available), **or**
- Simply retry the request; it often resolves after a short delay.

---

## Step 4: Verify

1. Re-run the query from Step 1 – you should see 3 rows.
2. Test: `GET /api/version/overview` (with `Authorization: Bearer <token>`).
3. Load `/system/release` in the app.

---

## Report back

After Step 1 (before migration), report which tables exist, e.g.:

- `releases` – yes/no  
- `deployments` – yes/no  
- `rollbacks` – yes/no  

After Step 2, confirm that all three exist.
