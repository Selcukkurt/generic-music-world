-- Permanent delete (soft tombstone): hide from all standard lists; auth user removed via Admin API.
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.app_users.deleted_at IS 'Set when user is permanently removed from the product; row retained for audit.';
COMMENT ON COLUMN public.app_users.deleted_by IS 'Actor (auth user id) who performed permanent delete.';

CREATE INDEX IF NOT EXISTS idx_app_users_deleted_at ON public.app_users(deleted_at)
  WHERE deleted_at IS NOT NULL;
