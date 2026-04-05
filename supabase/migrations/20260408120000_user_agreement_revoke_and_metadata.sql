-- Revocation + audit metadata for agreement acceptances (Option A: reversible until onboarding complete).
ALTER TABLE public.user_agreement_acceptances
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locale TEXT,
  ADD COLUMN IF NOT EXISTS acceptance_source TEXT;

COMMENT ON COLUMN public.user_agreement_acceptances.revoked_at IS
  'When set, this acceptance is void for compliance; re-accept clears to NULL.';
COMMENT ON COLUMN public.user_agreement_acceptances.locale IS
  'Client locale at acceptance (e.g. navigator.language).';
COMMENT ON COLUMN public.user_agreement_acceptances.acceptance_source IS
  'Origin of the action, nullable; defaults to onboarding on INSERT when omitted.';

ALTER TABLE public.user_agreement_acceptances
  ALTER COLUMN acceptance_source SET DEFAULT 'onboarding';

DROP POLICY IF EXISTS "Users update own agreement acceptances" ON public.user_agreement_acceptances;
CREATE POLICY "Users update own agreement acceptances"
  ON public.user_agreement_acceptances FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
