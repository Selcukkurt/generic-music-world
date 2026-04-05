-- Private bucket for generated NDA PDFs (server uploads via service role; users get files only via signed URLs).
-- Re-running always forces private: never flips an existing bucket to public by mistake.
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  name = EXCLUDED.name;
