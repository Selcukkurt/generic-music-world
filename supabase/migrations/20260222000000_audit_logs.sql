-- Phase 1 MVP: audit_logs table for Log Kayıtları page
-- Richer schema than audit_log (version module)

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  category TEXT NOT NULL DEFAULT 'system' CHECK (category IN (
    'auth', 'db', 'settings', 'roles', 'releases', 'security', 'import_export', 'system'
  )),
  action TEXT NOT NULL,
  message TEXT,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  actor_role TEXT,
  target_entity TEXT,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure')),
  metadata JSONB,
  request_ip TEXT,
  request_user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON public.audit_logs(actor_user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- System owner (Super Admin) can SELECT
CREATE POLICY "System owner can select audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_owner'
    )
  );

-- Authenticated can INSERT (for logging from API)
CREATE POLICY "Authenticated can insert audit_logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- system_settings: system_owner can SELECT and UPDATE
-- (Required for PUT /api/settings)
-- ============================================================

DROP POLICY IF EXISTS "System owner can select system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "System owner can update system_settings" ON public.system_settings;

CREATE POLICY "System owner can select system_settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_owner'
    )
  );

CREATE POLICY "System owner can update system_settings"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_owner'
    )
  );
