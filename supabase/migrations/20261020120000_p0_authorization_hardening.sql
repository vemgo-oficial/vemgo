-- P0 authorization hardening for the existing VemGO Supabase schema.
-- Review the live object signatures and grants before applying this migration.
-- This file is local only; it has not been applied to Supabase.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.professionals') IS NULL
     OR to_regclass('public.request_matches') IS NULL
     OR to_regclass('public.payments') IS NULL
     OR to_regclass('public.transactions') IS NULL
     OR to_regclass('public.requests') IS NULL
     OR to_regclass('public.addresses') IS NULL
     OR to_regclass('public.orders') IS NULL
     OR to_regclass('public.professional_services') IS NULL
     OR to_regclass('public.service_prices') IS NULL
     OR to_regclass('public.professional_regions') IS NULL
     OR to_regclass('public.identity_verifications') IS NULL
     OR to_regclass('public.audit_logs') IS NULL
     OR to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'P0 migration precondition failed: one or more expected VemGO tables are missing';
  END IF;

  IF to_regprocedure('public.match_request(uuid)') IS NULL
     OR to_regprocedure('public.select_professional_for_request(uuid,uuid)') IS NULL
     OR to_regprocedure('public.get_client_request_matches(uuid)') IS NULL
     OR to_regprocedure('public.request_phone_verification(text)') IS NULL
     OR to_regprocedure('public.verify_phone_code(text)') IS NULL
     OR to_regprocedure('public.submit_identity_for_review()') IS NULL THEN
    RAISE EXCEPTION 'P0 migration precondition failed: one or more expected VemGO functions are missing';
  END IF;

  IF EXISTS (
    WITH expected(table_name, column_name) AS (
      VALUES
        ('profiles', 'id'), ('profiles', 'full_name'), ('profiles', 'phone'),
        ('profiles', 'avatar_url'), ('profiles', 'user_type'), ('profiles', 'status'),
        ('profiles', 'created_at'), ('profiles', 'updated_at'),
        ('profiles', 'identity_status'), ('profiles', 'professional_onboarding_step'),
        ('profiles', 'phone_verified_at'), ('profiles', 'identity_verified_at'),
        ('profiles', 'client_verification_status'),
        ('professionals', 'id'), ('professionals', 'display_name'),
        ('professionals', 'bio'), ('professionals', 'document_type'),
        ('professionals', 'document_number'), ('professionals', 'verification_status'),
        ('professionals', 'service_status'), ('professionals', 'created_at'),
        ('professionals', 'updated_at'), ('professionals', 'approved_at'),
        ('professionals', 'approved_by'), ('professionals', 'rejection_reason'),
        ('professionals', 'is_accepting_calls'),
        ('request_matches', 'id'), ('request_matches', 'request_id'),
        ('request_matches', 'professional_id'), ('request_matches', 'match_score'),
        ('request_matches', 'status'), ('request_matches', 'sent_at'),
        ('request_matches', 'responded_at'), ('request_matches', 'created_at'),
        ('request_matches', 'updated_at'),
        ('payments', 'id'), ('payments', 'order_id'), ('payments', 'amount'),
        ('payments', 'currency'), ('payments', 'payment_method'), ('payments', 'provider'),
        ('payments', 'provider_payment_id'), ('payments', 'status'),
        ('payments', 'paid_at'), ('payments', 'created_at'), ('payments', 'updated_at'),
        ('transactions', 'id'), ('transactions', 'payment_id'), ('transactions', 'order_id'),
        ('transactions', 'transaction_type'), ('transactions', 'amount'),
        ('transactions', 'currency'), ('transactions', 'status'), ('transactions', 'reference'),
        ('transactions', 'created_at'), ('transactions', 'updated_at')
    )
    SELECT 1
    FROM expected e
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = e.table_name
        AND c.column_name = e.column_name
    )
  ) THEN
    RAISE EXCEPTION 'P0 migration precondition failed: expected security-sensitive columns are missing';
  END IF;

  IF (SELECT p.prorettype = 'integer'::regtype FROM pg_catalog.pg_proc p WHERE p.oid = 'public.match_request(uuid)'::regprocedure) IS NOT TRUE
     OR (SELECT p.prorettype = 'uuid'::regtype FROM pg_catalog.pg_proc p WHERE p.oid = 'public.select_professional_for_request(uuid,uuid)'::regprocedure) IS NOT TRUE
     OR (SELECT p.prorettype = 'text'::regtype FROM pg_catalog.pg_proc p WHERE p.oid = 'public.request_phone_verification(text)'::regprocedure) IS NOT TRUE
     OR (SELECT p.prorettype = 'boolean'::regtype FROM pg_catalog.pg_proc p WHERE p.oid = 'public.verify_phone_code(text)'::regprocedure) IS NOT TRUE
     OR (SELECT p.prorettype = 'text'::regtype FROM pg_catalog.pg_proc p WHERE p.oid = 'public.submit_identity_for_review()'::regprocedure) IS NOT TRUE THEN
    RAISE EXCEPTION 'P0 migration precondition failed: an expected function return type differs';
  END IF;
END;
$$;

-- Keep users able to read their own data while preventing client-side writes to
-- role, account, phone-verification, identity, and approval fields.
-- Table-level REVOKE does not remove older column-level write grants.
REVOKE INSERT (id, full_name, phone, avatar_url, user_type, status, created_at, updated_at, identity_status, professional_onboarding_step, phone_verified_at, identity_verified_at, client_verification_status),
       UPDATE (id, full_name, phone, avatar_url, user_type, status, created_at, updated_at, identity_status, professional_onboarding_step, phone_verified_at, identity_verified_at, client_verification_status)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, professional_onboarding_step)
  ON TABLE public.profiles TO authenticated;

-- A professional may toggle availability. Approval and identity fields remain
-- writable only through the authorized SECURITY DEFINER review function.
REVOKE INSERT (id, display_name, bio, document_type, document_number, verification_status, service_status, created_at, updated_at, approved_at, approved_by, rejection_reason, is_accepting_calls),
       UPDATE (id, display_name, bio, document_type, document_number, verification_status, service_status, created_at, updated_at, approved_at, approved_by, rejection_reason, is_accepting_calls)
  ON TABLE public.professionals FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.professionals FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.professionals TO authenticated;
GRANT INSERT (id, display_name, bio, document_type, document_number)
  ON TABLE public.professionals TO authenticated;
GRANT UPDATE (is_accepting_calls)
  ON TABLE public.professionals TO authenticated;

-- Opportunity responses already go through SECURITY DEFINER RPCs. Direct row
-- updates let a professional change fields such as request_id or match_score.
REVOKE INSERT (id, request_id, professional_id, match_score, status, sent_at, responded_at, created_at, updated_at),
       UPDATE (id, request_id, professional_id, match_score, status, sent_at, responded_at, created_at, updated_at)
  ON TABLE public.request_matches FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.request_matches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.request_matches TO authenticated;
DROP POLICY IF EXISTS request_matches_update_own ON public.request_matches;

-- Payment history remains client-readable under its existing ownership policy.
-- Clients cannot create or alter payment and ledger records directly.
REVOKE INSERT (id, order_id, amount, currency, payment_method, provider, provider_payment_id, status, paid_at, created_at, updated_at),
       UPDATE (id, order_id, amount, currency, payment_method, provider, provider_payment_id, status, paid_at, created_at, updated_at)
  ON TABLE public.payments FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.payments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.payments TO authenticated;
REVOKE INSERT (id, payment_id, order_id, transaction_type, amount, currency, status, reference, created_at, updated_at),
       UPDATE (id, payment_id, order_id, transaction_type, amount, currency, status, reference, created_at, updated_at)
  ON TABLE public.transactions FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.transactions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.match_request(p_request_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  v_request public.requests%ROWTYPE;
  v_address public.addresses%ROWTYPE;
  v_count integer := 0;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  SELECT r.*
  INTO v_request
  FROM public.requests r
  WHERE r.id = p_request_id
    AND r.client_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou não pertence ao usuário.';
  END IF;

  IF v_request.status <> 'classified' THEN
    RAISE EXCEPTION 'A solicitação precisa estar classificada.';
  END IF;

  IF v_request.service_id IS NULL THEN
    RAISE EXCEPTION 'A solicitação não possui serviço definido.';
  END IF;

  SELECT a.*
  INTO v_address
  FROM public.addresses a
  WHERE a.id = v_request.address_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Endereço da solicitação não encontrado.';
  END IF;

  INSERT INTO public.request_matches (
    request_id,
    professional_id,
    match_score,
    status,
    sent_at
  )
  SELECT
    v_request.id,
    p.id,
    100,
    'pending',
    pg_catalog.now()
  FROM public.professionals p
  JOIN public.profiles prf ON prf.id = p.id
  JOIN public.professional_services ps
    ON ps.professional_id = p.id
   AND ps.service_id = v_request.service_id
   AND ps.is_active = true
  JOIN public.service_prices sp
    ON sp.professional_id = p.id
   AND sp.service_id = v_request.service_id
   AND sp.is_active = true
   AND sp.valid_from <= pg_catalog.now()
   AND (sp.valid_until IS NULL OR sp.valid_until > pg_catalog.now())
  JOIN public.professional_regions pr
    ON pr.professional_id = p.id
   AND pr.is_active = true
   AND pg_catalog.lower(pg_catalog.btrim(pr.city)) = pg_catalog.lower(pg_catalog.btrim(v_address.city))
   AND pg_catalog.lower(pg_catalog.btrim(pr.state)) = pg_catalog.lower(pg_catalog.btrim(v_address.state))
  WHERE p.verification_status = 'approved'
    AND p.service_status = 'active'
    AND prf.status = 'active'
    AND prf.identity_status = 'verified'
  ON CONFLICT (request_id, professional_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    UPDATE public.requests
    SET status = 'matching', updated_at = pg_catalog.now()
    WHERE id = v_request.id;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.match_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.select_professional_for_request(
  p_request_id uuid,
  p_professional_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
  v_request public.requests%ROWTYPE;
  v_match public.request_matches%ROWTYPE;
  v_order_id uuid;
  v_price numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  SELECT r.*
  INTO v_request
  FROM public.requests r
  WHERE r.id = p_request_id
    AND r.client_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou não pertence ao usuário.';
  END IF;

  IF v_request.status <> 'matching' THEN
    RAISE EXCEPTION 'Esta solicitação não está disponível para escolha.';
  END IF;

  SELECT rm.*
  INTO v_match
  FROM public.request_matches rm
  WHERE rm.request_id = p_request_id
    AND rm.professional_id = p_professional_id
    AND rm.status IN ('pending', 'sent')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Este profissional não está disponível para esta solicitação.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.professionals p
    JOIN public.profiles prf ON prf.id = p.id
    WHERE p.id = p_professional_id
      AND p.verification_status = 'approved'
      AND p.service_status = 'active'
      AND prf.status = 'active'
      AND prf.identity_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'O profissional não está mais elegível para esta solicitação.';
  END IF;

  SELECT sp.price
  INTO v_price
  FROM public.service_prices sp
  WHERE sp.professional_id = p_professional_id
    AND sp.service_id = v_request.service_id
    AND sp.is_active = true
    AND sp.valid_from <= pg_catalog.now()
    AND (sp.valid_until IS NULL OR sp.valid_until > pg_catalog.now())
  ORDER BY sp.valid_from DESC
  LIMIT 1;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'O profissional não possui preço ativo para este serviço.';
  END IF;

  SELECT o.id
  INTO v_order_id
  FROM public.orders o
  WHERE o.request_id = p_request_id
  LIMIT 1;

  IF v_order_id IS NULL THEN
    INSERT INTO public.orders (
      request_id, client_id, professional_id, service_id, address_id,
      price, currency, status
    )
    VALUES (
      v_request.id, v_user_id, p_professional_id, v_request.service_id,
      v_request.address_id, v_price, 'BRL', 'confirmed'
    )
    RETURNING id INTO v_order_id;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = v_order_id
      AND o.client_id = v_user_id
      AND o.professional_id = p_professional_id
  ) THEN
    RAISE EXCEPTION 'Já existe um pedido diferente para esta solicitação.';
  END IF;

  UPDATE public.request_matches
  SET status = 'accepted',
      responded_at = COALESCE(responded_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  WHERE id = v_match.id;

  UPDATE public.request_matches
  SET status = 'cancelled', updated_at = pg_catalog.now()
  WHERE request_id = p_request_id
    AND id <> v_match.id
    AND status IN ('pending', 'sent');

  UPDATE public.requests
  SET status = 'matched', updated_at = pg_catalog.now()
  WHERE id = p_request_id;

  INSERT INTO public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, details
  )
  VALUES (
    v_user_id,
    'select_professional',
    'request',
    p_request_id,
    pg_catalog.jsonb_build_object(
      'professional_id', p_professional_id,
      'match_id', v_match.id,
      'order_id', v_order_id,
      'price', v_price
    )
  );

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.select_professional_for_request(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.select_professional_for_request(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.select_professional_for_request(uuid, uuid) TO service_role;

-- This RPC already checks authentication and request ownership in its body.
-- Anonymous callers have no reason to execute it.
REVOKE ALL ON FUNCTION public.get_client_request_matches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_request_matches(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_request_matches(uuid) TO service_role;

-- The development endpoint returned the generated OTP to the caller and did
-- not deliver it out of band. Fail closed until an SMS/WhatsApp provider exists.
CREATE OR REPLACE FUNCTION public.request_phone_verification(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF p_phone IS NULL OR pg_catalog.btrim(p_phone) = '' THEN
    RAISE EXCEPTION 'Telefone obrigatório.';
  END IF;

  RAISE EXCEPTION 'A verificação por SMS/WhatsApp ainda não está configurada.';
END;
$$;

REVOKE ALL ON FUNCTION public.request_phone_verification(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_phone_verification(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_phone_verification(text) TO service_role;
REVOKE ALL ON FUNCTION public.verify_phone_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_phone_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_phone_code(text) TO service_role;

-- Sync a phone only after Supabase Auth has confirmed it. The caller supplies
-- no phone number or verification timestamp.
CREATE OR REPLACE FUNCTION public.sync_verified_phone()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
  v_phone text;
  v_phone_confirmed_at timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  SELECT u.phone, u.phone_confirmed_at
  INTO v_phone, v_phone_confirmed_at
  FROM auth.users u
  WHERE u.id = v_user_id;

  IF v_phone IS NULL OR v_phone_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'O celular ainda não foi confirmado pela autenticação.';
  END IF;

  UPDATE public.profiles
  SET phone = v_phone,
      phone_verified_at = v_phone_confirmed_at,
      updated_at = pg_catalog.now()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.';
  END IF;
END;
$$;

ALTER FUNCTION public.sync_verified_phone() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_verified_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_verified_phone() TO authenticated;

-- Submission marks identity as pending only after the user's own pending
-- verification record exists. Approval remains exclusively in the admin RPC.
CREATE OR REPLACE FUNCTION public.submit_identity_for_review()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.identity_verifications iv
    WHERE iv.profile_id = v_user_id
      AND iv.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Não há verificação de identidade pendente para envio.';
  END IF;

  UPDATE public.profiles
  SET identity_status = 'pending', updated_at = pg_catalog.now()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.';
  END IF;

  RETURN 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.submit_identity_for_review() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_identity_for_review() TO authenticated;

COMMIT;
