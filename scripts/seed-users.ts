/**
 * Dev-only seed users script.
 * Creates Supabase Auth users and profiles for development.
 *
 * Loads .env.local (and .env) via dotenv. REQUIRED env:
 *   SEED_USERS=true
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SEED_PASSWORD_SYSTEM_OWNER
 *   SEED_PASSWORD_CEO
 *
 * NEVER run in production. Script exits if SEED_USERS !== "true".
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env then .env.local (local overrides) from project root
const root = resolve(process.cwd());
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

const SEED_USERS = process.env.SEED_USERS;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD_SYSTEM_OWNER = process.env.SEED_PASSWORD_SYSTEM_OWNER ?? "123456";
const PASSWORD_CEO = process.env.SEED_PASSWORD_CEO ?? "123456";

const SEED_ACCOUNTS = [
  { email: "info@genericmusic.net", role: "system_owner", password: PASSWORD_SYSTEM_OWNER },
  { email: "selcuk@genericmusic.net", role: "ceo", password: PASSWORD_CEO },
] as const;

function fail(msg: string): never {
  console.error(`[seed-users] ${msg}`);
  process.exit(1);
}

async function main() {
  if (SEED_USERS !== "true") {
    fail("SEED_USERS is not 'true'. Refusing to run. Set SEED_USERS=true for dev seed.");
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const { email, role, password } of SEED_ACCOUNTS) {
    try {
      const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 500 });
      const existingUser = listData?.users?.find((u) => u.email === email);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        console.log(`[seed-users] User exists: ${email} (${role})`);
      } else {
        const { data: created, error } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (error) {
          fail(`Failed to create user ${email}: ${error.message}`);
        }
        userId = created!.user!.id;
        console.log(`[seed-users] Created user: ${email} (${role})`);
      }

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            email,
            role,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        fail(`Failed to upsert profile for ${email}: ${upsertError.message}`);
      }
      console.log(`[seed-users] Upserted profile: ${email} → role=${role}`);
    } catch (err) {
      fail(`Error processing ${email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("[seed-users] Done.");
}

main();
