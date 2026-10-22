-- Static privilege/RLS regression checks for the P0 migration.
-- Run only against a disposable local Supabase database after the migration.
-- The transaction removes the temporary probe role and all test-side changes.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vemgo_p0_hardening_probe_20261020') THEN
    RAISE EXCEPTION 'Temporary P0 probe role already exists; use a fresh disposable database';
  END IF;
  EXECUTE 'CREATE ROLE vemgo_p0_hardening_probe_20261020 NOLOGIN';
  EXECUTE 'GRANT authenticated TO vemgo_p0_hardening_probe_20261020';
END;
$$;

SELECT no_plan();

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass),
  'profiles has row-level security enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.professionals'::regclass),
  'professionals has row-level security enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.request_matches'::regclass),
  'request_matches has row-level security enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.payments'::regclass),
  'payments has row-level security enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.transactions'::regclass),
  'transactions has row-level security enabled'
);

SELECT ok(has_table_privilege('authenticated', 'public.profiles', 'SELECT'), 'authenticated can read profiles subject to RLS');
SELECT ok(has_table_privilege('authenticated', 'public.professionals', 'SELECT'), 'authenticated can read professional profiles subject to RLS');
SELECT ok(has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE'), 'authenticated can update the allowed profile name column');
SELECT ok(NOT has_column_privilege('authenticated', 'public.profiles', 'user_type', 'UPDATE'), 'authenticated cannot change a profile role');
SELECT ok(NOT has_column_privilege('authenticated', 'public.profiles', 'identity_status', 'UPDATE'), 'authenticated cannot approve identity');
SELECT ok(has_column_privilege('authenticated', 'public.professionals', 'is_accepting_calls', 'UPDATE'), 'authenticated can toggle professional availability');
SELECT ok(NOT has_column_privilege('authenticated', 'public.professionals', 'verification_status', 'UPDATE'), 'authenticated cannot approve a professional');
SELECT ok(NOT has_column_privilege('authenticated', 'public.professionals', 'approved_by', 'UPDATE'), 'authenticated cannot assign an approver');
SELECT ok(has_table_privilege('authenticated', 'public.request_matches', 'SELECT'), 'authenticated can read matches subject to RLS');
SELECT ok(NOT has_table_privilege('authenticated', 'public.request_matches', 'UPDATE'), 'authenticated cannot directly update matches');
SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'request_matches' AND policyname = 'request_matches_update_own'
), 'the direct own-match update policy is absent');
SELECT ok(has_table_privilege('authenticated', 'public.payments', 'SELECT'), 'authenticated can read payments subject to RLS');
SELECT ok(NOT has_table_privilege('authenticated', 'public.payments', 'INSERT'), 'authenticated cannot create payment rows');
SELECT ok(NOT has_table_privilege('authenticated', 'public.payments', 'UPDATE'), 'authenticated cannot alter payment rows');
SELECT ok(NOT has_table_privilege('authenticated', 'public.transactions', 'INSERT'), 'authenticated cannot create transaction rows');
SELECT ok(NOT has_table_privilege('authenticated', 'public.transactions', 'UPDATE'), 'authenticated cannot alter transaction rows');

SELECT ok(NOT has_table_privilege('anon', 'public.profiles', 'UPDATE'), 'anon cannot update profiles');
SELECT ok(NOT has_table_privilege('anon', 'public.payments', 'SELECT'), 'anon cannot read payments');
SELECT ok(NOT has_function_privilege('anon', 'public.match_request(uuid)', 'EXECUTE'), 'anon cannot execute match_request');
SELECT ok(NOT has_function_privilege('anon', 'public.select_professional_for_request(uuid,uuid)', 'EXECUTE'), 'anon cannot select a professional');
SELECT ok(NOT has_function_privilege('anon', 'public.get_client_request_matches(uuid)', 'EXECUTE'), 'anon cannot read client matches through the RPC');
SELECT ok(NOT has_function_privilege('anon', 'public.request_phone_verification(text)', 'EXECUTE'), 'anon cannot request phone verification');
SELECT ok(NOT has_function_privilege('anon', 'public.verify_phone_code(text)', 'EXECUTE'), 'anon cannot verify a phone code');

SELECT ok(has_function_privilege('authenticated', 'public.match_request(uuid)', 'EXECUTE'), 'authenticated can call the ownership-checked match RPC');
SELECT ok(has_function_privilege('authenticated', 'public.select_professional_for_request(uuid,uuid)', 'EXECUTE'), 'authenticated can call the ownership-checked selection RPC');
SELECT ok(has_function_privilege('authenticated', 'public.sync_verified_phone()', 'EXECUTE'), 'authenticated can call the server-verified phone sync');
SELECT ok(
  (SELECT pg_get_userbyid(proowner) = 'postgres' FROM pg_proc WHERE oid = 'public.sync_verified_phone()'::regprocedure),
  'sync_verified_phone is owned by postgres'
);

SELECT ok(has_column_privilege('vemgo_p0_hardening_probe_20261020', 'public.profiles', 'full_name', 'UPDATE'), 'a role inheriting authenticated gets the intended profile edit');
SELECT ok(NOT has_column_privilege('vemgo_p0_hardening_probe_20261020', 'public.profiles', 'user_type', 'UPDATE'), 'a custom role inheriting authenticated cannot change profile roles');
SELECT ok(NOT has_table_privilege('vemgo_p0_hardening_probe_20261020', 'public.payments', 'UPDATE'), 'a custom role inheriting authenticated cannot alter payments');
SELECT ok(pg_has_role('vemgo_p0_hardening_probe_20261020', 'authenticated', 'USAGE'), 'the custom role actually inherits authenticated privileges');

-- Regression: table-level privilege checks alone do not detect residual
-- column-level grants. Check both INSERT and UPDATE after the migration.
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'id', 'request_id', 'professional_id', 'match_score', 'status',
      'sent_at', 'responded_at', 'created_at', 'updated_at'
    ]) AS c(column_name)
    WHERE has_column_privilege('authenticated', 'public.request_matches', c.column_name, 'INSERT')
  ),
  'authenticated has no residual column-level INSERT grant on request_matches'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'id', 'request_id', 'professional_id', 'match_score', 'status',
      'sent_at', 'responded_at', 'created_at', 'updated_at'
    ]) AS c(column_name)
    WHERE has_column_privilege('authenticated', 'public.request_matches', c.column_name, 'UPDATE')
  ),
  'authenticated has no residual column-level UPDATE grant on request_matches'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'id', 'order_id', 'amount', 'currency', 'payment_method', 'provider',
      'provider_payment_id', 'status', 'paid_at', 'created_at', 'updated_at'
    ]) AS c(column_name)
    WHERE has_column_privilege('authenticated', 'public.payments', c.column_name, 'INSERT')
  ),
  'authenticated has no residual column-level INSERT grant on payments'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'id', 'order_id', 'amount', 'currency', 'payment_method', 'provider',
      'provider_payment_id', 'status', 'paid_at', 'created_at', 'updated_at'
    ]) AS c(column_name)
    WHERE has_column_privilege('authenticated', 'public.payments', c.column_name, 'UPDATE')
  ),
  'authenticated has no residual column-level UPDATE grant on payments'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'id', 'payment_id', 'order_id', 'transaction_type', 'amount', 'currency',
      'status', 'reference', 'created_at', 'updated_at'
    ]) AS c(column_name)
    WHERE has_column_privilege('authenticated', 'public.transactions', c.column_name, 'INSERT')
  ),
  'authenticated has no residual column-level INSERT grant on transactions'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'id', 'payment_id', 'order_id', 'transaction_type', 'amount', 'currency',
      'status', 'reference', 'created_at', 'updated_at'
    ]) AS c(column_name)
    WHERE has_column_privilege('authenticated', 'public.transactions', c.column_name, 'UPDATE')
  ),
  'authenticated has no residual column-level UPDATE grant on transactions'
);

SELECT ok(
  NOT has_any_column_privilege('anon', 'public.profiles', 'SELECT')
  AND NOT has_any_column_privilege('anon', 'public.professionals', 'SELECT')
  AND NOT has_any_column_privilege('anon', 'public.request_matches', 'SELECT')
  AND NOT has_any_column_privilege('anon', 'public.payments', 'SELECT')
  AND NOT has_any_column_privilege('anon', 'public.transactions', 'SELECT'),
  'anon has no residual column-level SELECT grant on P0-protected tables'
);
SELECT ok(
  NOT has_any_column_privilege('authenticated', 'public.transactions', 'SELECT'),
  'authenticated has no residual column-level SELECT grant on transactions'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'id', 'full_name', 'phone', 'avatar_url', 'user_type', 'status',
      'created_at', 'updated_at', 'identity_status',
      'professional_onboarding_step', 'phone_verified_at',
      'identity_verified_at', 'client_verification_status'
    ]) AS c(column_name)
    WHERE has_column_privilege('authenticated', 'public.profiles', c.column_name, 'INSERT')
  ),
  'authenticated has no residual column-level INSERT grant on profiles'
);
SELECT ok(
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
  AND has_column_privilege('authenticated', 'public.profiles', 'avatar_url', 'UPDATE')
  AND has_column_privilege('authenticated', 'public.profiles', 'professional_onboarding_step', 'UPDATE'),
  'authenticated retains the three intended profile UPDATE columns'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'id', 'phone', 'user_type', 'status', 'created_at', 'updated_at',
      'identity_status', 'phone_verified_at', 'identity_verified_at',
      'client_verification_status'
    ]) AS c(column_name)
    WHERE has_column_privilege('authenticated', 'public.profiles', c.column_name, 'UPDATE')
  ),
  'authenticated has no residual UPDATE grant on protected profile columns'
);

SELECT ok(
  has_column_privilege('authenticated', 'public.professionals', 'id', 'INSERT')
  AND has_column_privilege('authenticated', 'public.professionals', 'display_name', 'INSERT')
  AND has_column_privilege('authenticated', 'public.professionals', 'bio', 'INSERT')
  AND has_column_privilege('authenticated', 'public.professionals', 'document_type', 'INSERT')
  AND has_column_privilege('authenticated', 'public.professionals', 'document_number', 'INSERT'),
  'authenticated retains only the intended professional onboarding INSERT columns'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'verification_status', 'service_status', 'created_at', 'updated_at',
      'approved_at', 'approved_by', 'rejection_reason', 'is_accepting_calls'
    ]) AS c(column_name)
    WHERE has_column_privilege('authenticated', 'public.professionals', c.column_name, 'INSERT')
  ),
  'authenticated cannot insert professional approval, status, or availability fields'
);
SELECT ok(
  has_column_privilege('authenticated', 'public.professionals', 'is_accepting_calls', 'UPDATE'),
  'authenticated retains the intended professional availability UPDATE column'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'id', 'display_name', 'bio', 'document_type', 'document_number',
      'verification_status', 'service_status', 'created_at', 'updated_at',
      'approved_at', 'approved_by', 'rejection_reason'
    ]) AS c(column_name)
    WHERE has_column_privilege('authenticated', 'public.professionals', c.column_name, 'UPDATE')
  ),
  'authenticated cannot update professional identity or approval fields'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.profiles', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.professionals', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.request_matches', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.payments', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.transactions', 'INSERT'),
  'authenticated has no broad INSERT grant on P0-protected tables'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.profiles', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.professionals', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.request_matches', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.payments', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.transactions', 'SELECT'),
  'anon has no direct SELECT grant on P0-protected tables'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.transactions', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.transactions', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.transactions', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.transactions', 'DELETE'),
  'authenticated has no direct privilege on the transaction ledger'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY['profiles', 'professionals', 'request_matches', 'payments', 'transactions']) AS t(table_name)
    CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) AS p(privilege)
    WHERE has_table_privilege('authenticated', 'public.' || t.table_name, p.privilege)
  ),
  'authenticated has no broad table-level write or maintenance privilege on P0 tables'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY['profiles', 'professionals', 'request_matches', 'payments', 'transactions']) AS t(table_name)
    CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) AS p(privilege)
    WHERE has_table_privilege('anon', 'public.' || t.table_name, p.privilege)
  ),
  'anon has no table-level privilege on P0 tables'
);
SELECT ok(
  NOT has_any_column_privilege('anon', 'public.profiles', 'INSERT')
  AND NOT has_any_column_privilege('anon', 'public.professionals', 'INSERT')
  AND NOT has_any_column_privilege('anon', 'public.request_matches', 'INSERT')
  AND NOT has_any_column_privilege('anon', 'public.payments', 'INSERT')
  AND NOT has_any_column_privilege('anon', 'public.transactions', 'INSERT')
  AND NOT has_any_column_privilege('anon', 'public.profiles', 'UPDATE')
  AND NOT has_any_column_privilege('anon', 'public.professionals', 'UPDATE')
  AND NOT has_any_column_privilege('anon', 'public.request_matches', 'UPDATE')
  AND NOT has_any_column_privilege('anon', 'public.payments', 'UPDATE')
  AND NOT has_any_column_privilege('anon', 'public.transactions', 'UPDATE'),
  'anon has no residual column-level INSERT or UPDATE grant on P0 tables'
);

SELECT ok(has_function_privilege('authenticated', 'public.get_client_request_matches(uuid)', 'EXECUTE'), 'authenticated can execute get_client_request_matches');
SELECT ok(has_function_privilege('authenticated', 'public.request_phone_verification(text)', 'EXECUTE'), 'authenticated can execute the fail-closed phone request RPC');
SELECT ok(has_function_privilege('authenticated', 'public.verify_phone_code(text)', 'EXECUTE'), 'authenticated can execute verify_phone_code');
SELECT ok(has_function_privilege('authenticated', 'public.submit_identity_for_review()', 'EXECUTE'), 'authenticated can execute submit_identity_for_review');
SELECT ok(NOT has_function_privilege('anon', 'public.sync_verified_phone()', 'EXECUTE'), 'anon cannot execute sync_verified_phone');
SELECT ok(NOT has_function_privilege('anon', 'public.submit_identity_for_review()', 'EXECUTE'), 'anon cannot execute submit_identity_for_review');
SELECT ok(has_function_privilege('service_role', 'public.select_professional_for_request(uuid,uuid)', 'EXECUTE'), 'service_role retains select_professional_for_request execution');
SELECT ok(has_function_privilege('service_role', 'public.get_client_request_matches(uuid)', 'EXECUTE'), 'service_role retains get_client_request_matches execution');
SELECT ok(has_function_privilege('service_role', 'public.request_phone_verification(text)', 'EXECUTE'), 'service_role retains request_phone_verification execution');
SELECT ok(has_function_privilege('service_role', 'public.verify_phone_code(text)', 'EXECUTE'), 'service_role retains verify_phone_code execution');

SELECT ok(
  (SELECT p.prorettype = 'integer'::regtype FROM pg_proc p WHERE p.oid = 'public.match_request(uuid)'::regprocedure)
  AND (SELECT p.prorettype = 'uuid'::regtype FROM pg_proc p WHERE p.oid = 'public.select_professional_for_request(uuid,uuid)'::regprocedure)
  AND (SELECT p.prorettype = 'text'::regtype FROM pg_proc p WHERE p.oid = 'public.request_phone_verification(text)'::regprocedure)
  AND (SELECT p.prorettype = 'boolean'::regtype FROM pg_proc p WHERE p.oid = 'public.verify_phone_code(text)'::regprocedure)
  AND (SELECT p.prorettype = 'text'::regtype FROM pg_proc p WHERE p.oid = 'public.submit_identity_for_review()'::regprocedure),
  'P0 RPC return types match the migration contract'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    WHERE p.oid = ANY(ARRAY[
      'public.match_request(uuid)'::regprocedure::oid,
      'public.select_professional_for_request(uuid,uuid)'::regprocedure::oid,
      'public.get_client_request_matches(uuid)'::regprocedure::oid,
      'public.request_phone_verification(text)'::regprocedure::oid,
      'public.verify_phone_code(text)'::regprocedure::oid,
      'public.sync_verified_phone()'::regprocedure::oid,
      'public.submit_identity_for_review()'::regprocedure::oid
    ]::oid[])
      AND a.grantee = 0
      AND a.privilege_type = 'EXECUTE'
  ),
  'PUBLIC has no direct EXECUTE ACL on P0 RPCs'
);
SELECT ok(
  (
    SELECT count(DISTINCT p.oid) = 7
    FROM pg_proc p
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    WHERE p.oid = ANY(ARRAY[
      'public.match_request(uuid)'::regprocedure::oid,
      'public.select_professional_for_request(uuid,uuid)'::regprocedure::oid,
      'public.get_client_request_matches(uuid)'::regprocedure::oid,
      'public.request_phone_verification(text)'::regprocedure::oid,
      'public.verify_phone_code(text)'::regprocedure::oid,
      'public.sync_verified_phone()'::regprocedure::oid,
      'public.submit_identity_for_review()'::regprocedure::oid
    ]::oid[])
      AND a.grantee = 'authenticated'::regrole
      AND a.privilege_type = 'EXECUTE'
  ),
  'authenticated has a direct EXECUTE ACL on each P0 RPC'
);
SELECT ok(
  (
    SELECT count(DISTINCT p.oid) = 4
    FROM pg_proc p
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    WHERE p.oid = ANY(ARRAY[
      'public.select_professional_for_request(uuid,uuid)'::regprocedure::oid,
      'public.get_client_request_matches(uuid)'::regprocedure::oid,
      'public.request_phone_verification(text)'::regprocedure::oid,
      'public.verify_phone_code(text)'::regprocedure::oid
    ]::oid[])
      AND a.grantee = 'service_role'::regrole
      AND a.privilege_type = 'EXECUTE'
  ),
  'service_role has the four direct EXECUTE grants specified by the migration'
);

SELECT ok(
  (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = 'public.match_request(uuid)'::regprocedure),
  'match_request remains SECURITY DEFINER'
);
SELECT ok(
  (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = 'public.select_professional_for_request(uuid,uuid)'::regprocedure),
  'select_professional_for_request remains SECURITY DEFINER'
);
SELECT ok(
  (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = 'public.request_phone_verification(text)'::regprocedure),
  'request_phone_verification remains SECURITY DEFINER'
);
SELECT ok(
  (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = 'public.sync_verified_phone()'::regprocedure),
  'sync_verified_phone is SECURITY DEFINER'
);
SELECT ok(
  (SELECT p.prosecdef FROM pg_proc p WHERE p.oid = 'public.submit_identity_for_review()'::regprocedure),
  'submit_identity_for_review remains SECURITY DEFINER'
);
SELECT ok(
  (SELECT p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[] FROM pg_proc p WHERE p.oid = 'public.match_request(uuid)'::regprocedure)
  AND (SELECT p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[] FROM pg_proc p WHERE p.oid = 'public.select_professional_for_request(uuid,uuid)'::regprocedure)
  AND (SELECT p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[] FROM pg_proc p WHERE p.oid = 'public.request_phone_verification(text)'::regprocedure)
  AND (SELECT p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[] FROM pg_proc p WHERE p.oid = 'public.sync_verified_phone()'::regprocedure)
  AND (SELECT p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[] FROM pg_proc p WHERE p.oid = 'public.submit_identity_for_review()'::regprocedure),
  'P0 SECURITY DEFINER RPCs pin search_path to pg_catalog and public'
);

SELECT * FROM finish();
ROLLBACK;
