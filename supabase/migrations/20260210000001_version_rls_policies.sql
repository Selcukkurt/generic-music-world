-- RLS policies for version module (releases, deployments, rollbacks, audit_log)
-- Allows authenticated users to access via anon key + user token (no service role required)
-- Idempotent: DROP IF EXISTS before each CREATE POLICY

-- releases: authenticated users can read, insert, update
DROP POLICY IF EXISTS "Authenticated can select releases" ON public.releases;
CREATE POLICY "Authenticated can select releases"
  ON public.releases FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert releases" ON public.releases;
CREATE POLICY "Authenticated can insert releases"
  ON public.releases FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update releases" ON public.releases;
CREATE POLICY "Authenticated can update releases"
  ON public.releases FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- deployments: authenticated users can read, insert
DROP POLICY IF EXISTS "Authenticated can select deployments" ON public.deployments;
CREATE POLICY "Authenticated can select deployments"
  ON public.deployments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert deployments" ON public.deployments;
CREATE POLICY "Authenticated can insert deployments"
  ON public.deployments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- rollbacks: authenticated users can read, insert
DROP POLICY IF EXISTS "Authenticated can select rollbacks" ON public.rollbacks;
CREATE POLICY "Authenticated can select rollbacks"
  ON public.rollbacks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert rollbacks" ON public.rollbacks;
CREATE POLICY "Authenticated can insert rollbacks"
  ON public.rollbacks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- audit_log: authenticated users can insert (for audit trail)
DROP POLICY IF EXISTS "Authenticated can insert audit_log" ON public.audit_log;
CREATE POLICY "Authenticated can insert audit_log"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
