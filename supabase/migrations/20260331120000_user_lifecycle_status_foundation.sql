-- Foundation: unified product lifecycle (invited | onboarding | awaiting_activation | active | archived).
-- App layer derives this from app_users.lifecycle_status + app_users.access_phase.
-- This function mirrors src/lib/auth/userLifecycleStatus.ts for SQL/RPC/RLS use later.

CREATE OR REPLACE FUNCTION public.user_lifecycle_status(
  p_lifecycle text,
  p_access_phase text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN coalesce(p_lifecycle, 'active') = 'archived' THEN 'archived'
    WHEN coalesce(p_lifecycle, 'active') = 'passive' THEN 'awaiting_activation'
    WHEN coalesce(p_access_phase, 'active') = 'invited' THEN 'invited'
    WHEN coalesce(p_access_phase, 'active') = 'onboarding' THEN 'onboarding'
    WHEN coalesce(p_access_phase, 'active') = 'awaiting_activation' THEN 'awaiting_activation'
    ELSE 'active'
  END;
$$;

COMMENT ON FUNCTION public.user_lifecycle_status(text, text) IS
  'Unified lifecycle for app gating: mirrors app deriveUserLifecycleStatus (archived + passive → awaiting_activation + access_phase).';

COMMENT ON COLUMN public.app_users.lifecycle_status IS
  'Operational: active | passive | archived. Combined with access_phase for unified product lifecycle.';

COMMENT ON COLUMN public.app_users.access_phase IS
  'Onboarding funnel: invited → onboarding → awaiting_activation → active. Combined with lifecycle_status for unified lifecycle.';
