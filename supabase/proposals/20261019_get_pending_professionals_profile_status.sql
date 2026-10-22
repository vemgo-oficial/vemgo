-- PROPOSTA PARA REVISÃO — NÃO É MIGRATION E NÃO FOI EXECUTADA.
--
-- Alterar o OUT/RETURNS TABLE de uma função existente não é suportado por
-- CREATE OR REPLACE FUNCTION no PostgreSQL. Antes de aplicar:
-- 1. confirme o contrato remoto e a definição implantada;
-- 2. verifique dependências da função no banco remoto;
-- 3. confirme janela e procedimento de implantação/rollback.
--
-- DROP é intencionalmente sem CASCADE: dependências devem fazer a operação
-- falhar para revisão, em vez de serem removidas automaticamente.

BEGIN;

DROP FUNCTION public.get_pending_professionals();

CREATE FUNCTION public.get_pending_professionals()
RETURNS TABLE (
  professional_id uuid,
  profile_id uuid,
  full_name text,
  identity_status text,
  verification_status text,
  service_status text,
  services_count bigint,
  prices_count bigint,
  regions_count bigint,
  availability_count bigint,
  profile_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles admin_profile
    WHERE admin_profile.id = current_user_id
      AND admin_profile.user_type = 'admin'
      AND admin_profile.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS professional_id,
    p.id AS profile_id,
    pr.full_name,
    pr.identity_status,
    p.verification_status,
    p.service_status,
    (
      SELECT count(*)
      FROM public.professional_services ps
      WHERE ps.professional_id = p.id
        AND ps.is_active = true
    ) AS services_count,
    (
      SELECT count(*)
      FROM public.service_prices sp
      WHERE sp.professional_id = p.id
        AND sp.is_active = true
        AND sp.valid_from <= now()
        AND (sp.valid_until IS NULL OR sp.valid_until > now())
    ) AS prices_count,
    (
      SELECT count(*)
      FROM public.professional_regions preg
      WHERE preg.professional_id = p.id
        AND preg.is_active = true
    ) AS regions_count,
    (
      SELECT count(*)
      FROM public.professional_availability pa
      WHERE pa.professional_id = p.id
        AND pa.is_active = true
    ) AS availability_count,
    pr.status AS profile_status
  FROM public.professionals p
  INNER JOIN public.profiles pr ON pr.id = p.id
  WHERE p.verification_status = 'pending'
  ORDER BY p.created_at ASC;
END;
$$;

ALTER FUNCTION public.get_pending_professionals() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_pending_professionals() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_pending_professionals() TO authenticated;

COMMIT;
