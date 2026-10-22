-- PROPOSTA PARA REVISÃO — NÃO É MIGRATION E NÃO FOI EXECUTADA.
--
-- Mantém assinatura, retorno, autorização, fluxo e auditoria da definição local.
-- As regras adicionais exigem conta ativa para aprovar e motivo para rejeitar.
-- Confirme a definição e as permissões remotas antes de usar.

BEGIN;

CREATE OR REPLACE FUNCTION public.review_professional(
  p_professional_id uuid,
  p_decision text,
  p_rejection_reason text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  professional_identity_status text;
  professional_account_status text;
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

  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decisão inválida.';
  END IF;

  IF p_decision = 'rejected'
     AND (
       p_rejection_reason IS NULL
       OR p_rejection_reason ~ '^[[:space:]]*$'
     ) THEN
    RAISE EXCEPTION 'Motivo da rejeição obrigatório.';
  END IF;

  SELECT pr.identity_status, pr.status
  INTO professional_identity_status, professional_account_status
  FROM public.profiles pr
  WHERE pr.id = p_professional_id
  FOR UPDATE OF pr;

  IF professional_identity_status IS NULL THEN
    RAISE EXCEPTION 'Profissional não encontrado.';
  END IF;

  IF p_decision = 'approved'
     AND professional_identity_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'O profissional só pode ser aprovado após a identidade ser verificada.';
  END IF;

  IF p_decision = 'approved'
     AND professional_account_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'O profissional só pode ser aprovado quando a conta estiver ativa.';
  END IF;

  IF p_decision = 'approved' THEN
    UPDATE public.professionals
    SET
      verification_status = 'approved',
      service_status = 'active',
      approved_at = now(),
      approved_by = current_user_id,
      rejection_reason = NULL,
      updated_at = now()
    WHERE id = p_professional_id;

    UPDATE public.profiles
    SET
      status = 'active',
      updated_at = now()
    WHERE id = p_professional_id;
  ELSE
    UPDATE public.professionals
    SET
      verification_status = 'rejected',
      service_status = 'inactive',
      approved_at = NULL,
      approved_by = NULL,
      rejection_reason = nullif(trim(p_rejection_reason), ''),
      updated_at = now()
    WHERE id = p_professional_id;
  END IF;

  INSERT INTO public.audit_logs (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    details
  )
  VALUES (
    current_user_id,
    CASE
      WHEN p_decision = 'approved' THEN 'professional_approved'
      ELSE 'professional_rejected'
    END,
    'professional',
    p_professional_id,
    jsonb_build_object(
      'decision', p_decision,
      'rejection_reason', nullif(trim(p_rejection_reason), '')
    )
  );
END;
$$;

ALTER FUNCTION public.review_professional(uuid, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.review_professional(uuid, text, text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.review_professional(uuid, text, text) TO authenticated;

COMMIT;
