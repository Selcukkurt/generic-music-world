-- Prefer database role `service_role` on storage.objects (clearer than auth.jwt()->>'role' for Storage).
-- Replaces / supersedes jwt-claim policy from 20260414120000 when both are applied.
-- Requires: bucket `contracts` (20260412120000_storage_contracts_bucket.sql).

DROP POLICY IF EXISTS "contracts_objects_service_role_all" ON storage.objects;

CREATE POLICY "contracts_objects_service_role_all"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'contracts')
WITH CHECK (bucket_id = 'contracts');

COMMENT ON POLICY "contracts_objects_service_role_all" ON storage.objects IS
  'NDA PDF: service_role may read/write objects in bucket contracts (finalizeNdaAcceptanceDelivery).';
