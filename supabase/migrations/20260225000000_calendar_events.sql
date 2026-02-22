-- Calendar events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  location TEXT,
  event_type TEXT NOT NULL DEFAULT 'plan' CHECK (event_type IN ('plan', 'meeting', 'release', 'event', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('private', 'team')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_at
  ON public.calendar_events(start_at);

CREATE INDEX IF NOT EXISTS idx_calendar_events_status_start
  ON public.calendar_events(status, start_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by_start
  ON public.calendar_events(created_by, start_at DESC);

-- Reuse set_updated_at if exists, else create
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Select: creator sees own
CREATE POLICY "Creator can select own calendar_events"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Select: team-visible approved events visible to all authenticated
CREATE POLICY "Team can select approved team events"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (visibility = 'team' AND status = 'approved');

-- Select: admins see all
CREATE POLICY "Admins can select all calendar_events"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Insert: creator can insert own
CREATE POLICY "Creator can insert own calendar_events"
  ON public.calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Update: creator or admin
CREATE POLICY "Creator or admin can update calendar_events"
  ON public.calendar_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));
