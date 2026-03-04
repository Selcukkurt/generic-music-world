/**
 * Apply RBAC migration (20260233000000_rbac_v1.sql) to Supabase.
 *
 * Option A - Direct DB connection (recommended):
 *   Add to .env.local:
 *     DATABASE_URL=postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
 *   Get from: Supabase Dashboard → Project Settings → Database → Connection string (URI)
 *
 * Option B - Supabase CLI:
 *   Run: supabase login
 *   Then: supabase link --project-ref <ref>
 *   Then: supabase db push
 */

import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
import { Client } from "pg";

const root = resolve(process.cwd());

// Load .env and .env.local (dotenv handles quoted values and special chars reliably)
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL?.trim();
  if (!DATABASE_URL) {
    console.error("[db-push-rbac] DATABASE_URL not set.");
    console.error("");
    console.error("Add to .env.local:");
    console.error("  DATABASE_URL=postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres");
    console.error("");
    console.error("Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)");
    console.error("");
    console.error("Or use Supabase CLI:");
    console.error("  1. supabase login");
    console.error("  2. supabase link --project-ref <your-project-ref>");
    console.error("  3. supabase db push");
    process.exit(1);
  }

  const migrationPath = resolve(root, "supabase/migrations/20260233000000_rbac_v1.sql");
  const sql = readFileSync(migrationPath, "utf-8");

  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log("[db-push-rbac] Connected. Applying RBAC migration...");
    await client.query(sql);
    console.log("[db-push-rbac] Migration applied successfully.");

    // Assign owner role to system_owner profiles (for RBAC v1)
    const assignOwner = `
      INSERT INTO public.user_roles (user_id, role_id)
      SELECT p.id, r.id FROM public.profiles p
      JOIN public.roles r ON r.key = 'owner'
      WHERE p.role = 'system_owner'
      ON CONFLICT (user_id, role_id) DO NOTHING;
    `;
    await client.query(assignOwner);
    console.log("[db-push-rbac] Assigned owner role to system_owner profiles.");
  } catch (err) {
    console.error("[db-push-rbac] Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
