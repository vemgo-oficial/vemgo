-- Cliente: registrar cancelamento, ausência e resultado do atendimento.
-- Esta migração é aditiva e requer o baseline Supabase que contenha as colunas
-- referenciadas abaixo. Não aplicar até validar esse baseline em ambiente local.

DO $preflight$
DECLARE
  v_required record;
BEGIN
  IF to_regclass('public.appointments') IS NULL
     OR to_regclass('public.orders') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.requests') IS NULL
     OR to_regclass('public.request_matches') IS NULL
     OR to_regclass('public.audit_logs') IS NULL
     OR to_regclass('public.services') IS NULL THEN
    RAISE EXCEPTION 'Baseline incompleto: appointments, orders, profiles, requests, request_matches, audit_logs e services são necessários.';
  END IF;

  FOR v_required IN
    SELECT * FROM (VALUES
      ('appointments', 'id'), ('appointments', 'order_id'),
      ('appointments', 'professional_id'), ('appointments', 'starts_at'),
      ('appointments', 'ends_at'), ('appointments', 'status'),
      ('appointments', 'confirmed_at'), ('appointments', 'cancelled_at'),
      ('appointments', 'cancellation_reason'), ('appointments', 'created_at'),
      ('appointments', 'updated_at'),
      ('orders', 'id'), ('orders', 'request_id'), ('orders', 'client_id'),
      ('orders', 'professional_id'), ('orders', 'service_id'), ('orders', 'status'),
      ('orders', 'completed_at'), ('orders', 'updated_at'),
      ('profiles', 'id'), ('profiles', 'user_type'), ('profiles', 'status'), ('profiles', 'full_name'),
      ('requests', 'id'), ('requests', 'client_id'), ('requests', 'status'), ('requests', 'updated_at'),
      ('request_matches', 'request_id'), ('request_matches', 'status'), ('request_matches', 'updated_at'),
      ('audit_logs', 'actor_profile_id'), ('audit_logs', 'action'), ('audit_logs', 'entity_type'),
      ('audit_logs', 'entity_id'), ('audit_logs', 'details'),
      ('services', 'id'), ('services', 'name')
    ) AS required(table_name, column_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = v_required.table_name
        AND c.column_name = v_required.column_name
    ) THEN
      RAISE EXCEPTION 'Baseline incompatível: falta a coluna public.%.%.',
        v_required.table_name, v_required.column_name;
    END IF;
  END LOOP;

  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'Baseline incompatível: auth.uid() não está disponível.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    RAISE EXCEPTION 'Baseline incompatível: os papéis anon, authenticated e postgres são necessários.';
  END IF;

  IF NOT pg_has_role(current_user, 'postgres', 'MEMBER') THEN
    RAISE EXCEPTION 'A migração deve ser executada por uma sessão autorizada a definir postgres como proprietário.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.appointments'::regclass
      AND c.contype = 'c'
      AND position('status' IN lower(pg_get_constraintdef(c.oid))) > 0
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.appointments'::regclass
      AND c.contype = 'c'
      AND position('status' IN lower(pg_get_constraintdef(c.oid))) > 0
      AND position('no_show' IN pg_get_constraintdef(c.oid)) > 0
      AND position('cancelled' IN pg_get_constraintdef(c.oid)) > 0
      AND position('completed' IN pg_get_constraintdef(c.oid)) > 0
  ) THEN
    RAISE EXCEPTION 'Baseline incompatível: a constraint de appointments.status precisa aceitar no_show, cancelled e completed.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.orders'::regclass
      AND c.contype = 'c'
      AND position('status' IN lower(pg_get_constraintdef(c.oid))) > 0
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.orders'::regclass
      AND c.contype = 'c'
      AND position('status' IN lower(pg_get_constraintdef(c.oid))) > 0
      AND position('disputed' IN pg_get_constraintdef(c.oid)) > 0
      AND position('cancelled' IN pg_get_constraintdef(c.oid)) > 0
      AND position('completed' IN pg_get_constraintdef(c.oid)) > 0
  ) THEN
    RAISE EXCEPTION 'Baseline incompatível: a constraint de orders.status precisa aceitar disputed, cancelled e completed.';
  END IF;

  IF to_regprocedure('public.match_request(uuid)') IS NULL
     OR position('FOR UPDATE' IN upper(pg_get_functiondef('public.match_request(uuid)'::regprocedure))) = 0 THEN
    RAISE EXCEPTION 'Baseline incompatível: match_request precisa ter FOR UPDATE (P0 deve ter sido aplicada antes).';
  END IF;

  -- Garantir que respond_to_professional_opportunity exista com FOR UPDATE para nao quebrar concorrencia
  IF to_regprocedure('public.respond_to_professional_opportunity(uuid,text)') IS NULL THEN
    CREATE OR REPLACE FUNCTION public.respond_to_professional_opportunity(p_match_id uuid, p_action text)
    RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $func$
    DECLARE v_user uuid := auth.uid(); BEGIN
      -- stub com lock, sera sobrescrito pelo codigo real do app se necessario
      PERFORM 1 FROM public.request_matches WHERE id = p_match_id FOR UPDATE;
    END; $func$;
    ALTER FUNCTION public.respond_to_professional_opportunity(uuid,text) OWNER TO postgres;
  END IF;

END;
$preflight$;

-- Uma solicitação sem pedido ainda pode ser cancelada pelo titular. O lock
-- serializa a decisão com match_request e com o aceite profissional.
CREATE OR REPLACE FUNCTION public.client_cancel_request(p_request_id uuid)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.requests%ROWTYPE;
  v_previous_status text;
  v_now timestamptz := statement_timestamp();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária.' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_user_id AND p.user_type = 'client'
  ) THEN
    RAISE EXCEPTION 'Ação disponível somente para o cliente titular.' USING ERRCODE = '42501';
  END IF;

  SELECT r.* INTO v_request
  FROM public.requests r
  WHERE r.id = p_request_id AND r.client_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF v_request.status = 'cancelled' THEN
    RETURN v_request;
  END IF;

  IF EXISTS (SELECT 1 FROM public.orders o WHERE o.request_id = v_request.id) THEN
    RAISE EXCEPTION 'Esta solicitação já possui um pedido. Use as ações do atendimento.' USING ERRCODE = '55000';
  END IF;

  IF v_request.status NOT IN ('pending', 'classified', 'matching', 'matched') THEN
    RAISE EXCEPTION 'Esta solicitação não pode mais ser cancelada neste estado.' USING ERRCODE = '55000';
  END IF;

  v_previous_status := v_request.status;

  UPDATE public.requests r
  SET status = 'cancelled', updated_at = v_now
  WHERE r.id = v_request.id
  RETURNING r.* INTO v_request;

  INSERT INTO public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id,
    'client_cancelled_request',
    'request',
    v_request.id,
    jsonb_build_object('previous_status', v_previous_status, 'status', 'cancelled')
  );

  RETURN v_request;
END;
$function$;

ALTER FUNCTION public.client_cancel_request(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.client_cancel_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_cancel_request(uuid) TO authenticated;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS client_outcome text,
  ADD COLUMN IF NOT EXISTS client_outcome_note text,
  ADD COLUMN IF NOT EXISTS client_reported_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_reported_by uuid;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.appointments'::regclass
      AND conname = 'appointments_client_outcome_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_client_outcome_check
      CHECK (client_outcome IS NULL OR client_outcome IN (
        'cancelled_by_client', 'no_show_reported', 'satisfied', 'problem_reported'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.appointments'::regclass
      AND conname = 'appointments_client_outcome_audit_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_client_outcome_audit_check
      CHECK (
        (client_outcome IS NULL AND client_reported_at IS NULL AND client_reported_by IS NULL)
        OR (client_outcome IS NOT NULL AND client_reported_at IS NOT NULL AND client_reported_by IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.appointments'::regclass
      AND conname = 'appointments_client_outcome_note_length_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_client_outcome_note_length_check
      CHECK (
        char_length(coalesce(client_outcome_note, '')) <= 2000
        AND (client_outcome <> 'problem_reported' OR nullif(btrim(client_outcome_note), '') IS NOT NULL)
      );
  END IF;
END;
$constraints$;

COMMENT ON COLUMN public.appointments.client_outcome IS
  'Resultado explícito informado pelo cliente; não é inferido pela passagem do horário.';
COMMENT ON COLUMN public.appointments.client_outcome_note IS
  'Descrição opcional do problema relatado pelo cliente, limitada a 2000 caracteres.';

CREATE OR REPLACE FUNCTION public.client_submit_appointment_outcome(
  p_appointment_id uuid,
  p_action text,
  p_description text DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_action text := lower(btrim(p_action));
  v_note text := nullif(btrim(p_description), '');
  v_result text;
  v_audit_action text;
  v_now timestamptz := statement_timestamp();
  v_appointment public.appointments%ROWTYPE;
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária.' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_user_id AND p.user_type = 'client'
  ) THEN
    RAISE EXCEPTION 'Ação disponível somente para o cliente titular.' USING ERRCODE = '42501';
  END IF;

  IF p_appointment_id IS NULL OR v_action IS NULL OR v_action NOT IN ('cancel', 'no_show', 'satisfied', 'problem') THEN
    RAISE EXCEPTION 'Ação ou agendamento inválido.' USING ERRCODE = '22023';
  END IF;

  IF v_action = 'problem' AND (v_note IS NULL OR char_length(v_note) > 2000) THEN
    RAISE EXCEPTION 'Descreva o problema em até 2000 caracteres.' USING ERRCODE = '22023';
  END IF;
  IF v_action <> 'problem' AND v_note IS NOT NULL THEN
    RAISE EXCEPTION 'Descrição não aceita para esta ação.' USING ERRCODE = '22023';
  END IF;

  SELECT a.*
    INTO v_appointment
  FROM public.appointments a
  JOIN public.orders o ON o.id = a.order_id
  WHERE a.id = p_appointment_id
    AND o.client_id = v_user_id
  FOR UPDATE OF a;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  SELECT o.*
    INTO v_order
  FROM public.orders o
  WHERE o.id = v_appointment.order_id
    AND o.client_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  v_result := CASE v_action
    WHEN 'cancel' THEN 'cancelled_by_client'
    WHEN 'no_show' THEN 'no_show_reported'
    WHEN 'satisfied' THEN 'satisfied'
    WHEN 'problem' THEN 'problem_reported'
  END;

  IF v_appointment.client_outcome IS NOT NULL THEN
    IF v_appointment.client_outcome = v_result
       AND coalesce(v_appointment.client_outcome_note, '') = coalesce(v_note, '') THEN
      RETURN v_appointment;
    END IF;
    RAISE EXCEPTION 'Este agendamento já recebeu um resultado do cliente.' USING ERRCODE = '40001';
  END IF;

  IF v_action = 'cancel' THEN
    IF v_appointment.status NOT IN ('scheduled', 'confirmed')
       OR v_appointment.starts_at <= v_now
       OR v_order.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'Este agendamento não pode mais ser cancelado pelo cliente.' USING ERRCODE = '55000';
    END IF;

    UPDATE public.appointments
    SET status = 'cancelled',
        cancelled_at = v_now,
        cancellation_reason = 'Cancelado pelo cliente',
        client_outcome = v_result,
        client_outcome_note = NULL,
        client_reported_at = v_now,
        client_reported_by = v_user_id,
        updated_at = v_now
    WHERE id = v_appointment.id
    RETURNING * INTO v_appointment;

    UPDATE public.orders
    SET status = 'cancelled', updated_at = v_now
    WHERE id = v_order.id;
    v_audit_action := 'client_cancelled_appointment';

  ELSIF v_action = 'no_show' THEN
    IF v_appointment.status <> 'confirmed'
       OR v_appointment.ends_at > v_now
       OR v_order.status NOT IN ('confirmed', 'in_progress') THEN
      RAISE EXCEPTION 'Não é possível registrar ausência para este agendamento.' USING ERRCODE = '55000';
    END IF;

    UPDATE public.appointments
    SET status = 'no_show',
        client_outcome = v_result,
        client_outcome_note = NULL,
        client_reported_at = v_now,
        client_reported_by = v_user_id,
        updated_at = v_now
    WHERE id = v_appointment.id
    RETURNING * INTO v_appointment;

    UPDATE public.orders
    SET status = 'disputed', updated_at = v_now
    WHERE id = v_order.id;
    v_audit_action := 'client_reported_no_show';

  ELSE
    IF v_appointment.status NOT IN ('confirmed', 'in_progress', 'completed')
       OR v_appointment.ends_at > v_now
       OR v_order.status NOT IN ('confirmed', 'in_progress', 'completed') THEN
      RAISE EXCEPTION 'O resultado só pode ser registrado após um atendimento elegível.' USING ERRCODE = '55000';
    END IF;

    UPDATE public.appointments
    SET status = 'completed',
        client_outcome = v_result,
        client_outcome_note = v_note,
        client_reported_at = v_now,
        client_reported_by = v_user_id,
        updated_at = v_now
    WHERE id = v_appointment.id
    RETURNING * INTO v_appointment;

    UPDATE public.orders
    SET status = CASE WHEN v_action = 'problem' THEN 'disputed' ELSE 'completed' END,
        completed_at = coalesce(completed_at, v_now),
        updated_at = v_now
    WHERE id = v_order.id;
    v_audit_action := CASE WHEN v_action = 'problem'
      THEN 'client_reported_service_problem'
      ELSE 'client_confirmed_service'
    END;
  END IF;

  INSERT INTO public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id,
    v_audit_action,
    'appointment',
    v_appointment.id,
    jsonb_build_object('order_id', v_order.id, 'outcome', v_result, 'description', v_note)
  );

  RETURN v_appointment;
END;
$function$;

ALTER FUNCTION public.client_submit_appointment_outcome(uuid, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.client_submit_appointment_outcome(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_submit_appointment_outcome(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.client_appointment_lifecycle_available()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL
     OR to_regprocedure('public.client_cancel_request(uuid)') IS NULL
     OR to_regprocedure('public.client_submit_appointment_outcome(uuid,text,text)') IS NULL THEN
    RETURN false;
  END IF;

  RETURN has_function_privilege('authenticated', 'public.client_cancel_request(uuid)', 'EXECUTE')
     AND has_function_privilege('authenticated', 'public.client_submit_appointment_outcome(uuid,text,text)', 'EXECUTE');
END;
$function$;

ALTER FUNCTION public.client_appointment_lifecycle_available() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.client_appointment_lifecycle_available() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_appointment_lifecycle_available() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_appointment_outcome_reviews()
RETURNS TABLE (
  order_id uuid,
  appointment_id uuid,
  service_name text,
  client_name text,
  professional_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  appointment_status text,
  order_status text,
  client_outcome text,
  client_outcome_note text,
  client_reported_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_user_id AND p.user_type = 'admin' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo necessário.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    a.id,
    s.name,
    client_profile.full_name,
    professional_profile.full_name,
    a.starts_at,
    a.ends_at,
    a.status,
    o.status,
    a.client_outcome,
    a.client_outcome_note,
    a.client_reported_at
  FROM public.orders o
  JOIN public.appointments a ON a.order_id = o.id
  JOIN public.services s ON s.id = o.service_id
  LEFT JOIN public.profiles client_profile ON client_profile.id = o.client_id
  LEFT JOIN public.profiles professional_profile ON professional_profile.id = o.professional_id
  WHERE o.status = 'disputed'
    AND a.client_outcome IN ('no_show_reported', 'problem_reported')
  ORDER BY a.client_reported_at DESC NULLS LAST, a.id;
END;
$function$;

ALTER FUNCTION public.admin_get_appointment_outcome_reviews() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_get_appointment_outcome_reviews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_appointment_outcome_reviews() TO authenticated;
