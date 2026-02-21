-- RLS policies for version module (releases, deployments, rollbacks, audit_log)
-- Allows authenticated users to access via anon key + user token (no service role required)

-- releases: authenticated users can read, insert, update
CREATE POLICY "Authenticated can select releases"
  ON public.releases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert releases"
  ON public.releases FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update releases"
  ON public.releases FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- deployments: authenticated users can read, insert
CREATE POLICY "Authenticated can select deployments"
  ON public.deployments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert deployments"
  ON public.deployments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- rollbacks: authenticated users can read, insert
CREATE POLICY "Authenticated can select rollbacks"
  ON public.rollbacks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert rollbacks"
  ON public.rollbacks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- audit_log: authenticated users can insert (for audit trail)
CREATE POLICY "Authenticated can insert audit_log"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
