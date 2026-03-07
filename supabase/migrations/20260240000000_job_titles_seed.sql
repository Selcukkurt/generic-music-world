-- M04 RB-018: Seed job_titles for testing
-- Will expand to 62 titles later

INSERT INTO public.job_titles (id, name, category, rank_order, description, rbac_level, active) VALUES
  ('b0000001-0001-0001-0001-000000000001'::uuid, 'Founder/CEO', 'executive', 100, 'Chief Executive Officer', 100, true),
  ('b0000002-0002-0002-0002-000000000002'::uuid, 'COO', 'executive', 90, 'Chief Operations Officer', 90, true),
  ('b0000003-0003-0003-0003-000000000003'::uuid, 'Event Director', 'operations', 80, 'Event operations director', 80, true),
  ('b0000004-0004-0004-0004-000000000004'::uuid, 'Finance Director', 'finance', 80, 'Finance and accounting director', 80, true),
  ('b0000005-0005-0005-0005-000000000005'::uuid, 'Marketing Director', 'marketing', 80, 'Marketing and communications director', 80, true),
  ('b0000006-0006-0006-0006-000000000006'::uuid, 'Booking Director', 'artist', 80, 'Artist booking and relations director', 80, true),
  ('b0000007-0007-0007-0007-000000000007'::uuid, 'HR Director', 'hr', 80, 'HR and organization director', 80, true),
  ('b0000008-0008-0008-0008-000000000008'::uuid, 'Operations Manager', 'operations', 70, 'Operations team manager', 70, true),
  ('b0000009-0009-0009-0009-000000000009'::uuid, 'Hostess', 'operations', 50, 'Guest services hostess', 50, true),
  ('b0000010-0010-0010-0010-000000000010'::uuid, 'Cashier', 'operations', 50, 'Cash handling and POS', 50, true),
  ('b0000011-0011-0011-0011-000000000011'::uuid, 'Bar Staff', 'operations', 50, 'Bar and beverage service', 50, true),
  ('b0000012-0012-0012-0012-000000000012'::uuid, 'Security Lead', 'operations', 60, 'Security team lead', 60, true),
  ('b0000013-0013-0013-0013-000000000013'::uuid, 'Stage Manager', 'operations', 65, 'Stage and technical coordination', 65, true),
  ('b0000014-0014-0014-0014-000000000014'::uuid, 'Sound Technician', 'technical', 55, 'Sound and audio technician', 55, true),
  ('b0000015-0015-0015-0015-000000000015'::uuid, 'Light Technician', 'technical', 55, 'Lighting technician', 55, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  rank_order = EXCLUDED.rank_order,
  description = COALESCE(EXCLUDED.description, job_titles.description),
  rbac_level = COALESCE(EXCLUDED.rbac_level, job_titles.rbac_level),
  active = EXCLUDED.active;
