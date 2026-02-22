-- Helper: is_admin checks if user has admin role (can approve requests)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role IN ('system_owner', 'ceo', 'admin')
  );
$$;

-- Approval requests table
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_type TEXT NOT NULL CHECK (request_type IN ('role_change', 'expense', 'access', 'contract', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  target_entity_type TEXT,
  target_entity_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_reason TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  requester_seen BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status_created
  ON public.approval_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by_created
  ON public.approval_requests(requested_by, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approval_requests_updated_at ON public.approval_requests;
CREATE TRIGGER approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- A) Requester can select own rows
CREATE POLICY "Requester can select own approval_requests"
  ON public.approval_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requested_by);

-- B) Admins can select all rows
CREATE POLICY "Admins can select all approval_requests"
  ON public.approval_requests FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- C) Requester can insert own rows
CREATE POLICY "Requester can insert own approval_requests"
  ON public.approval_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requested_by);

-- D) Admins can update (status/decision fields)
CREATE POLICY "Admins can update approval_requests"
  ON public.approval_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
