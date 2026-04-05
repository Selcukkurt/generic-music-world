-- acceptance_source remains nullable; new inserts get a sensible default when the column is omitted.
ALTER TABLE public.user_agreement_acceptances
  ALTER COLUMN acceptance_source SET DEFAULT 'onboarding';

COMMENT ON COLUMN public.user_agreement_acceptances.acceptance_source IS
  'Origin of the action, nullable. Defaults to onboarding when not provided on INSERT.';
