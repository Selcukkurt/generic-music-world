-- Enable Realtime for chat_messages (run in Supabase Dashboard > Database > Publications if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Chat threads
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_group BOOLEAN NOT NULL DEFAULT false,
  title TEXT,
  last_message_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT
);

-- Chat thread members
CREATE TABLE IF NOT EXISTS public.chat_thread_members (
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (thread_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
  ON public.chat_messages(thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_created
  ON public.chat_messages(sender_id, created_at DESC);

-- Trigger: update last_message_at on insert
CREATE OR REPLACE FUNCTION public.chat_update_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_last_message_at ON public.chat_messages;
CREATE TRIGGER chat_messages_last_message_at
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_update_last_message_at();

-- RLS
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_threads: user can SELECT only if member
CREATE POLICY "Members can select chat_threads"
  ON public.chat_threads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_thread_members
      WHERE thread_id = id AND user_id = auth.uid()
    )
  );

-- chat_threads: creator can INSERT
CREATE POLICY "Creator can insert chat_threads"
  ON public.chat_threads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- chat_thread_members: user can SELECT own memberships
CREATE POLICY "Users can select own thread memberships"
  ON public.chat_thread_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- chat_thread_members: thread creator can INSERT members
CREATE POLICY "Thread creator can add members"
  ON public.chat_thread_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_threads
      WHERE id = thread_id AND created_by = auth.uid()
    )
  );

-- chat_messages: user can SELECT if member of thread
CREATE POLICY "Thread members can select chat_messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_thread_members
      WHERE thread_id = chat_messages.thread_id AND user_id = auth.uid()
    )
  );

-- chat_messages: user can INSERT if sender = self AND member of thread
CREATE POLICY "Thread members can insert chat_messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_thread_members
      WHERE thread_id = chat_messages.thread_id AND user_id = auth.uid()
    )
  );

-- Profiles: allow authenticated to read active profiles for chat user picker
DROP POLICY IF EXISTS "Authenticated can read active profiles for chat" ON public.profiles;
CREATE POLICY "Authenticated can read active profiles for chat"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_active = true);
