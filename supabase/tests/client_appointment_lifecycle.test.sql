-- Structural security checks for the local lifecycle migration.
-- The functional two-client and concurrency suite still requires the approved
-- pre-P0 baseline plus synthetic auth.users/profiles/orders/appointments rows.
-- Do not treat these catalog assertions as proof of runtime authorization.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(16);

SELECT ok(to_regclass('public.appointments') IS NOT NULL, 'appointments exists');
SELECT has_column('public', 'appointments', 'client_outcome', 'appointment outcome is persisted');
SELECT has_column('public', 'appointments', 'client_outcome_note', 'problem description is persisted');
SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid = to_regprocedure('public.client_submit_appointment_outcome(uuid,text,text)')),
  'client action RPC runs with its controlled definer privileges'
);
SELECT is(
  (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid = to_regprocedure('public.client_submit_appointment_outcome(uuid,text,text)')),
  'postgres',
  'client action RPC has the expected owner'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.client_submit_appointment_outcome(uuid,text,text)', 'EXECUTE'),
  'authenticated users can request the owner-checked RPC'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.client_submit_appointment_outcome(uuid,text,text)', 'EXECUTE'),
  'anonymous users cannot execute the client action RPC'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'appointments' AND cmd = 'UPDATE'
  ),
  'the migration does not add a direct appointment update policy'
);
SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid = to_regprocedure('public.admin_get_appointment_outcome_reviews()'))
  AND has_function_privilege('authenticated', 'public.admin_get_appointment_outcome_reviews()', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.admin_get_appointment_outcome_reviews()', 'EXECUTE'),
  'review queue is definer-owned and callable only through authenticated role grants'
);
SELECT ok(
  to_regprocedure('public.client_cancel_request(uuid)') IS NOT NULL,
  'pre-order request cancellation RPC exists'
);
SELECT ok(
  (SELECT prosecdef AND pg_get_userbyid(proowner) = 'postgres'
   FROM pg_proc WHERE oid = to_regprocedure('public.client_cancel_request(uuid)')),
  'request cancellation runs with controlled definer privileges'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.client_cancel_request(uuid)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.client_cancel_request(uuid)', 'EXECUTE'),
  'only authenticated sessions may call the request cancellation RPC'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'requests' AND cmd = 'UPDATE'
  ),
  'the migration does not add direct request updates for clients'
);
SELECT ok(
  to_regprocedure('public.client_appointment_lifecycle_available()') IS NOT NULL,
  'the client UI has a read-only RPC capability check'
);
SELECT ok(
  (SELECT prosecdef AND pg_get_userbyid(proowner) = 'postgres'
   FROM pg_proc WHERE oid = to_regprocedure('public.client_appointment_lifecycle_available()')),
  'the capability check has controlled definer ownership'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.client_appointment_lifecycle_available()', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.client_appointment_lifecycle_available()', 'EXECUTE'),
  'only authenticated sessions may check lifecycle availability'
);

SELECT * FROM finish();
ROLLBACK;
