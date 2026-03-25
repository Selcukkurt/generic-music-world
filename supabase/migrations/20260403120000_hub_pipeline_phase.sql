-- Phase 1: Hub pre-activation pipeline (separate from access_phase).
-- app_users.hub_pipeline_phase is the source of truth for Hub shell routing.

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS compliance_completed_at TIMESTAMPTZ;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS hub_pipeline_phase TEXT;

UPDATE public.app_users SET hub_pipeline_phase = 'invited' WHERE hub_pipeline_phase IS NULL;

ALTER TABLE public.app_users
  ALTER COLUMN hub_pipeline_phase SET NOT NULL;

ALTER TABLE public.app_users
  ALTER COLUMN hub_pipeline_phase SET DEFAULT 'invited';

ALTER TABLE public.app_users
  DROP CONSTRAINT IF EXISTS app_users_hub_pipeline_phase_check;

ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_hub_pipeline_phase_check
  CHECK (
    hub_pipeline_phase IN (
      'invited',
      'onboarding',
      'awaiting_personnel',
      'personnel_setup',
      'active',
      'archived'
    )
  );

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS hub_access_granted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.app_users.hub_pipeline_phase IS
  'Hub activation pipeline (distinct from access_phase). Source of truth for pre-Hub routing.';

COMMENT ON COLUMN public.app_users.compliance_completed_at IS
  'When legal/compliance approvals are complete; personnel.profile_id link requires this.';

COMMENT ON COLUMN public.app_users.hub_access_granted_at IS
  'When full Hub access was granted (denormalized; set when all employment + RBAC conditions met).';

CREATE INDEX IF NOT EXISTS idx_app_users_hub_pipeline_phase ON public.app_users(hub_pipeline_phase);
CREATE INDEX IF NOT EXISTS idx_app_users_compliance_completed ON public.app_users(compliance_completed_at)
  WHERE compliance_completed_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- personnel: employment pipeline (aligns with app product rules)
-- ---------------------------------------------------------------------------
ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS employment_lifecycle TEXT;

ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS work_model TEXT;

ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS contract_status TEXT;

ALTER TABLE public.personnel
  DROP CONSTRAINT IF EXISTS personnel_employment_lifecycle_check;

ALTER TABLE public.personnel
  ADD CONSTRAINT personnel_employment_lifecycle_check
  CHECK (
    employment_lifecycle IS NULL
    OR employment_lifecycle IN (
      'onboarding',
      'pending_assignment',
      'pending_employment',
      'active',
      'archived'
    )
  );

ALTER TABLE public.personnel
  DROP CONSTRAINT IF EXISTS personnel_work_model_check;

ALTER TABLE public.personnel
  ADD CONSTRAINT personnel_work_model_check
  CHECK (
    work_model IS NULL
    OR work_model IN (
      'project_based',
      'part_time',
      'full_time',
      'consultant',
      'freelance'
    )
  );

ALTER TABLE public.personnel
  DROP CONSTRAINT IF EXISTS personnel_contract_status_check;

ALTER TABLE public.personnel
  ADD CONSTRAINT personnel_contract_status_check
  CHECK (
    contract_status IS NULL
    OR contract_status IN (
      'none',
      'draft',
      'pending_signature',
      'active',
      'expired',
      'terminated'
    )
  );

COMMENT ON COLUMN public.personnel.employment_lifecycle IS 'HR employment / activation stage for Hub rules.';
COMMENT ON COLUMN public.personnel.work_model IS 'Work arrangement once employment is configured.';
COMMENT ON COLUMN public.personnel.contract_status IS 'Contract / work agreement state.';

CREATE INDEX IF NOT EXISTS idx_personnel_employment_lifecycle ON public.personnel(employment_lifecycle);

-- Existing rows: linked personnel treated as fully active for migration safety.
UPDATE public.personnel
SET
  employment_lifecycle = COALESCE(employment_lifecycle, 'active'),
  work_model = COALESCE(work_model, 'full_time'),
  contract_status = COALESCE(contract_status, 'active')
WHERE profile_id IS NOT NULL;

UPDATE public.personnel
SET employment_lifecycle = COALESCE(employment_lifecycle, 'pending_assignment')
WHERE profile_id IS NULL AND employment_lifecycle IS NULL;

-- ---------------------------------------------------------------------------
-- Backfill app_users: users who already have product access
-- ---------------------------------------------------------------------------
UPDATE public.app_users
SET
  compliance_completed_at = COALESCE(compliance_completed_at, onboarding_completed_at, NOW()),
  hub_pipeline_phase = 'active',
  hub_access_granted_at = COALESCE(hub_access_granted_at, activated_at, onboarding_completed_at, NOW())
WHERE (lifecycle_status IS DISTINCT FROM 'archived')
  AND COALESCE(access_phase, '') = 'active'
  AND hub_access_granted_at IS NULL;

-- Legacy: access_phase awaiting_activation → hub pipeline (compliance from profile completion if any)
UPDATE public.app_users
SET
  compliance_completed_at = COALESCE(compliance_completed_at, onboarding_completed_at),
  hub_pipeline_phase = 'awaiting_personnel'
WHERE COALESCE(access_phase, '') = 'awaiting_activation'
  AND hub_access_granted_at IS NULL;

-- Remaining non-archived users still in invite/onboarding funnel
UPDATE public.app_users
SET hub_pipeline_phase = CASE COALESCE(access_phase, 'invited')
    WHEN 'invited' THEN 'invited'
    WHEN 'onboarding' THEN 'onboarding'
    WHEN 'awaiting_activation' THEN 'awaiting_personnel'
    WHEN 'active' THEN hub_pipeline_phase
    ELSE 'onboarding'
  END
WHERE (lifecycle_status IS DISTINCT FROM 'archived')
  AND hub_access_granted_at IS NULL
  AND hub_pipeline_phase IN ('invited', 'onboarding');

-- ---------------------------------------------------------------------------
-- Block personnel.profile_id until app_users.compliance_completed_at is set
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_personnel_link_requires_compliance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.profile_id IS NOT NULL THEN
      SELECT (au.compliance_completed_at IS NOT NULL) INTO ok
      FROM public.app_users au
      WHERE au.id = NEW.profile_id;
      IF ok IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'personnel_link_requires_compliance'
          USING ERRCODE = '23514',
            HINT = 'User must complete compliance before personnel link.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.profile_id IS NOT NULL AND (OLD.profile_id IS DISTINCT FROM NEW.profile_id) THEN
      SELECT (au.compliance_completed_at IS NOT NULL) INTO ok
      FROM public.app_users au
      WHERE au.id = NEW.profile_id;
      IF ok IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'personnel_link_requires_compliance'
          USING ERRCODE = '23514',
            HINT = 'User must complete compliance before personnel link.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS personnel_profile_link_compliance ON public.personnel;
CREATE TRIGGER personnel_profile_link_compliance
  BEFORE INSERT OR UPDATE OF profile_id ON public.personnel
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_personnel_link_requires_compliance();

COMMENT ON FUNCTION public.enforce_personnel_link_requires_compliance() IS
  'Rejects personnel.profile_id when app_users.compliance_completed_at is null.';

-- ---------------------------------------------------------------------------
-- Auth signup: hub_pipeline_phase defaults via column default (already invited)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_app_user_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_users (id, email, full_name, access_phase, hub_pipeline_phase)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'invited',
    'invited'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
