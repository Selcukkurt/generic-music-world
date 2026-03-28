-- Canonical agreement model: user_agreement_acceptances (user_id, agreement_key, agreement_version, accepted_at).
-- Remove legacy columns; migrate GM DNA flags from profiles into acceptances before dropping.

INSERT INTO public.user_agreement_acceptances (user_id, agreement_key, agreement_version, accepted_at)
SELECT
  p.id,
  'gm_dna_final',
  COALESCE(NULLIF(trim(p.gm_dna_accepted_version), ''), '1.0'),
  COALESCE(p.gm_dna_accepted_at, NOW())
FROM public.profiles p
WHERE p.gm_dna_accepted_version IS NOT NULL
ON CONFLICT (user_id, agreement_key, agreement_version) DO NOTHING;

ALTER TABLE public.user_agreement_acceptances
  DROP COLUMN IF EXISTS accepted_ip,
  DROP COLUMN IF EXISTS user_agent;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS gm_dna_accepted_version,
  DROP COLUMN IF EXISTS gm_dna_accepted_at,
  DROP COLUMN IF EXISTS gm_dna_acceptance_source;
