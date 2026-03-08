-- Add 'on_leave' (İzinde) to personnel status
ALTER TABLE public.personnel DROP CONSTRAINT IF EXISTS personnel_status_check;
ALTER TABLE public.personnel ADD CONSTRAINT personnel_status_check
  CHECK (status IN ('active', 'inactive', 'blacklist', 'on_leave'));
