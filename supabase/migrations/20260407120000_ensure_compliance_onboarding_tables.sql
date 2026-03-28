-- Idempotent repair for environments where 20260330000000_user_access_phase_compliance.sql
-- was not applied: ensures user_agreement_acceptances and user_gm_dna_section_progress exist.

-- ---------------------------------------------------------------------------
-- Agreement acceptances (agreement_key + agreement_version; no profile booleans)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_agreement_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  agreement_key TEXT NOT NULL,
  agreement_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_agreement_acceptances_key_version_unique
    UNIQUE (user_id, agreement_key, agreement_version)
);

CREATE INDEX IF NOT EXISTS idx_user_agreement_acceptances_user ON public.user_agreement_acceptances(user_id);

COMMENT ON TABLE public.user_agreement_acceptances IS
  'Immutable audit log of compliance acceptances per version.';

ALTER TABLE public.user_agreement_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own agreement acceptances" ON public.user_agreement_acceptances;
CREATE POLICY "Users read own agreement acceptances"
  ON public.user_agreement_acceptances FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own agreement acceptances" ON public.user_agreement_acceptances;
CREATE POLICY "Users insert own agreement acceptances"
  ON public.user_agreement_acceptances FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "RBAC directory reads agreement acceptances" ON public.user_agreement_acceptances;
CREATE POLICY "RBAC directory reads agreement acceptances"
  ON public.user_agreement_acceptances FOR SELECT TO authenticated
  USING (public.can_read_rbac_user_directory(auth.uid()));

-- ---------------------------------------------------------------------------
-- GM DNA onboarding: one row per completed section (no per-user DNA booleans)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_gm_dna_section_progress (
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_user_gm_dna_progress_user ON public.user_gm_dna_section_progress(user_id);

ALTER TABLE public.user_gm_dna_section_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own gm dna progress" ON public.user_gm_dna_section_progress;
CREATE POLICY "Users manage own gm dna progress"
  ON public.user_gm_dna_section_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "RBAC directory reads gm dna progress" ON public.user_gm_dna_section_progress;
CREATE POLICY "RBAC directory reads gm dna progress"
  ON public.user_gm_dna_section_progress FOR SELECT TO authenticated
  USING (public.can_read_rbac_user_directory(auth.uid()));
