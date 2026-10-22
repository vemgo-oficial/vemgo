


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."admin_get_professional_dossier"("p_professional_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- Somente administradores ativos podem consultar o dossiê.
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.user_type = 'admin'
          AND p.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Acesso restrito a administradores ativos';
    END IF;

    SELECT jsonb_build_object(

        -- Dados do perfil
        'profile', (
            SELECT to_jsonb(p_row)
            FROM (
                SELECT
                    p.full_name,
                    p.phone,
                    p.user_type,
                    p.status,
                    p.identity_status,
                    p.phone_verified_at,

                    -- Usa a data do perfil ou a data da
                    -- verificação de identidade aprovada.
                    COALESCE(
                        p.identity_verified_at,

                        (
                            SELECT d.verified_at
                            FROM public.identity_documents d
                            WHERE d.profile_id = p.id
                              AND d.verification_status = 'approved'
                              AND d.verified_at IS NOT NULL
                            ORDER BY
                                d.verified_at DESC,
                                d.created_at DESC
                            LIMIT 1
                        ),

                        (
                            SELECT v.verified_at
                            FROM public.identity_verifications v
                            WHERE v.profile_id = p.id
                              AND v.status = 'approved'
                              AND v.verified_at IS NOT NULL
                            ORDER BY
                                v.verified_at DESC,
                                v.created_at DESC
                            LIMIT 1
                        )
                    ) AS identity_verified_at,

                    p.created_at

                FROM public.profiles p
                WHERE p.id = p_professional_id
            ) p_row
        ),

        -- Dados profissionais
        'professional', (
            SELECT to_jsonb(pr_row)
            FROM (
                SELECT
                    -- Prioriza o nome de exibição.
                    -- Se estiver vazio, mostra o nome completo.
                    COALESCE(
                        NULLIF(BTRIM(pr.display_name), ''),
                        NULLIF(BTRIM(p.full_name), '')
                    ) AS display_name,

                    pr.bio,

                    -- Prioriza os dados cadastrais do profissional.
                    -- Se estiverem vazios, utiliza o documento
                    -- de identidade aprovado mais recente.
                    COALESCE(
                        NULLIF(BTRIM(pr.document_type), ''),
                        NULLIF(BTRIM(idoc.document_type), '')
                    ) AS document_type,

                    COALESCE(
                        NULLIF(BTRIM(pr.document_number), ''),
                        NULLIF(BTRIM(idoc.document_number), '')
                    ) AS document_number,

                    pr.verification_status,
                    pr.service_status,
                    pr.is_accepting_calls,
                    pr.created_at,
                    pr.rejection_reason

                FROM public.professionals pr

                LEFT JOIN public.profiles p
                    ON p.id = pr.id

                LEFT JOIN LATERAL (
                    SELECT
                        d.document_type,
                        d.document_number
                    FROM public.identity_documents d
                    WHERE d.profile_id = pr.id
                      AND d.verification_status = 'approved'
                    ORDER BY
                        d.verified_at DESC NULLS LAST,
                        d.created_at DESC
                    LIMIT 1
                ) idoc ON TRUE

                WHERE pr.id = p_professional_id
            ) pr_row
        ),

        -- Documentos de identidade
        'identity_documents', COALESCE(
            (
                SELECT jsonb_agg(
                    to_jsonb(d_row)
                    ORDER BY d_row.created_at DESC
                )
                FROM (
                    SELECT
                        d.document_type,
                        d.document_number,
                        d.verification_status,
                        d.verification_provider,
                        d.verified_at,
                        d.rejection_reason,
                        d.document_front_path,
                        d.document_back_path,
                        d.created_at
                    FROM public.identity_documents d
                    WHERE d.profile_id = p_professional_id
                ) d_row
            ),
            '[]'::jsonb
        ),

        -- Histórico de verificações de identidade
        'identity_verifications', COALESCE(
            (
                SELECT jsonb_agg(
                    to_jsonb(v_row)
                    ORDER BY v_row.created_at DESC
                )
                FROM (
                    SELECT
                        v.verification_type,
                        v.status,
                        v.provider,
                        v.provider_reference,
                        v.verified_at,
                        v.rejection_reason,
                        v.selfie_path,
                        v.created_at
                    FROM public.identity_verifications v
                    WHERE v.profile_id = p_professional_id
                ) v_row
            ),
            '[]'::jsonb
        ),

        -- Serviços cadastrados
        'services', COALESCE(
            (
                SELECT jsonb_agg(
                    to_jsonb(s_row)
                    ORDER BY s_row.code NULLS LAST
                )
                FROM (
                    SELECT
                        s.code,
                        s.name,
                        s.description,
                        s.is_active,
                        sp.price,
                        sp.currency,
                        sp.is_active AS price_active,
                        sp.valid_from,
                        sp.valid_until
                    FROM public.professional_services ps

                    JOIN public.services s
                        ON s.id = ps.service_id

                    LEFT JOIN LATERAL (
                        SELECT
                            pz.price,
                            pz.currency,
                            pz.is_active,
                            pz.valid_from,
                            pz.valid_until
                        FROM public.service_prices pz
                        WHERE pz.professional_id = ps.professional_id
                          AND pz.service_id = ps.service_id
                        ORDER BY
                            pz.is_active DESC,
                            pz.valid_from DESC,
                            pz.created_at DESC
                        LIMIT 1
                    ) sp ON TRUE

                    WHERE ps.professional_id = p_professional_id
                      AND ps.is_active = TRUE
                ) s_row
            ),
            '[]'::jsonb
        ),

        -- Regiões atendidas
        'regions', COALESCE(
            (
                SELECT jsonb_agg(
                    to_jsonb(r_row)
                    ORDER BY r_row.city
                )
                FROM (
                    SELECT
                        r.city,
                        r.state,
                        r.country,
                        r.max_distance_km,
                        r.is_active
                    FROM public.professional_regions r
                    WHERE r.professional_id = p_professional_id
                ) r_row
            ),
            '[]'::jsonb
        ),

        -- Disponibilidade do profissional
        'availability', COALESCE(
            (
                SELECT jsonb_agg(
                    to_jsonb(a_row)
                    ORDER BY
                        a_row.day_of_week,
                        a_row.start_time
                )
                FROM (
                    SELECT
                        a.day_of_week,
                        a.start_time::text AS start_time,
                        a.end_time::text AS end_time,
                        a.is_active
                    FROM public.professional_availability a
                    WHERE a.professional_id = p_professional_id
                ) a_row
            ),
            '[]'::jsonb
        )

    )
    INTO v_result
    FROM public.professionals pr
    WHERE pr.id = p_professional_id;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Profissional não encontrado';
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."admin_get_professional_dossier"("p_professional_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_pending_professionals"() RETURNS TABLE("id" "uuid", "full_name" "text", "display_name" "text", "profile_status" "text", "identity_status" "text", "verification_status" "text", "service_status" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.user_type = 'admin'
          AND p.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Acesso restrito a administradores ativos';
    END IF;

    RETURN QUERY
    SELECT
        pr.id,
        p.full_name::text,
        pr.display_name::text,
        p.status::text,
        p.identity_status::text,
        pr.verification_status::text,
        pr.service_status::text,
        pr.created_at
    FROM public.professionals pr
    JOIN public.profiles p ON p.id = pr.id
    WHERE pr.verification_status = 'pending'
    ORDER BY pr.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."admin_list_pending_professionals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."classify_request"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_request public.requests%ROWTYPE;
    v_service_id uuid;
    v_description text;
    v_code text;
BEGIN
    SELECT *
    INTO v_request
    FROM public.requests
    WHERE id = p_request_id
      AND client_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Solicitação não encontrada ou não pertence ao usuário.';
    END IF;

    IF v_request.status <> 'pending' THEN
        RAISE EXCEPTION 'A solicitação não está pendente.';
    END IF;

    v_description := translate(
        lower(coalesce(v_request.description, '')),
        'áàãâäéèêëíìîïóòõôöúùûüç',
        'aaaaaeeeeiiiiooooouuuuc'
    );

    -- Começa pelo serviço já identificado na tela do cliente.
    v_service_id := v_request.service_id;

    -- Lâmpadas: instalação e troca são serviços diferentes.
    IF v_description LIKE '%lampada%'
       OR v_description LIKE '%lampadas%'
    THEN
        IF v_description LIKE '%instalar%'
           OR v_description LIKE '%instalacao%'
           OR v_description LIKE '%colocar%'
           OR v_description LIKE '%montar%'
        THEN
            IF v_description ~ '\m(3|tres)\M' THEN
                v_code := 'ELE-026';
            ELSIF v_description ~ '\m(2|duas)\M' THEN
                v_code := 'ELE-025';
            ELSE
                v_code := 'ELE-024';
            END IF;

        ELSIF v_description LIKE '%queimou%'
           OR v_description LIKE '%queimada%'
           OR v_description LIKE '%queimadas%'
           OR v_description LIKE '%trocar%'
           OR v_description LIKE '%troca%'
           OR v_description LIKE '%substituir%'
           OR v_description LIKE '%substituicao%'
        THEN
            IF v_description ~ '\m(3|tres)\M' THEN
                v_code := 'ELE-029';
            ELSIF v_description ~ '\m(2|duas)\M' THEN
                v_code := 'ELE-028';
            ELSE
                v_code := 'ELE-027';
            END IF;
        ELSE
            v_code := NULL;
        END IF;

    -- Tomada sem energia.
    ELSIF v_description LIKE '%tomada%'
      AND (
          v_description LIKE '%sem energia%'
          OR v_description LIKE '%sem luz%'
          OR v_description LIKE '%nao funciona%'
      )
    THEN
        v_code := 'ELE-004';

    -- Outros problemas de iluminação.
    ELSIF v_description LIKE '%iluminacao%'
       OR v_description LIKE '%luz%'
    THEN
        v_code := 'ELE-005';

    ELSE
        v_code := NULL;
    END IF;

    -- Quando uma regra foi identificada, busca o código oficial.
    IF v_code IS NOT NULL THEN
        SELECT id
        INTO v_service_id
        FROM public.services
        WHERE code = v_code
          AND is_active = true
        LIMIT 1;

        IF v_service_id IS NULL THEN
            RAISE EXCEPTION
                'Serviço % não encontrado ou inativo.', v_code;
        END IF;
    END IF;

    IF v_service_id IS NULL THEN
        RAISE EXCEPTION
            'Não foi possível identificar o serviço da solicitação.';
    END IF;

    UPDATE public.requests
    SET
        service_id = v_service_id,
        status = 'classified',
        updated_at = now()
    WHERE id = p_request_id;
END;
$$;


ALTER FUNCTION "public"."classify_request"("p_request_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "confirmed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "professional_id" "uuid" NOT NULL,
    CONSTRAINT "appointments_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text", 'no_show'::"text"])))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_professional_appointment"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) RETURNS "public"."appointments"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_order public.orders%rowtype;
  v_appointment public.appointments%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_starts_at is null or p_ends_at is null then
    raise exception 'Data e horário são obrigatórios.';
  end if;

  if p_ends_at <= p_starts_at then
    raise exception 'O horário final deve ser posterior ao horário inicial.';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
    and professional_id = v_user_id
  for update;

  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'Este pedido não está disponível para agendamento.';
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.order_id = p_order_id
      and a.status not in ('cancelled')
  ) then
    raise exception 'Este pedido já possui um agendamento.';
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.status not in ('cancelled')
      and p_starts_at < a.ends_at
      and p_ends_at > a.starts_at
      and exists (
        select 1
        from public.orders o
        where o.id = a.order_id
          and o.professional_id = v_user_id
      )
  ) then
    raise exception 'O profissional já possui um agendamento neste horário.';
  end if;

  insert into public.appointments (
    order_id,
    starts_at,
    ends_at,
    status
  )
  values (
    p_order_id,
    p_starts_at,
    p_ends_at,
    'scheduled'
  )
  returning *
  into v_appointment;

  update public.orders
  set
    status = 'confirmed',
    scheduled_start = p_starts_at,
    scheduled_end = p_ends_at,
    updated_at = now()
  where id = p_order_id;

  return v_appointment;
end;
$$;


ALTER FUNCTION "public"."create_professional_appointment"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_client_order_schedule"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_order public.orders%rowtype;
  v_availability jsonb;
  v_appointments jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  -- O pedido precisa pertencer ao cliente logado
  select *
  into v_order
  from public.orders
  where id = p_order_id
    and client_id = v_user_id
    and status = 'confirmed';

  if not found then
    raise exception 'Pedido não encontrado ou indisponível para agendamento.';
  end if;

  -- Disponibilidade recorrente do profissional
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pa.id,
        'day_of_week', pa.day_of_week,
        'start_time', pa.start_time,
        'end_time', pa.end_time,
        'is_active', pa.is_active
      )
      order by pa.day_of_week, pa.start_time
    ),
    '[]'::jsonb
  )
  into v_availability
  from public.professional_availability pa
  where pa.professional_id = v_order.professional_id
    and pa.is_active = true;

  -- Agendamentos que ocupam a agenda do profissional
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'starts_at', a.starts_at,
        'ends_at', a.ends_at,
        'status', a.status
      )
      order by a.starts_at
    ),
    '[]'::jsonb
  )
  into v_appointments
  from public.appointments a
  where a.professional_id = v_order.professional_id
    and a.status in ('scheduled', 'confirmed', 'in_progress')
    and a.ends_at >= now();

  return jsonb_build_object(
    'order_id', v_order.id,
    'professional_id', v_order.professional_id,
    'availability', v_availability,
    'appointments', v_appointments
  );
end;
$$;


ALTER FUNCTION "public"."get_client_order_schedule"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_client_request_matches"("p_request_id" "uuid") RETURNS TABLE("match_id" "uuid", "professional_id" "uuid", "display_name" "text", "bio" "text", "verification_status" "text", "service_status" "text", "match_score" numeric, "match_status" "text", "sent_at" timestamp with time zone, "price" numeric, "avatar_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
        FROM public.requests r
        WHERE r.id = p_request_id
          AND r.client_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Solicitação não encontrada ou não pertence ao usuário.';
    END IF;

    RETURN QUERY
    SELECT
        rm.id AS match_id,
        p.id AS professional_id,
        p.display_name,
        p.bio,
        p.verification_status,
        p.service_status,
        rm.match_score,
        rm.status AS match_status,
        rm.sent_at,
        sp.price,
        pr.avatar_url
    FROM public.request_matches rm
    JOIN public.professionals p
        ON p.id = rm.professional_id
    LEFT JOIN public.profiles pr
        ON pr.id = p.id
    LEFT JOIN LATERAL (
        SELECT sprice.price
        FROM public.service_prices sprice
        JOIN public.requests r
            ON r.service_id = sprice.service_id
        WHERE r.id = p_request_id
          AND sprice.professional_id = p.id
          AND sprice.is_active = true
          AND sprice.valid_from <= now()
          AND (
              sprice.valid_until IS NULL
              OR sprice.valid_until > now()
          )
        ORDER BY sprice.valid_from DESC
        LIMIT 1
    ) sp ON true
    WHERE rm.request_id = p_request_id
      AND rm.status IN ('pending', 'sent', 'accepted')
    ORDER BY rm.match_score DESC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."get_client_request_matches"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_identity_verifications"() RETURNS TABLE("verification_id" "uuid", "profile_id" "uuid", "full_name" "text", "user_type" "text", "identity_status" "text", "document_id" "uuid", "document_type" "text", "document_number" "text", "document_front_path" "text", "document_back_path" "text", "selfie_path" "text", "verification_status" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = current_user_id
      and admin_profile.user_type = 'admin'
      and admin_profile.status = 'active'
  ) then
    raise exception 'Acesso negado.';
  end if;

  return query
  select
    iv.id as verification_id,
    iv.profile_id as profile_id,
    p.full_name as full_name,
    p.user_type as user_type,
    p.identity_status as identity_status,
    d.id as document_id,
    d.document_type as document_type,
    d.document_number as document_number,
    d.document_front_path as document_front_path,
    d.document_back_path as document_back_path,
    iv.selfie_path as selfie_path,
    iv.status as verification_status,
    iv.created_at as created_at
  from public.identity_verifications iv
  join public.profiles p
    on p.id = iv.profile_id
  left join public.identity_documents d
    on d.id = iv.identity_document_id
  where iv.status = 'pending'
  order by iv.created_at asc;
end;
$$;


ALTER FUNCTION "public"."get_pending_identity_verifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_professionals"() RETURNS TABLE("professional_id" "uuid", "profile_id" "uuid", "full_name" "text", "identity_status" "text", "verification_status" "text", "service_status" "text", "services_count" bigint, "prices_count" bigint, "regions_count" bigint, "availability_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = current_user_id
      and admin_profile.user_type = 'admin'
      and admin_profile.status = 'active'
  ) then
    raise exception 'Acesso negado.';
  end if;

  return query
  select
    p.id as professional_id,
    p.id as profile_id,
    pr.full_name,
    pr.identity_status,
    p.verification_status,
    p.service_status,

    (
      select count(*)
      from public.professional_services ps
      where ps.professional_id = p.id
        and ps.is_active = true
    ) as services_count,

    (
      select count(*)
      from public.service_prices sp
      where sp.professional_id = p.id
        and sp.is_active = true
        and sp.valid_from <= now()
        and (
          sp.valid_until is null
          or sp.valid_until > now()
        )
    ) as prices_count,

    (
      select count(*)
      from public.professional_regions preg
      where preg.professional_id = p.id
        and preg.is_active = true
    ) as regions_count,

    (
      select count(*)
      from public.professional_availability pa
      where pa.professional_id = p.id
        and pa.is_active = true
    ) as availability_count

  from public.professionals p
  inner join public.profiles pr
    on pr.id = p.id

  where p.verification_status = 'pending'

  order by p.created_at asc;
end;
$$;


ALTER FUNCTION "public"."get_pending_professionals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_professional_opportunities"() RETURNS TABLE("match_id" "uuid", "request_id" "uuid", "description" "text", "urgency" "text", "request_status" "text", "service_code" "text", "service_name" "text", "price" numeric, "city" "text", "state" "text", "neighborhood" "text", "match_score" numeric, "match_status" "text", "sent_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    rm.id AS match_id,
    r.id AS request_id,
    r.description,
    r.urgency,
    r.status AS request_status,
    s.code AS service_code,
    s.name AS service_name,
    sp.price,
    a.city,
    a.state,
    a.neighborhood,
    rm.match_score,
    rm.status AS match_status,
    rm.sent_at
  FROM public.request_matches rm
  JOIN public.requests r
    ON r.id = rm.request_id
  JOIN public.services s
    ON s.id = r.service_id
  JOIN public.addresses a
    ON a.id = r.address_id
  JOIN public.professionals p
    ON p.id = rm.professional_id
  JOIN public.profiles pf
    ON pf.id = rm.professional_id
  LEFT JOIN public.service_prices sp
    ON sp.professional_id = rm.professional_id
   AND sp.service_id = r.service_id
   AND sp.is_active = true
   AND sp.valid_from <= now()
   AND (
     sp.valid_until IS NULL
     OR sp.valid_until > now()
   )
  WHERE rm.professional_id = auth.uid()
    AND rm.status = 'pending'
    AND r.status = 'matching'
    AND p.verification_status = 'approved'
    AND p.service_status = 'active'
    AND p.is_accepting_calls = true
    AND pf.identity_status = 'verified'
  ORDER BY rm.sent_at DESC;
$$;


ALTER FUNCTION "public"."get_professional_opportunities"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_professional_legal_acceptance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN

  -- Só atua para novos usuários profissionais
  IF COALESCE(NEW.raw_user_meta_data ->> 'user_type', '') <> 'professional' THEN
    RETURN NEW;
  END IF;

  -- Só registra se o profissional declarou que aceitou os termos
  IF COALESCE(NEW.raw_user_meta_data ->> 'accepted_terms', 'false') <> 'true' THEN
    RETURN NEW;
  END IF;

  -- Termos de Uso do Profissional
  INSERT INTO public.legal_acceptances (
    user_id,
    document_type,
    action,
    document_version,
    accepted_at
  )
  VALUES (
    NEW.id,
    'terms_of_use_professional',
    'accepted',
    '2026-10',
    NOW()
  );

  -- Política de Privacidade
  INSERT INTO public.legal_acceptances (
    user_id,
    document_type,
    action,
    document_version,
    accepted_at
  )
  VALUES (
    NEW.id,
    'privacy_policy',
    'accepted',
    '2026-10',
    NOW()
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_professional_legal_acceptance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    requested_type text;
BEGIN
    requested_type :=
        CASE
            WHEN NEW.raw_user_meta_data ->> 'user_type' = 'professional'
                THEN 'professional'
            ELSE 'client'
        END;

    INSERT INTO public.profiles (
        id,
        full_name,
        phone,
        user_type,
        status
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        NULLIF(
            BTRIM(NEW.raw_user_meta_data ->> 'phone'),
            ''
        ),
        requested_type,
        'active'
    );

    IF requested_type = 'professional' THEN
        INSERT INTO public.professionals (
            id,
            verification_status,
            service_status
        )
        VALUES (
            NEW.id,
            'pending',
            'inactive'
        );
    ELSE
        INSERT INTO public.clients (
            id
        )
        VALUES (
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_legal_acceptance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN

  IF COALESCE(
    (NEW.raw_user_meta_data ->> 'accepted_terms')::boolean,
    false
  ) <> true THEN
    RETURN NEW;
  END IF;


  -- ==========================================================
  -- CLIENTE
  -- ==========================================================

  IF COALESCE(
    NEW.raw_user_meta_data ->> 'user_type',
    ''
  ) = 'client' THEN

    INSERT INTO public.legal_acceptances (
      user_id,
      document_type,
      action,
      document_version,
      accepted_at
    )
    VALUES (
      NEW.id,
      'terms_of_use',
      'accepted',
      '1.0',
      now()
    );

    INSERT INTO public.legal_acceptances (
      user_id,
      document_type,
      action,
      document_version,
      accepted_at
    )
    VALUES (
      NEW.id,
      'privacy_policy',
      'accepted',
      '1.0',
      now()
    );

  END IF;


  -- ==========================================================
  -- PROFISSIONAL
  -- ==========================================================

  IF COALESCE(
    NEW.raw_user_meta_data ->> 'user_type',
    ''
  ) = 'professional' THEN

    INSERT INTO public.legal_acceptances (
      user_id,
      document_type,
      action,
      document_version,
      accepted_at
    )
    VALUES (
      NEW.id,
      'professional_terms',
      'accepted',
      '2026-10',
      now()
    );

    INSERT INTO public.legal_acceptances (
      user_id,
      document_type,
      action,
      document_version,
      accepted_at
    )
    VALUES (
      NEW.id,
      'privacy_policy',
      'accepted',
      '2026-10',
      now()
    );

  END IF;


  RETURN NEW;

END;
$$;


ALTER FUNCTION "public"."handle_new_user_legal_acceptance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_request"("p_request_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_request public.requests%rowtype;
  v_address public.addresses%rowtype;
  v_count integer := 0;
begin
  select *
    into v_request
  from public.requests
  where id = p_request_id;

  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.status <> 'classified' then
    raise exception 'A solicitação precisa estar classificada.';
  end if;

  if v_request.service_id is null then
    raise exception 'A solicitação não possui serviço definido.';
  end if;

  select *
    into v_address
  from public.addresses
  where id = v_request.address_id;

  if not found then
    raise exception 'Endereço da solicitação não encontrado.';
  end if;

  insert into public.request_matches (
    request_id,
    professional_id,
    match_score,
    status,
    sent_at
  )
  select
    v_request.id,
    p.id,
    100,
    'pending',
    now()
  from public.professionals p
  join public.professional_services ps
    on ps.professional_id = p.id
   and ps.service_id = v_request.service_id
   and ps.is_active = true
  join public.service_prices sp
    on sp.professional_id = p.id
   and sp.service_id = v_request.service_id
   and sp.is_active = true
   and sp.valid_from <= now()
   and (
     sp.valid_until is null
     or sp.valid_until > now()
   )
  join public.professional_regions pr
    on pr.professional_id = p.id
   and pr.is_active = true
   and lower(trim(pr.city)) = lower(trim(v_address.city))
   and lower(trim(pr.state)) = lower(trim(v_address.state))
  where p.verification_status = 'approved'
    and p.service_status = 'active'
  on conflict (request_id, professional_id)
  do nothing;

  get diagnostics v_count = row_count;

  if v_count > 0 then
    update public.requests
    set
      status = 'matching',
      updated_at = now()
    where id = v_request.id;
  end if;

  return v_count;
end;
$$;


ALTER FUNCTION "public"."match_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_appointment_slot"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) RETURNS "public"."appointments"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_order public.orders%rowtype;
  v_professional public.professionals%rowtype;
  v_appointment public.appointments%rowtype;
  v_day_of_week integer;
  v_start_time time;
  v_end_time time;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_starts_at >= p_ends_at then
    raise exception 'Horário inválido.';
  end if;

  -- Localiza o pedido e garante que pertence ao cliente logado
  select *
  into v_order
  from public.orders
  where id = p_order_id
    and client_id = v_user_id
    and status = 'confirmed'
  for update;

  if not found then
    raise exception 'Pedido não encontrado ou não está disponível para agendamento.';
  end if;

  -- Garante que existe profissional associado
  select *
  into v_professional
  from public.professionals
  where id = v_order.professional_id;

  if not found then
    raise exception 'Profissional não encontrado.';
  end if;

  -- Converte o horário para o fuso de São Paulo
  v_day_of_week :=
    extract(
      dow from (p_starts_at at time zone 'America/Sao_Paulo')
    )::integer;

  v_start_time :=
    (p_starts_at at time zone 'America/Sao_Paulo')::time;

  v_end_time :=
    (p_ends_at at time zone 'America/Sao_Paulo')::time;

  -- Verifica se o horário está dentro da disponibilidade
  if not exists (
    select 1
    from public.professional_availability pa
    where pa.professional_id = v_order.professional_id
      and pa.day_of_week = v_day_of_week
      and pa.is_active = true
      and pa.start_time <= v_start_time
      and pa.end_time >= v_end_time
  ) then
    raise exception 'O horário escolhido está fora da disponibilidade do profissional.';
  end if;

  -- Verifica conflito com outro agendamento
  if exists (
    select 1
    from public.appointments a
    where a.professional_id = v_order.professional_id
      and a.status in ('scheduled', 'confirmed', 'in_progress')
      and a.starts_at < p_ends_at
      and a.ends_at > p_starts_at
  ) then
    raise exception 'Este horário não está mais disponível.';
  end if;

  -- Garante que este pedido ainda não possui agendamento
  if exists (
    select 1
    from public.appointments a
    where a.order_id = p_order_id
      and a.status in ('scheduled', 'confirmed', 'in_progress')
  ) then
    raise exception 'Este serviço já possui uma solicitação de horário.';
  end if;

  -- Cria a solicitação de horário
  insert into public.appointments (
    order_id,
    professional_id,
    starts_at,
    ends_at,
    status
  )
  values (
    p_order_id,
    v_order.professional_id,
    p_starts_at,
    p_ends_at,
    'scheduled'
  )
  returning *
  into v_appointment;

  return v_appointment;
end;
$$;


ALTER FUNCTION "public"."request_appointment_slot"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_phone_verification"("p_phone" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_user_id uuid;
  v_code text;
  v_code_hash text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RAISE EXCEPTION 'Telefone obrigatório';
  END IF;

  /*
   * Código numérico de 6 dígitos.
   */

  v_code :=
    lpad(
      floor(random() * 1000000)::integer::text,
      6,
      '0'
    );

  /*
   * O código é armazenado somente como SHA-256.
   */

  v_code_hash :=
    encode(
      digest(v_code, 'sha256'),
      'hex'
    );

  /*
   * Remove códigos anteriores ainda pendentes.
   */

  DELETE FROM public.phone_verification_codes
  WHERE profile_id = v_user_id
    AND verified_at IS NULL;

  /*
   * Cria novo código com validade de 10 minutos.
   */

  INSERT INTO public.phone_verification_codes (
    profile_id,
    phone,
    code_hash,
    expires_at
  )
  VALUES (
    v_user_id,
    trim(p_phone),
    v_code_hash,
    now() + interval '10 minutes'
  );

  /*
   * MODO DE DESENVOLVIMENTO:
   * retorna o código para permitir o teste.
   *
   * Antes da produção:
   * substituir por integração SMS/WhatsApp.
   */

  RETURN v_code;
END;
$$;


ALTER FUNCTION "public"."request_phone_verification"("p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reschedule_appointment_slot"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) RETURNS "public"."appointments"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid;
  v_order public.orders%rowtype;
  v_old_appointment public.appointments%rowtype;
  v_new_appointment public.appointments%rowtype;
  v_day_of_week integer;
  v_start_time time;
  v_end_time time;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_starts_at >= p_ends_at then
    raise exception 'Horário inválido.';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
    and client_id = v_user_id
    and status = 'confirmed'
  for update;

  if not found then
    raise exception 'Pedido não encontrado ou não está disponível para reagendamento.';
  end if;

  select *
  into v_old_appointment
  from public.appointments
  where order_id = p_order_id
    and professional_id = v_order.professional_id
    and status = 'confirmed'
  order by starts_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Este serviço não possui um agendamento confirmado para reagendar.';
  end if;

  v_day_of_week :=
    extract(
      dow from (
        p_starts_at at time zone 'America/Sao_Paulo'
      )
    )::integer;

  v_start_time :=
    (
      p_starts_at at time zone 'America/Sao_Paulo'
    )::time;

  v_end_time :=
    (
      p_ends_at at time zone 'America/Sao_Paulo'
    )::time;

  if not exists (
    select 1
    from public.professional_availability pa
    where pa.professional_id = v_order.professional_id
      and pa.day_of_week = v_day_of_week
      and pa.is_active = true
      and pa.start_time <= v_start_time
      and pa.end_time >= v_end_time
  ) then
    raise exception 'O horário escolhido está fora da disponibilidade do profissional.';
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.professional_id = v_order.professional_id
      and a.id <> v_old_appointment.id
      and a.status in (
        'scheduled',
        'confirmed',
        'in_progress'
      )
      and a.starts_at < p_ends_at
      and a.ends_at > p_starts_at
  ) then
    raise exception 'Este horário não está mais disponível.';
  end if;

  update public.appointments
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = 'Reagendamento solicitado pelo cliente',
    updated_at = now()
  where id = v_old_appointment.id;

  update public.orders
  set
    scheduled_start = null,
    scheduled_end = null,
    updated_at = now()
  where id = v_order.id;

  insert into public.appointments (
    order_id,
    professional_id,
    starts_at,
    ends_at,
    status
  )
  values (
    v_order.id,
    v_order.professional_id,
    p_starts_at,
    p_ends_at,
    'scheduled'
  )
  returning *
  into v_new_appointment;

  return v_new_appointment;
end;
$$;


ALTER FUNCTION "public"."reschedule_appointment_slot"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."respond_to_appointment_request"("p_appointment_id" "uuid", "p_decision" "text") RETURNS "public"."appointments"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_appointment public.appointments%rowtype;
  v_order public.orders%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_decision not in ('confirmed', 'declined') then
    raise exception 'Decisão inválida.';
  end if;

  -- Localiza a solicitação e garante que pertence ao profissional logado
  select *
  into v_appointment
  from public.appointments
  where id = p_appointment_id
    and professional_id = v_user_id
  for update;

  if not found then
    raise exception 'Solicitação de horário não encontrada.';
  end if;

  -- Só pode responder a uma solicitação ainda pendente
  if v_appointment.status <> 'scheduled'
     or v_appointment.confirmed_at is not null then
    raise exception 'Esta solicitação já foi respondida.';
  end if;

  -- Localiza o pedido
  select *
  into v_order
  from public.orders
  where id = v_appointment.order_id
    and professional_id = v_user_id
  for update;

  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  if p_decision = 'declined' then

    update public.appointments
    set
      status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = 'Horário recusado pelo profissional',
      updated_at = now()
    where id = p_appointment_id
    returning *
    into v_appointment;

    return v_appointment;
  end if;

  -- Confirma o horário
  update public.appointments
  set
    status = 'confirmed',
    confirmed_at = now(),
    updated_at = now()
  where id = p_appointment_id
  returning *
  into v_appointment;

  -- Só agora o pedido passa a ter horário definitivo
  update public.orders
  set
    scheduled_start = v_appointment.starts_at,
    scheduled_end = v_appointment.ends_at,
    updated_at = now()
  where id = v_order.id;

  return v_appointment;
end;
$$;


ALTER FUNCTION "public"."respond_to_appointment_request"("p_appointment_id" "uuid", "p_decision" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."respond_to_professional_opportunity"("p_match_id" "uuid", "p_decision" "text") RETURNS TABLE("match_id" "uuid", "match_status" "text", "request_id" "uuid", "request_status" "text", "order_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_match public.request_matches%rowtype;
  v_request public.requests%rowtype;
  v_order_id uuid;
  v_price numeric;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_decision not in ('accepted', 'declined') then
    raise exception 'Decisão inválida.';
  end if;

  select *
  into v_match
  from public.request_matches
  where id = p_match_id
    and professional_id = v_user_id
  for update;

  if not found then
    raise exception 'Oportunidade não encontrada.';
  end if;

  if v_match.status <> 'pending' then
    raise exception 'Esta oportunidade já recebeu uma resposta.';
  end if;

  select *
  into v_request
  from public.requests
  where id = v_match.request_id
  for update;

  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.status <> 'matching' then
    raise exception 'Esta solicitação não está mais disponível.';
  end if;

  if p_decision = 'declined' then

    update public.request_matches
    set
      status = 'declined',
      responded_at = now()
    where id = p_match_id;

    return query
    select
      v_match.id,
      'declined'::text,
      v_request.id,
      v_request.status,
      null::uuid;

    return;
  end if;

  select sp.price
  into v_price
  from public.service_prices sp
  where sp.professional_id = v_user_id
    and sp.service_id = v_request.service_id
    and sp.is_active = true
    and sp.valid_from <= now()
    and (
      sp.valid_until is null
      or sp.valid_until > now()
    )
  order by sp.valid_from desc
  limit 1;

  if v_price is null then
    raise exception 'O profissional não possui preço ativo para este serviço.';
  end if;

  update public.request_matches
  set
    status = 'accepted',
    responded_at = now()
  where id = p_match_id;

  update public.requests
  set
    status = 'matched',
    updated_at = now()
  where id = v_request.id;

  select o.id
  into v_order_id
  from public.orders o
  where o.request_id = v_request.id
  limit 1;

  if v_order_id is null then
    insert into public.orders (
      request_id,
      client_id,
      professional_id,
      service_id,
      address_id,
      price,
      currency,
      status
    )
    values (
      v_request.id,
      v_request.client_id,
      v_user_id,
      v_request.service_id,
      v_request.address_id,
      v_price,
      'BRL',
      'confirmed'
    )
    returning id into v_order_id;
  end if;

  begin
    insert into public.audit_logs (
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      details
    )
    values (
      v_user_id,
      'respond_opportunity',
      'request_match',
      p_match_id,
      jsonb_build_object(
        'decision', p_decision,
        'request_id', v_request.id,
        'order_id', v_order_id
      )
    );
  exception
    when undefined_table then
      null;
  end;

  return query
  select
    v_match.id,
    'accepted'::text,
    v_request.id,
    'matched'::text,
    v_order_id;
end;
$$;


ALTER FUNCTION "public"."respond_to_professional_opportunity"("p_match_id" "uuid", "p_decision" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."review_identity_verification"("p_verification_id" "uuid", "p_decision" "text", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid;
  target_profile_id uuid;
  target_document_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = current_user_id
      and user_type = 'admin'
      and status = 'active'
  ) then
    raise exception 'Acesso negado.';
  end if;

  if p_decision not in (
    'approved',
    'rejected',
    'manual_review'
  ) then
    raise exception 'Decisão de identidade inválida.';
  end if;

  select
    iv.profile_id,
    iv.identity_document_id
  into
    target_profile_id,
    target_document_id
  from public.identity_verifications iv
  where iv.id = p_verification_id
  for update;

  if target_profile_id is null then
    raise exception 'Verificação não encontrada.';
  end if;

  if p_decision = 'approved' then

    update public.identity_verifications
    set
      status = 'approved',
      rejection_reason = null,
      verified_at = now(),
      provider = 'manual'
    where id = p_verification_id;

    if target_document_id is not null then
      update public.identity_documents
      set
        verification_status = 'approved',
        rejection_reason = null,
        verified_at = now(),
        verification_provider = 'manual'
      where id = target_document_id;
    end if;

    update public.profiles
    set identity_status = 'verified'
    where id = target_profile_id;

  elsif p_decision = 'rejected' then

    update public.identity_verifications
    set
      status = 'rejected',
      rejection_reason = p_rejection_reason,
      verified_at = null
    where id = p_verification_id;

    if target_document_id is not null then
      update public.identity_documents
      set
        verification_status = 'rejected',
        rejection_reason = p_rejection_reason,
        verified_at = null
      where id = target_document_id;
    end if;

    update public.profiles
    set identity_status = 'rejected'
    where id = target_profile_id;

  else

    update public.identity_verifications
    set
      status = 'manual_review',
      rejection_reason = null,
      verified_at = null
    where id = p_verification_id;

    if target_document_id is not null then
      update public.identity_documents
      set
        verification_status = 'manual_review',
        rejection_reason = null,
        verified_at = null
      where id = target_document_id;
    end if;

    update public.profiles
    set identity_status = 'manual_review'
    where id = target_profile_id;

  end if;

  insert into public.audit_logs (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    current_user_id,
    'identity_review',
    'identity_verification',
    p_verification_id,
    jsonb_build_object(
      'decision', p_decision,
      'target_profile_id', target_profile_id,
      'target_document_id', target_document_id,
      'rejection_reason', p_rejection_reason
    )
  );

  return p_decision;
end;
$$;


ALTER FUNCTION "public"."review_identity_verification"("p_verification_id" "uuid", "p_decision" "text", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."review_professional"("p_professional_id" "uuid", "p_decision" "text", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid;
  professional_identity_status text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = current_user_id
      and admin_profile.user_type = 'admin'
      and admin_profile.status = 'active'
  ) then
    raise exception 'Acesso negado.';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisão inválida.';
  end if;

  select pr.identity_status
  into professional_identity_status
  from public.profiles pr
  where pr.id = p_professional_id;

  if professional_identity_status is null then
    raise exception 'Profissional não encontrado.';
  end if;

  if p_decision = 'approved'
     and professional_identity_status <> 'verified' then
    raise exception 'O profissional só pode ser aprovado após a identidade ser verificada.';
  end if;

  if p_decision = 'approved' then

    update public.professionals
    set
      verification_status = 'approved',
      service_status = 'active',
      approved_at = now(),
      approved_by = current_user_id,
      rejection_reason = null,
      updated_at = now()
    where id = p_professional_id;

    update public.profiles
    set
      status = 'active',
      updated_at = now()
    where id = p_professional_id;

  else

    update public.professionals
    set
      verification_status = 'rejected',
      service_status = 'inactive',
      approved_at = null,
      approved_by = null,
      rejection_reason = nullif(trim(p_rejection_reason), ''),
      updated_at = now()
    where id = p_professional_id;

  end if;

  insert into public.audit_logs (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    current_user_id,
    case
      when p_decision = 'approved'
        then 'professional_approved'
      else
        'professional_rejected'
    end,
    'professional',
    p_professional_id,
    jsonb_build_object(
      'decision', p_decision,
      'rejection_reason',
      nullif(trim(p_rejection_reason), '')
    )
  );
end;
$$;


ALTER FUNCTION "public"."review_professional"("p_professional_id" "uuid", "p_decision" "text", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."select_professional_for_request"("p_request_id" "uuid", "p_professional_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_request public.requests%rowtype;
  v_match public.request_matches%rowtype;
  v_order_id uuid;
  v_price numeric;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  -- A solicitação precisa pertencer ao cliente logado.
  SELECT *
  INTO v_request
  FROM public.requests
  WHERE id = p_request_id
    AND client_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada.';
  END IF;

  IF v_request.status <> 'matching' THEN
    RAISE EXCEPTION 'Esta solicitação não está disponível para escolha.';
  END IF;

  -- O profissional precisa estar entre os profissionais
  -- encontrados para esta solicitação.
  SELECT *
  INTO v_match
  FROM public.request_matches
  WHERE request_id = p_request_id
    AND professional_id = p_professional_id
    AND status IN ('pending', 'sent')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Este profissional não está disponível para esta solicitação.';
  END IF;

  -- O preço utilizado no pedido é o preço ativo definido
  -- pelo profissional para este serviço.
  SELECT sp.price
  INTO v_price
  FROM public.service_prices sp
  WHERE sp.professional_id = p_professional_id
    AND sp.service_id = v_request.service_id
    AND sp.is_active = true
    AND sp.valid_from <= now()
    AND (
      sp.valid_until IS NULL
      OR sp.valid_until > now()
    )
  ORDER BY sp.valid_from DESC
  LIMIT 1;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'O profissional não possui preço ativo para este serviço.';
  END IF;

  -- Verifica se já existe pedido para esta solicitação.
  SELECT o.id
  INTO v_order_id
  FROM public.orders o
  WHERE o.request_id = p_request_id
  LIMIT 1;

  -- Se ainda não existe, cria o pedido.
  IF v_order_id IS NULL THEN

    INSERT INTO public.orders (
      request_id,
      client_id,
      professional_id,
      service_id,
      address_id,
      price,
      currency,
      status
    )
    VALUES (
      v_request.id,
      v_user_id,
      p_professional_id,
      v_request.service_id,
      v_request.address_id,
      v_price,
      'BRL',
      'confirmed'
    )
    RETURNING id INTO v_order_id;

  ELSE

    -- Se já existe, garante que pertence ao cliente
    -- e ao profissional selecionado.
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders
      WHERE id = v_order_id
        AND client_id = v_user_id
        AND professional_id = p_professional_id
    ) THEN
      RAISE EXCEPTION 'Já existe um pedido diferente para esta solicitação.';
    END IF;

  END IF;

  -- Aceita o profissional escolhido.
  UPDATE public.request_matches
  SET
    status = 'accepted',
    responded_at = COALESCE(responded_at, now()),
    updated_at = now()
  WHERE id = v_match.id;

  -- Cancela os demais matches desta solicitação.
  UPDATE public.request_matches
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE request_id = p_request_id
    AND id <> v_match.id
    AND status IN ('pending', 'sent');

  -- A solicitação agora está vinculada ao profissional escolhido.
  UPDATE public.requests
  SET
    status = 'matched',
    updated_at = now()
  WHERE id = p_request_id;

  -- Registra a operação.
  BEGIN
    INSERT INTO public.audit_logs (
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      details
    )
    VALUES (
      v_user_id,
      'select_professional',
      'request',
      p_request_id,
      jsonb_build_object(
        'professional_id', p_professional_id,
        'match_id', v_match.id,
        'order_id', v_order_id,
        'price', v_price
      )
    );
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  RETURN v_order_id;
END;
$$;


ALTER FUNCTION "public"."select_professional_for_request"("p_request_id" "uuid", "p_professional_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_profile_avatar_url"("p_avatar_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  if p_avatar_url is null or length(trim(p_avatar_url)) = 0 then
    raise exception 'Caminho da foto inválido';
  end if;

  update public.profiles
  set
    avatar_url = trim(p_avatar_url),
    updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'Perfil não encontrado';
  end if;
end;
$$;


ALTER FUNCTION "public"."set_profile_avatar_url"("p_avatar_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_service_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.slug is null or trim(new.slug) = '' then
    new.slug := lower(new.code);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_service_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_identity_for_review"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  update public.profiles
  set identity_status = 'pending'
  where id = current_user_id;

  if not found then
    raise exception 'Perfil não encontrado.';
  end if;

  return 'pending';
end;
$$;


ALTER FUNCTION "public"."submit_identity_for_review"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_identity_document"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.document_number is null
     or trim(new.document_number) = '' then
    raise exception 'Número do documento é obrigatório.';
  end if;

  if new.document_front_path is null
     or trim(new.document_front_path) = '' then
    raise exception 'Documento da frente é obrigatório.';
  end if;

  if new.document_type in ('rg', 'cnh') then
    if new.document_back_path is null
       or trim(new.document_back_path) = '' then
      raise exception 'O verso do documento é obrigatório para RG e CNH.';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_identity_document"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_phone_code"("p_code" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_user_id uuid;
  v_verification public.phone_verification_codes%ROWTYPE;
  v_code_hash text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_code IS NULL OR trim(p_code) = '' THEN
    RAISE EXCEPTION 'Código obrigatório';
  END IF;

  /*
   * Busca o último código pendente.
   */

  SELECT *
  INTO v_verification
  FROM public.phone_verification_codes
  WHERE profile_id = v_user_id
    AND verified_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhum código de verificação pendente';
  END IF;

  /*
   * Verifica expiração.
   */

  IF v_verification.expires_at < now() THEN
    RAISE EXCEPTION 'Código expirado';
  END IF;

  /*
   * Máximo de 5 tentativas.
   */

  IF v_verification.attempts >= 5 THEN
    RAISE EXCEPTION 'Número máximo de tentativas atingido';
  END IF;

  /*
   * Gera o hash do código informado.
   */

  v_code_hash :=
    encode(
      digest(trim(p_code), 'sha256'),
      'hex'
    );

  /*
   * Código incorreto.
   */

  IF v_code_hash <> v_verification.code_hash THEN

    UPDATE public.phone_verification_codes
    SET attempts = attempts + 1
    WHERE id = v_verification.id;

    RAISE EXCEPTION 'Código inválido';
  END IF;

  /*
   * Código correto.
   */

  UPDATE public.phone_verification_codes
  SET verified_at = now()
  WHERE id = v_verification.id;

  /*
   * Atualiza o perfil.
   */

  UPDATE public.profiles
  SET
    phone = v_verification.phone,
    phone_verified_at = now(),
    updated_at = now()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."verify_phone_code"("p_code" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "label" "text" DEFAULT 'Principal'::"text" NOT NULL,
    "recipient_name" "text",
    "postal_code" "text",
    "street" "text" NOT NULL,
    "number" "text" NOT NULL,
    "complement" "text",
    "neighborhood" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "country" "text" DEFAULT 'BR'::"text" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "location" "gis"."geography"(Point,4326),
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_profile_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."identity_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "document_number" "text",
    "document_front_path" "text",
    "document_back_path" "text",
    "verification_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "verification_provider" "text",
    "provider_reference" "text",
    "verified_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "identity_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['cpf'::"text", 'rg'::"text", 'cnh'::"text", 'passport'::"text", 'other'::"text"]))),
    CONSTRAINT "identity_documents_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'approved'::"text", 'rejected'::"text", 'manual_review'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."identity_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."identity_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "identity_document_id" "uuid",
    "verification_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider" "text",
    "provider_reference" "text",
    "rejection_reason" "text",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "selfie_path" "text",
    CONSTRAINT "identity_verifications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'approved'::"text", 'rejected'::"text", 'manual_review'::"text", 'expired'::"text"]))),
    CONSTRAINT "identity_verifications_verification_type_check" CHECK (("verification_type" = ANY (ARRAY['document'::"text", 'selfie'::"text", 'liveness'::"text", 'face_match'::"text", 'full_identity'::"text"])))
);


ALTER TABLE "public"."identity_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legal_acceptances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "action" "text" NOT NULL,
    "document_version" "text" NOT NULL,
    "accepted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "legal_acceptances_action_check" CHECK (("action" = ANY (ARRAY['accepted'::"text", 'acknowledged'::"text"]))),
    CONSTRAINT "legal_acceptances_document_type_check" CHECK (("document_type" = ANY (ARRAY['terms_of_use'::"text", 'professional_terms'::"text", 'privacy_policy'::"text"])))
);


ALTER TABLE "public"."legal_acceptances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "address_id" "uuid" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'BRL'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "scheduled_start" timestamp with time zone,
    "scheduled_end" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "orders_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text", 'disputed'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'BRL'::"text" NOT NULL,
    "payment_method" "text",
    "provider" "text",
    "provider_payment_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['pix'::"text", 'credit_card'::"text", 'debit_card'::"text", 'other'::"text"]))),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'authorized'::"text", 'paid'::"text", 'failed'::"text", 'cancelled'::"text", 'refunded'::"text", 'partially_refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_verification_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "phone" "text" NOT NULL,
    "code_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."phone_verification_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "day_of_week" smallint NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "professional_availability_check" CHECK (("start_time" < "end_time")),
    CONSTRAINT "professional_availability_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."professional_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_regions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "country" "text" DEFAULT 'BR'::"text" NOT NULL,
    "max_distance_km" numeric(6,2),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."professional_regions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_services" (
    "professional_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."professional_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professionals" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "bio" "text",
    "document_type" "text",
    "document_number" "text",
    "verification_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "service_status" "text" DEFAULT 'inactive'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "rejection_reason" "text",
    "is_accepting_calls" boolean DEFAULT false NOT NULL,
    CONSTRAINT "professionals_document_type_check" CHECK (("document_type" = ANY (ARRAY['cpf'::"text", 'cnpj'::"text"]))),
    CONSTRAINT "professionals_service_status_check" CHECK (("service_status" = ANY (ARRAY['inactive'::"text", 'active'::"text", 'paused'::"text", 'blocked'::"text"]))),
    CONSTRAINT "professionals_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending'::"text", 'under_review'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."professionals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "user_type" "text" DEFAULT 'client'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "identity_status" "text" DEFAULT 'unverified'::"text" NOT NULL,
    "professional_onboarding_step" integer DEFAULT 1,
    "phone_verified_at" timestamp with time zone,
    "identity_verified_at" timestamp with time zone,
    "client_verification_status" "text" DEFAULT 'unverified'::"text",
    CONSTRAINT "profiles_identity_status_check" CHECK (("identity_status" = ANY (ARRAY['unverified'::"text", 'pending'::"text", 'verified'::"text", 'rejected'::"text", 'manual_review'::"text"]))),
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'blocked'::"text"]))),
    CONSTRAINT "profiles_user_type_check" CHECK (("user_type" = ANY (ARRAY['client'::"text", 'professional'::"text", 'company'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "match_score" numeric(8,4),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_matches_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'accepted'::"text", 'declined'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."request_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "service_id" "uuid",
    "address_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "urgency" "text" DEFAULT 'normal'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'classified'::"text", 'matching'::"text", 'matched'::"text", 'scheduled'::"text", 'cancelled'::"text", 'expired'::"text", 'completed'::"text"]))),
    CONSTRAINT "requests_urgency_check" CHECK (("urgency" = ANY (ARRAY['normal'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "comment" "text",
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "reviews_status_check" CHECK (("status" = ANY (ARRAY['published'::"text", 'hidden'::"text", 'under_review'::"text"])))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_price_guidelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "minimum_price" numeric(12,2) NOT NULL,
    "maximum_price" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'BRL'::"text" NOT NULL,
    "source" "text" DEFAULT 'vemgo'::"text" NOT NULL,
    "confidence" numeric(5,2),
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_until" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_price_guidelines_check" CHECK (("maximum_price" >= "minimum_price")),
    CONSTRAINT "service_price_guidelines_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (100)::numeric))),
    CONSTRAINT "service_price_guidelines_currency_check" CHECK (("currency" = 'BRL'::"text")),
    CONSTRAINT "service_price_guidelines_minimum_price_check" CHECK (("minimum_price" >= (0)::numeric)),
    CONSTRAINT "service_price_guidelines_source_check" CHECK (("source" = ANY (ARRAY['vemgo'::"text", 'ai'::"text", 'market'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."service_price_guidelines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'BRL'::"text" NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_until" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "professional_id" "uuid" NOT NULL,
    CONSTRAINT "service_prices_check" CHECK ((("valid_until" IS NULL) OR ("valid_until" > "valid_from"))),
    CONSTRAINT "service_prices_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "service_prices_price_non_negative" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."service_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "pricing_type" "text" DEFAULT 'fixed'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "services_pricing_type_check" CHECK (("pricing_type" = ANY (ARRAY['fixed'::"text", 'rule_based'::"text", 'visit'::"text", 'calculated'::"text", 'professional_defined'::"text"])))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid",
    "order_id" "uuid",
    "transaction_type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'BRL'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transactions_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "transactions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['charge'::"text", 'commission'::"text", 'payout'::"text", 'refund'::"text", 'adjustment'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_no_overlap_per_professional" EXCLUDE USING "gist" ("professional_id" WITH =, "tstzrange"("starts_at", "ends_at", '[)'::"text") WITH &&) WHERE (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text", 'in_progress'::"text"])));



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."identity_documents"
    ADD CONSTRAINT "identity_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."identity_verifications"
    ADD CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_acceptances"
    ADD CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_verification_codes"
    ADD CONSTRAINT "phone_verification_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_availability"
    ADD CONSTRAINT "professional_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_regions"
    ADD CONSTRAINT "professional_regions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_services"
    ADD CONSTRAINT "professional_services_pkey" PRIMARY KEY ("professional_id", "service_id");



ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_matches"
    ADD CONSTRAINT "request_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_matches"
    ADD CONSTRAINT "request_matches_request_id_professional_id_key" UNIQUE ("request_id", "professional_id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_client_id_key" UNIQUE ("order_id", "client_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_price_guidelines"
    ADD CONSTRAINT "service_price_guidelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_prices"
    ADD CONSTRAINT "service_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



CREATE INDEX "addresses_location_idx" ON "public"."addresses" USING "gist" ("location");



CREATE UNIQUE INDEX "addresses_one_default_per_profile_idx" ON "public"."addresses" USING "btree" ("profile_id") WHERE ("is_default" = true);



CREATE INDEX "addresses_profile_id_idx" ON "public"."addresses" USING "btree" ("profile_id");



CREATE INDEX "appointments_order_id_idx" ON "public"."appointments" USING "btree" ("order_id");



CREATE INDEX "appointments_starts_at_idx" ON "public"."appointments" USING "btree" ("starts_at");



CREATE INDEX "appointments_status_idx" ON "public"."appointments" USING "btree" ("status");



CREATE INDEX "audit_logs_actor_profile_id_idx" ON "public"."audit_logs" USING "btree" ("actor_profile_id");



CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "audit_logs_entity_idx" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "categories_active_order_idx" ON "public"."categories" USING "btree" ("is_active", "display_order");



CREATE INDEX "identity_documents_profile_id_idx" ON "public"."identity_documents" USING "btree" ("profile_id");



CREATE INDEX "identity_documents_status_idx" ON "public"."identity_documents" USING "btree" ("verification_status");



CREATE INDEX "identity_verifications_profile_id_idx" ON "public"."identity_verifications" USING "btree" ("profile_id");



CREATE INDEX "identity_verifications_status_idx" ON "public"."identity_verifications" USING "btree" ("status");



CREATE INDEX "idx_phone_verification_codes_expires" ON "public"."phone_verification_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_phone_verification_codes_phone" ON "public"."phone_verification_codes" USING "btree" ("phone");



CREATE INDEX "idx_phone_verification_codes_profile" ON "public"."phone_verification_codes" USING "btree" ("profile_id");



CREATE INDEX "idx_profiles_client_verification_status" ON "public"."profiles" USING "btree" ("client_verification_status");



CREATE INDEX "idx_profiles_identity_verified_at" ON "public"."profiles" USING "btree" ("identity_verified_at");



CREATE INDEX "idx_profiles_phone_verified_at" ON "public"."profiles" USING "btree" ("phone_verified_at");



CREATE INDEX "legal_acceptances_document_idx" ON "public"."legal_acceptances" USING "btree" ("document_type");



CREATE INDEX "legal_acceptances_user_id_idx" ON "public"."legal_acceptances" USING "btree" ("user_id");



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "notifications_profile_id_idx" ON "public"."notifications" USING "btree" ("profile_id");



CREATE INDEX "notifications_unread_idx" ON "public"."notifications" USING "btree" ("profile_id", "read_at");



CREATE INDEX "orders_client_id_idx" ON "public"."orders" USING "btree" ("client_id");



CREATE INDEX "orders_created_at_idx" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "orders_professional_id_idx" ON "public"."orders" USING "btree" ("professional_id");



CREATE INDEX "orders_request_id_idx" ON "public"."orders" USING "btree" ("request_id");



CREATE INDEX "orders_service_id_idx" ON "public"."orders" USING "btree" ("service_id");



CREATE INDEX "orders_status_idx" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "payments_order_id_idx" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "payments_provider_payment_id_idx" ON "public"."payments" USING "btree" ("provider_payment_id");



CREATE INDEX "payments_status_idx" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "professional_availability_day_idx" ON "public"."professional_availability" USING "btree" ("day_of_week");



CREATE INDEX "professional_availability_professional_idx" ON "public"."professional_availability" USING "btree" ("professional_id");



CREATE INDEX "professional_regions_active_idx" ON "public"."professional_regions" USING "btree" ("is_active");



CREATE INDEX "professional_regions_city_state_idx" ON "public"."professional_regions" USING "btree" ("city", "state");



CREATE INDEX "professional_regions_professional_idx" ON "public"."professional_regions" USING "btree" ("professional_id");



CREATE INDEX "professional_services_active_idx" ON "public"."professional_services" USING "btree" ("is_active");



CREATE INDEX "professional_services_service_id_idx" ON "public"."professional_services" USING "btree" ("service_id");



CREATE INDEX "professionals_service_status_idx" ON "public"."professionals" USING "btree" ("service_status");



CREATE INDEX "professionals_verification_status_idx" ON "public"."professionals" USING "btree" ("verification_status");



CREATE INDEX "profiles_identity_status_idx" ON "public"."profiles" USING "btree" ("identity_status");



CREATE INDEX "request_matches_professional_id_idx" ON "public"."request_matches" USING "btree" ("professional_id");



CREATE INDEX "request_matches_request_id_idx" ON "public"."request_matches" USING "btree" ("request_id");



CREATE INDEX "request_matches_status_idx" ON "public"."request_matches" USING "btree" ("status");



CREATE INDEX "requests_address_id_idx" ON "public"."requests" USING "btree" ("address_id");



CREATE INDEX "requests_client_id_idx" ON "public"."requests" USING "btree" ("client_id");



CREATE INDEX "requests_created_at_idx" ON "public"."requests" USING "btree" ("created_at" DESC);



CREATE INDEX "requests_service_id_idx" ON "public"."requests" USING "btree" ("service_id");



CREATE INDEX "requests_status_idx" ON "public"."requests" USING "btree" ("status");



CREATE INDEX "reviews_client_id_idx" ON "public"."reviews" USING "btree" ("client_id");



CREATE INDEX "reviews_professional_id_idx" ON "public"."reviews" USING "btree" ("professional_id");



CREATE INDEX "reviews_rating_idx" ON "public"."reviews" USING "btree" ("rating");



CREATE INDEX "service_price_guidelines_active_idx" ON "public"."service_price_guidelines" USING "btree" ("is_active");



CREATE INDEX "service_price_guidelines_service_id_idx" ON "public"."service_price_guidelines" USING "btree" ("service_id");



CREATE INDEX "service_prices_active_idx" ON "public"."service_prices" USING "btree" ("is_active");



CREATE UNIQUE INDEX "service_prices_professional_service_idx" ON "public"."service_prices" USING "btree" ("professional_id", "service_id") WHERE ("is_active" = true);



CREATE INDEX "service_prices_service_id_idx" ON "public"."service_prices" USING "btree" ("service_id");



CREATE INDEX "services_active_order_idx" ON "public"."services" USING "btree" ("is_active", "display_order");



CREATE INDEX "services_category_id_idx" ON "public"."services" USING "btree" ("category_id");



CREATE INDEX "transactions_order_id_idx" ON "public"."transactions" USING "btree" ("order_id");



CREATE INDEX "transactions_payment_id_idx" ON "public"."transactions" USING "btree" ("payment_id");



CREATE INDEX "transactions_status_idx" ON "public"."transactions" USING "btree" ("status");



CREATE INDEX "transactions_type_idx" ON "public"."transactions" USING "btree" ("transaction_type");



CREATE OR REPLACE TRIGGER "addresses_set_updated_at" BEFORE UPDATE ON "public"."addresses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "appointments_set_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "categories_set_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "clients_set_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "identity_documents_updated_at" BEFORE UPDATE ON "public"."identity_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "identity_verifications_updated_at" BEFORE UPDATE ON "public"."identity_verifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "orders_set_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "payments_set_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "professional_availability_set_updated_at" BEFORE UPDATE ON "public"."professional_availability" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "professional_regions_set_updated_at" BEFORE UPDATE ON "public"."professional_regions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "professional_services_set_updated_at" BEFORE UPDATE ON "public"."professional_services" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "professionals_set_updated_at" BEFORE UPDATE ON "public"."professionals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "request_matches_set_updated_at" BEFORE UPDATE ON "public"."request_matches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "requests_set_updated_at" BEFORE UPDATE ON "public"."requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "reviews_set_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "service_price_guidelines_updated_at" BEFORE UPDATE ON "public"."service_price_guidelines" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "service_prices_set_updated_at" BEFORE UPDATE ON "public"."service_prices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "services_set_slug" BEFORE INSERT ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."set_service_slug"();



CREATE OR REPLACE TRIGGER "services_set_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "transactions_set_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "validate_identity_document" BEFORE INSERT OR UPDATE ON "public"."identity_documents" FOR EACH ROW EXECUTE FUNCTION "public"."validate_identity_document"();



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."identity_documents"
    ADD CONSTRAINT "identity_documents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."identity_verifications"
    ADD CONSTRAINT "identity_verifications_identity_document_id_fkey" FOREIGN KEY ("identity_document_id") REFERENCES "public"."identity_documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."identity_verifications"
    ADD CONSTRAINT "identity_verifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."legal_acceptances"
    ADD CONSTRAINT "legal_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."phone_verification_codes"
    ADD CONSTRAINT "phone_verification_codes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_availability"
    ADD CONSTRAINT "professional_availability_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_regions"
    ADD CONSTRAINT "professional_regions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_services"
    ADD CONSTRAINT "professional_services_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_services"
    ADD CONSTRAINT "professional_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."professionals"
    ADD CONSTRAINT "professionals_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_matches"
    ADD CONSTRAINT "request_matches_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."request_matches"
    ADD CONSTRAINT "request_matches_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_price_guidelines"
    ADD CONSTRAINT "service_price_guidelines_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_prices"
    ADD CONSTRAINT "service_prices_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_prices"
    ADD CONSTRAINT "service_prices_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE RESTRICT;



CREATE POLICY "Users can insert their own legal acceptance" ON "public"."legal_acceptances" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own legal acceptance" ON "public"."legal_acceptances" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "addresses_delete_own" ON "public"."addresses" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "addresses_insert_own" ON "public"."addresses" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "addresses_select_assigned_order" ON "public"."addresses" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "o"."address_id"
   FROM "public"."orders" "o"
  WHERE ("o"."professional_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "addresses_select_own" ON "public"."addresses" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "addresses_update_own" ON "public"."addresses" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointments_insert_own_professional" ON "public"."appointments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "appointments"."order_id") AND ("o"."professional_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("o"."status" = 'confirmed'::"text")))));



CREATE POLICY "appointments_select_own_client" ON "public"."appointments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "appointments"."order_id") AND ("o"."client_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "appointments_select_own_professional" ON "public"."appointments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "appointments"."order_id") AND ("o"."professional_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_select_active" ON "public"."categories" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_select_own" ON "public"."clients" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."identity_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "identity_documents_insert_own_pending" ON "public"."identity_documents" FOR INSERT TO "authenticated" WITH CHECK ((("profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("verification_status" = 'pending'::"text") AND ("verification_provider" IS NULL) AND ("provider_reference" IS NULL) AND ("verified_at" IS NULL)));



CREATE POLICY "identity_documents_select_own" ON "public"."identity_documents" FOR SELECT TO "authenticated" USING (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "identity_documents_update_own_pending" ON "public"."identity_documents" FOR UPDATE TO "authenticated" USING ((("profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("verification_status" = 'pending'::"text"))) WITH CHECK ((("profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("verification_status" = 'pending'::"text") AND ("verification_provider" IS NULL) AND ("provider_reference" IS NULL) AND ("verified_at" IS NULL)));



ALTER TABLE "public"."identity_verifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "identity_verifications_insert_own_pending" ON "public"."identity_verifications" FOR INSERT TO "authenticated" WITH CHECK ((("profile_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'pending'::"text") AND ("provider" IS NULL) AND ("provider_reference" IS NULL) AND ("verified_at" IS NULL)));



CREATE POLICY "identity_verifications_select_own" ON "public"."identity_verifications" FOR SELECT TO "authenticated" USING (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."legal_acceptances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "legal_acceptances_insert_own" ON "public"."legal_acceptances" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_select_own_client" ON "public"."orders" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "client_id"));



CREATE POLICY "orders_select_own_professional" ON "public"."orders" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_select_own_client" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND ("o"."client_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."phone_verification_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."professional_availability" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "professional_availability_delete_own" ON "public"."professional_availability" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



CREATE POLICY "professional_availability_insert_own" ON "public"."professional_availability" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



CREATE POLICY "professional_availability_select_active" ON "public"."professional_availability" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "professional_availability_update_own" ON "public"."professional_availability" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



ALTER TABLE "public"."professional_regions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "professional_regions_delete_own" ON "public"."professional_regions" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



CREATE POLICY "professional_regions_insert_own" ON "public"."professional_regions" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



CREATE POLICY "professional_regions_select_own" ON "public"."professional_regions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



CREATE POLICY "professional_regions_update_own" ON "public"."professional_regions" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



ALTER TABLE "public"."professional_services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "professional_services_delete_own" ON "public"."professional_services" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



CREATE POLICY "professional_services_insert_own" ON "public"."professional_services" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



CREATE POLICY "professional_services_select_own" ON "public"."professional_services" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



CREATE POLICY "professional_services_update_own" ON "public"."professional_services" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



ALTER TABLE "public"."professionals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "professionals_insert_own" ON "public"."professionals" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "professionals_select_own" ON "public"."professionals" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "professionals_update_own" ON "public"."professionals" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_client_of_assigned_order" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "o"."client_id"
   FROM "public"."orders" "o"
  WHERE ("o"."professional_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."request_matches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_matches_select_own" ON "public"."request_matches" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



CREATE POLICY "request_matches_update_own" ON "public"."request_matches" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



ALTER TABLE "public"."requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "requests_insert_own" ON "public"."requests" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "client_id") AND (EXISTS ( SELECT 1
   FROM "public"."addresses" "a"
  WHERE (("a"."id" = "requests"."address_id") AND ("a"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "requests_select_matched_professional" ON "public"."requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."request_matches" "rm"
  WHERE (("rm"."request_id" = "requests"."id") AND ("rm"."professional_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "requests_select_own" ON "public"."requests" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "client_id"));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_insert_own_client" ON "public"."reviews" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "client_id") AND (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "reviews"."order_id") AND ("o"."client_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("o"."professional_id" = "reviews"."professional_id") AND ("o"."status" = 'completed'::"text"))))));



CREATE POLICY "reviews_select_own_client" ON "public"."reviews" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "client_id"));



CREATE POLICY "reviews_select_own_professional" ON "public"."reviews" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "professional_id"));



ALTER TABLE "public"."service_price_guidelines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_price_guidelines_select_active" ON "public"."service_price_guidelines" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."service_prices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_prices_delete_own" ON "public"."service_prices" FOR DELETE TO "authenticated" USING (("professional_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "service_prices_insert_own" ON "public"."service_prices" FOR INSERT TO "authenticated" WITH CHECK (("professional_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "service_prices_select_current" ON "public"."service_prices" FOR SELECT TO "authenticated" USING ((("is_active" = true) AND ("valid_from" <= "now"()) AND (("valid_until" IS NULL) OR ("valid_until" > "now"()))));



CREATE POLICY "service_prices_select_own" ON "public"."service_prices" FOR SELECT TO "authenticated" USING (("professional_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "service_prices_update_own" ON "public"."service_prices" FOR UPDATE TO "authenticated" USING (("professional_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("professional_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "services_select_active" ON "public"."services" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_get_professional_dossier"("p_professional_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_get_professional_dossier"("p_professional_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_list_pending_professionals"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_pending_professionals"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."classify_request"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."classify_request"("p_request_id" "uuid") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."appointments" TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_professional_appointment"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_professional_appointment"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_client_order_schedule"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_client_order_schedule"("p_order_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_client_request_matches"("p_request_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_pending_identity_verifications"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_pending_identity_verifications"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_pending_professionals"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_pending_professionals"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_professional_opportunities"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_professional_opportunities"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."handle_new_user_legal_acceptance"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."match_request"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."match_request"("p_request_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."request_appointment_slot"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_appointment_slot"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) TO "authenticated";



GRANT ALL ON FUNCTION "public"."request_phone_verification"("p_phone" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."reschedule_appointment_slot"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reschedule_appointment_slot"("p_order_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."respond_to_appointment_request"("p_appointment_id" "uuid", "p_decision" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."respond_to_appointment_request"("p_appointment_id" "uuid", "p_decision" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."respond_to_professional_opportunity"("p_match_id" "uuid", "p_decision" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."respond_to_professional_opportunity"("p_match_id" "uuid", "p_decision" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."review_identity_verification"("p_verification_id" "uuid", "p_decision" "text", "p_rejection_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."review_identity_verification"("p_verification_id" "uuid", "p_decision" "text", "p_rejection_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."review_professional"("p_professional_id" "uuid", "p_decision" "text", "p_rejection_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."review_professional"("p_professional_id" "uuid", "p_decision" "text", "p_rejection_reason" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."select_professional_for_request"("p_request_id" "uuid", "p_professional_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_profile_avatar_url"("p_avatar_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_profile_avatar_url"("p_avatar_url" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."submit_identity_for_review"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_identity_for_review"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."verify_phone_code"("p_code" "text") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."addresses" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_logs" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_logs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_logs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categories" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."clients" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."identity_documents" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."identity_documents" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."identity_documents" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."identity_verifications" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."identity_verifications" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."identity_verifications" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."legal_acceptances" TO "anon";
GRANT INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."legal_acceptances" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."legal_acceptances" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notifications" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."payments" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."phone_verification_codes" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."phone_verification_codes" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."phone_verification_codes" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."professional_availability" TO "anon";
GRANT ALL ON TABLE "public"."professional_availability" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."professional_availability" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."professional_regions" TO "anon";
GRANT ALL ON TABLE "public"."professional_regions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."professional_regions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."professional_services" TO "anon";
GRANT ALL ON TABLE "public"."professional_services" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."professional_services" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."professionals" TO "anon";
GRANT ALL ON TABLE "public"."professionals" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."professionals" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."request_matches" TO "anon";
GRANT ALL ON TABLE "public"."request_matches" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."request_matches" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."requests" TO "anon";
GRANT ALL ON TABLE "public"."requests" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."requests" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."reviews" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."service_price_guidelines" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."service_price_guidelines" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."service_price_guidelines" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."service_prices" TO "anon";
GRANT ALL ON TABLE "public"."service_prices" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."service_prices" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."services" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."transactions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";
