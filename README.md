This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3005](http://localhost:3005) with your browser. The dev server always runs on port 3005.

**If port 3005 is in use:** `lsof -i :3005` to find the PID, then `kill -9 <PID>` to free it. Or run `npm run dev:clean` to remove build artifacts and restart.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database Migrations (RBAC)

To apply RBAC migrations (`20260233000000_rbac_v1.sql`, `20260234000000_event_scoped_rbac.sql`):

**Option A – Direct connection (recommended):**

1. In Supabase Dashboard → Project Settings → Database, copy the **Connection string (URI)**.
2. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
3. Run:
   ```bash
   npm run db:push
   ```

**Option B – Supabase CLI:**

```bash
supabase login
supabase link --project-ref <your-project-ref>   # ref from NEXT_PUBLIC_SUPABASE_URL
supabase db push
```

After migration, the RBAC page (`/system/rbac`) should load users without errors.

---

Rollback için: git checkout main && git pull && git checkout tags/GMW-2026-02-10-ROLLBACK
Gerekirse: git switch -c rollback/GMW-2026-02-10-ROLLBACK
