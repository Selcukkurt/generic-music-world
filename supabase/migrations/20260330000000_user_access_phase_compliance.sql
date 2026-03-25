-- Compliance onboarding gate: access_phase, agreement audit trail, GM DNA section progress
-- access_phase: invited | onboarding | awaiting_activation | active
-- Operational account state remains lifecycle_status: active | passive | archived

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS access_phase TEXT;

UPDATE public.app_users SET access_phase = 'active' WHERE access_phase IS NULL;

ALTER TABLE public.app_users
  ALTER COLUMN access_phase SET NOT NULL;

-- Trigger supplies explicit invited on INSERT; column default is fallback only
ALTER TABLE public.app_users
  ALTER COLUMN access_phase SET DEFAULT 'invited';

ALTER TABLE public.app_users
  DROP CONSTRAINT IF EXISTS app_users_access_phase_check;

ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_access_phase_check
  CHECK (access_phase IN ('invited', 'onboarding', 'awaiting_activation', 'active'));

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.app_users.access_phase IS
  'Gates product access: invited → onboarding → awaiting_activation → active (requires personnel link + role).';

COMMENT ON COLUMN public.app_users.onboarding_completed_at IS
  'When mandatory compliance onboarding finished (before activation).';

COMMENT ON COLUMN public.app_users.activated_at IS
  'When access_phase became active (personnel + role assigned and personnel linked).';

CREATE INDEX IF NOT EXISTS idx_app_users_access_phase ON public.app_users(access_phase);

-- ---------------------------------------------------------------------------
-- Agreement acceptances (append-only: no UPDATE policies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_agreement_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  agreement_key TEXT NOT NULL,
  agreement_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_ip TEXT,
  user_agent TEXT,
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
-- GM DNA section progress (per section completion for onboarding gate)
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

-- ---------------------------------------------------------------------------
-- Auth trigger: new auth users start as invited (unless column list overrides)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_app_user_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_users (id, email, full_name, access_phase)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'invited'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
