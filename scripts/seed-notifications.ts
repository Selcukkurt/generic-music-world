/**
 * Dev-only seed notifications script.
 * Inserts sample notifications for system_owner user.
 *
 * REQUIRED env: SEED_USERS=true, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Run: npx tsx scripts/seed-notifications.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const root = resolve(process.cwd());
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

const SEED_USERS = process.env.SEED_USERS;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SAMPLE_NOTIFICATIONS = [
  { title: "Hoş geldiniz", message: "Generic Music World yönetim paneline hoş geldiniz.", type: "success" as const },
  { title: "Sistem güncellemesi", message: "Sistem başarıyla güncellendi. Yeni özellikler mevcut.", type: "info" as const },
  { title: "Yedekleme tamamlandı", message: "Günlük yedekleme işlemi başarıyla tamamlandı.", type: "success" as const },
  { title: "Oturum uyarısı", message: "Oturumunuz 30 dakika içinde sonlanacak.", type: "warning" as const },
  { title: "Yeni etkinlik", message: "Yeni bir etkinlik eklendi: Konser 2026", type: "info" as const, action_url: "/events" },
  { title: "Sistem bildirimi", message: "Bakım çalışması planlandı: Pazar 02:00-04:00", type: "system" as const },
];

async function main() {
  if (SEED_USERS !== "true") {
    console.error("[seed-notifications] SEED_USERS is not 'true'. Skipping.");
    process.exit(0);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[seed-notifications] Missing env vars. Skipping.");
    process.exit(0);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 10 });
  const systemOwner = users?.users?.find((u) => u.email === "info@genericmusic.net");
  if (!systemOwner) {
    console.error("[seed-notifications] System owner user not found. Run seed-users first.");
    process.exit(1);
  }

  const rows = SAMPLE_NOTIFICATIONS.map((n, i) => ({
    user_id: systemOwner.id,
    title: n.title,
    message: n.message,
    type: n.type,
    is_read: i % 2 === 0,
    read_at: i % 2 === 0 ? new Date().toISOString() : null,
    action_url: n.action_url ?? null,
    metadata: {},
  }));

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) {
    console.error("[seed-notifications] Insert error:", error);
    process.exit(1);
  }
  console.log("[seed-notifications] Inserted 6 sample notifications for", systemOwner.email);
}

main();
