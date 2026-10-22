﻿"use client";



import Image from "next/image";



import { useEffect, useRef, useState } from "react";



import { useRouter } from "next/navigation";



import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Dialog } from "@/components/ui/Dialog";
import { useAccessibleDrawer, useDrawerInteractions } from "@/components/vemgo/useAccessibleDrawer";
import { PortalHeaderBar, PortalNavigationDrawer } from "@/components/vemgo/PortalLayout";
import AdminLiveMapPanel from "@/components/vemgo/AdminLiveMapPanel";



type Verification = {



  verification_id: string;



  profile_id: string;



  full_name: string;



  user_type: string;



  identity_status: string;



  document_id: string | null;



  document_type: string | null;



  document_number: string | null;



  document_front_path: string | null;



  document_back_path: string | null;



  selfie_path: string | null;



  verification_status: string;



  created_at: string;



};



type PendingProfessional = { id: string; display_name: string | null; verification_status: string; service_status: string; full_name: string; identity_status: string; account_status: string; };

type AdminPendingProfessionalRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  profile_status: string | null;
  identity_status: string | null;
  verification_status: string;
  service_status: string;
  created_at: string;
};

type AppointmentOutcomeReview = {
  order_id: string;
  appointment_id: string;
  service_name: string | null;
  client_name: string | null;
  professional_name: string | null;
  starts_at: string;
  ends_at: string;
  appointment_status: string;
  order_status: string;
  client_outcome: string;
  client_outcome_note: string | null;
  client_reported_at: string | null;
};

type ProfessionalDossier = {
  profile: { full_name: string | null; phone: string | null; user_type: string | null; status: string | null; identity_status: string | null; phone_verified_at: string | null; identity_verified_at: string | null; created_at: string | null } | null;
  professional: { display_name: string | null; bio: string | null; document_type: string | null; document_number: string | null; verification_status: string | null; service_status: string | null; is_accepting_calls: boolean | null; created_at: string | null; rejection_reason: string | null } | null;
  identity_documents: Array<{ document_type: string | null; document_number: string | null; verification_status: string | null; verification_provider: string | null; verified_at: string | null; rejection_reason: string | null; document_front_path: string | null; document_back_path: string | null; created_at: string | null }>;
  identity_verifications: Array<{ verification_type: string | null; status: string | null; provider: string | null; provider_reference: string | null; verified_at: string | null; rejection_reason: string | null; selfie_path: string | null; created_at: string | null }>;
  services: Array<{ code: string | null; name: string | null; description: string | null; is_active: boolean | null; price: number | null; currency: string | null; price_active: boolean | null; valid_from: string | null; valid_until: string | null }>;
  regions: Array<{ city: string | null; state: string | null; country: string | null; max_distance_km: number | null; is_active: boolean | null }>;
  availability: Array<{ day_of_week: number; start_time: string; end_time: string; is_active: boolean }>;
};

type SelectedVerification = Verification & {



  frontUrl: string | null;



  backUrl: string | null;



  selfieUrl: string | null;



};



function traduzirStatus(valor: string | null | undefined): string {
  if (!valor) return "Não informado";
  const chave = valor.trim().toLowerCase();
  const traducoes: Record<string, string> = {
    active: "Ativa",
    inactive: "Inativa",
    verified: "Verificada",
    unverified: "Não verificada",
    approved: "Aprovado",
    rejected: "Reprovado",
    pending: "Pendente",
    pending_review: "Aguardando análise",
    manual_review: "Análise manual",
    under_review: "Em análise",
    unknown: "Não identificado",
    professional: "Profissional",
    client: "Cliente",
    admin: "Administrador",
    suspended: "Suspensa",
    blocked: "Bloqueada",
    cancelled: "Cancelada",
    completed: "Concluída",
    failed: "Falhou",
    processing: "Em processamento",
  };
  return traducoes[chave] || valor;
}

export default function ControlePage() {



  const router = useRouter();



  const [loading, setLoading] = useState(true);



  const [loadingList, setLoadingList] = useState(false);



  const [saving, setSaving] = useState(false);



  const [adminName, setAdminName] = useState("Administrador");

  const [fullAdminName, setFullAdminName] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");

  const [avatarFailed, setAvatarFailed] = useState(false);

  const [profileEditorOpen, setProfileEditorOpen] = useState(false);

  const [appointmentOutcomeReviews, setAppointmentOutcomeReviews] = useState<AppointmentOutcomeReview[] | null>(null);
  const [loadingAppointmentOutcomeReviews, setLoadingAppointmentOutcomeReviews] = useState(false);
  const [appointmentOutcomeReviewError, setAppointmentOutcomeReviewError] = useState("");

  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuButtonRef = useRef<HTMLButtonElement>(null);
  const adminMenuInteractions = useDrawerInteractions(adminMenuOpen, setAdminMenuOpen);
  const adminMenuDialogRef = useAccessibleDrawer(adminMenuOpen, setAdminMenuOpen, adminMenuButtonRef, adminMenuInteractions.focusOnOpen, adminMenuInteractions.clearFocus);
  const [adminSearch, setAdminSearch] = useState("");

  const [profileNameDraft, setProfileNameDraft] = useState("");

  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);



  const [verifications, setVerifications] = useState<Verification[]>(



    [],



  );



  const [activeTab, setActiveTab] = useState<"identity" | "professionals">("identity");
  const [pendingProfessionals, setPendingProfessionals] = useState<PendingProfessional[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);
  const [professionalDecisionBusy, setProfessionalDecisionBusy] = useState<string | null>(null);
  const [professionalMessage, setProfessionalMessage] = useState("");
  const [professionalError, setProfessionalError] = useState("");
  const [dossierProfessional, setDossierProfessional] = useState<PendingProfessional | null>(null);
  const [professionalDossier, setProfessionalDossier] = useState<ProfessionalDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  const [selected, setSelected] =



    useState<SelectedVerification | null>(null);



  const [message, setMessage] = useState("");



  const [error, setError] = useState("");



  const [rejectionReason, setRejectionReason] = useState("");



  useEffect(() => {



    let cancelled = false;



    async function loadAdminAndVerifications() {



      const supabase = createSupabaseBrowserClient();



      const {



        data: { user },



      } = await supabase.auth.getUser();



      if (!user) {



        router.replace("/login");



        return;



      }



      const { data: profile, error: profileError } =



        await supabase



          .from("profiles")



          .select("full_name, avatar_url, user_type, status")



          .eq("id", user.id)



          .single();



      if (cancelled) {



        return;



      }



      if (



        profileError ||



        !profile ||



        profile.user_type !== "admin" ||



        profile.status !== "active"



      ) {



        router.replace("/login");



        return;



      }



      const fullName = profile.full_name?.trim() || "";

      setFullAdminName(fullName);

      setProfileNameDraft(fullName);

      setAdminName(fullName.split(/\s+/)[0] || "Administrador");



      const storedAvatar =

        typeof profile.avatar_url === "string" ? profile.avatar_url.trim() : "";



      if (storedAvatar) {

        if (storedAvatar.startsWith("http://") || storedAvatar.startsWith("https://")) {

          setAvatarUrl(storedAvatar);

        } else {

          const { data: signedData, error: signedError } = await supabase.storage

            .from("profile-photos")

            .createSignedUrl(storedAvatar, 3600);



          if (!cancelled && !signedError && signedData?.signedUrl) {

            setAvatarUrl(signedData.signedUrl);

          } else if (!cancelled) {

            setAvatarUrl("");

          }

        }

      } else {

        setAvatarUrl("");

      }



      setLoading(false);



      await loadVerifications();
      await loadPendingProfessionals();



    }



    async function loadVerifications() {



      setLoadingList(true);



      setError("");



      const supabase = createSupabaseBrowserClient();



      const {



        data,



        error: verificationError,



      } = await supabase.rpc(



        "get_pending_identity_verifications",



      );



      if (cancelled) {



        return;



      }



      if (verificationError) {



        setError(



          `Não foi possível carregar as verificações: ${verificationError.message}`,



        );



        setLoadingList(false);



        return;



      }



      setVerifications(



        (data as Verification[]) || [],



      );



      setLoadingList(false);



    }



    void Promise.resolve().then(



      loadAdminAndVerifications,



    );



    return () => {



      cancelled = true;



    };



  }, [router]);



  async function openVerification(



    verification: Verification,



  ) {



    setError("");



    setMessage("");



    const supabase = createSupabaseBrowserClient();



    let frontUrl: string | null = null;



    let backUrl: string | null = null;



    let selfieUrl: string | null = null;



    if (verification.document_front_path) {



      const { data, error } = await supabase.storage



        .from("identity-documents")



        .createSignedUrl(



          verification.document_front_path,



          600,



        );



      if (error) {



        setError(



          `Não foi possível abrir a frente do documento: ${error.message}`,



        );



        return;



      }



      frontUrl = data.signedUrl;



    }



    if (verification.document_back_path) {



      const { data, error } = await supabase.storage



        .from("identity-documents")



        .createSignedUrl(



          verification.document_back_path,



          600,



        );



      if (error) {



        setError(



          `Não foi possível abrir o verso do documento: ${error.message}`,



        );



        return;



      }



      backUrl = data.signedUrl;



    }



    if (verification.selfie_path) {



      const { data, error } = await supabase.storage



        .from("identity-documents")



        .createSignedUrl(



          verification.selfie_path,



          600,



        );



      if (error) {



        setError(



          `Não foi possível abrir a selfie: ${error.message}`,



        );



        return;



      }



      selfieUrl = data.signedUrl;



    }



    setSelected({



      ...verification,



      frontUrl,



      backUrl,



      selfieUrl,



    });



    setRejectionReason("");



  }



  async function handleDecision(



    decision:



      | "approved"



      | "rejected"



      | "manual_review",



  ) {



    if (!selected) {



      return;



    }



    setError("");



    setMessage("");



    if (



      decision === "rejected" &&



      !rejectionReason.trim()



    ) {



      setError(



        "Informe o motivo da reprovação.",



      );



      return;



    }



    setSaving(true);



    const supabase = createSupabaseBrowserClient();



    const { error: decisionError } =



      await supabase.rpc(



        "review_identity_verification",



        {



          p_verification_id:



            selected.verification_id,



          p_decision: decision,



          p_rejection_reason:



            decision === "rejected"



              ? rejectionReason.trim()



              : null,



        },



      );



    if (decisionError) {



      setError(



        `Não foi possível registrar a decisão: ${decisionError.message}`,



      );



      setSaving(false);



      return;



    }



    let successMessage =



      "Decisão registrada com sucesso.";



    if (decision === "approved") {



      successMessage =



        "Identidade aprovada com sucesso.";



    }



    if (decision === "rejected") {



      successMessage =



        "Identidade reprovada com sucesso.";



    }



    if (decision === "manual_review") {



      successMessage =



        "Identidade enviada para análise manual.";



    }



    setMessage(successMessage);



    setVerifications((current) =>



      current.filter(



        (item) =>



          item.verification_id !==



          selected.verification_id,



      ),



    );



    setSelected(null);



    setRejectionReason("");



    setSaving(false);



  }



  async function handleSaveProfile() {

    const trimmedName = profileNameDraft.trim();

    if (!trimmedName) {

      setError("Informe seu nome completo.");

      return;

    }

    setError("");

    setMessage("");

    setSavingProfile(true);

    const supabase = createSupabaseBrowserClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {

      setError("Sua sessão expirou. Entre novamente para editar seu perfil.");

      setSavingProfile(false);

      return;

    }

    let avatarPath: string | null = null;

    if (profilePhotoFile) {

      const extension = profilePhotoFile.name.split(".").pop()?.toLowerCase() || "jpg";

      if (!["jpg", "jpeg", "png", "webp"].includes(extension)) {

        setError("Use uma imagem JPG, PNG ou WEBP.");

        setSavingProfile(false);

        return;

      }

      if (profilePhotoFile.size > 5 * 1024 * 1024) {

        setError("A foto deve ter no máximo 5 MB.");

        setSavingProfile(false);

        return;

      }

      avatarPath = `${user.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(avatarPath, profilePhotoFile, {

        upsert: true,

        contentType: profilePhotoFile.type || "image/jpeg",

      });

      if (uploadError) {

        setError(`Não foi possível enviar a foto: ${uploadError.message}`);

        setSavingProfile(false);

        return;

      }

    }

    const updates: { full_name: string; avatar_url?: string } = { full_name: trimmedName };

    if (avatarPath) updates.avatar_url = avatarPath;

    const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", user.id);

    if (updateError) {

      setError(`Não foi possível salvar o perfil: ${updateError.message}`);

      setSavingProfile(false);

      return;

    }

    setFullAdminName(trimmedName);

    setAdminName(trimmedName.split(/\s+/)[0] || "Administrador");

    if (avatarPath) {

      const { data: signedData, error: signedError } = await supabase.storage.from("profile-photos").createSignedUrl(avatarPath, 3600);

      if (!signedError && signedData?.signedUrl) {

        setAvatarUrl(signedData.signedUrl);

        setAvatarFailed(false);

      }

    }

    setProfilePhotoFile(null);

    setProfileEditorOpen(false);

    setMessage("Perfil administrativo atualizado com sucesso.");

    setSavingProfile(false);

  }



  async function loadPendingProfessionals(): Promise<boolean> {
    setLoadingProfessionals(true);
    setProfessionalError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: listError } = await supabase.rpc(
        "admin_list_pending_professionals",
      );

      if (listError) {
        setProfessionalError(
          `Não foi possível carregar os profissionais: ${listError.message}`,
        );
        return false;
      }

      const rows: PendingProfessional[] = (data ?? []).map((row: AdminPendingProfessionalRow) => ({
        id: row.id,
        display_name: row.display_name,
        verification_status: row.verification_status,
        service_status: row.service_status,
        full_name: row.full_name || row.display_name || "Profissional sem nome",
        identity_status: row.identity_status || "unknown",
        account_status: row.profile_status || "unknown",
      }));

      setPendingProfessionals(rows);
      return true;
    } catch (cause) {
      const detail =
        cause instanceof Error ? cause.message : "Erro inesperado.";
      setProfessionalError(
        `Não foi possível carregar os profissionais: ${detail}`,
      );
      return false;
    } finally {
      setLoadingProfessionals(false);
    }
  }

  async function openProfessionalDossier(pro: PendingProfessional) {
    setDossierProfessional(pro);
    setProfessionalDossier(null);
    setProfessionalError("");
    setLoadingDossier(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: dossierError } = await supabase.rpc("admin_get_professional_dossier", { p_professional_id: pro.id });
      if (dossierError) throw dossierError;
      setProfessionalDossier((data ?? null) as ProfessionalDossier | null);
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Erro inesperado.";
      setProfessionalError(`Não foi possível carregar o dossiê: ${detail}`);
    } finally {
      setLoadingDossier(false);
    }
  }

  function formatDayOfWeek(day: number) {
    return ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][day] ?? `Dia ${day}`;
  }

  async function handleProfessionalDecision(id: string, decision: "approved" | "rejected") {
    if (professionalDecisionBusy === id) return;
    setProfessionalError(""); setProfessionalMessage("");
    let reason: string | null = null;
    if (decision === "rejected") { reason = window.prompt("Informe o motivo da reprovação:")?.trim() || null; if (!reason) { setProfessionalError("Reprovação cancelada: é necessário informar o motivo."); return; } }
    setProfessionalDecisionBusy(id);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: rpcError } = await supabase.rpc("review_professional", { p_professional_id: id, p_decision: decision, p_rejection_reason: reason });
      if (rpcError) {
        setProfessionalError(`Não foi possível confirmar a decisão: ${rpcError.message} Atualize a lista antes de tentar novamente.`);
        return;
      }

      const refreshed = await loadPendingProfessionals();
      setProfessionalMessage(refreshed
        ? decision === "approved" ? "Profissional aprovado e ativado." : "Profissional reprovado e desativado."
        : "A decisão foi registrada, mas a lista não pôde ser atualizada. Atualize antes de continuar.");
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Erro inesperado.";
      setProfessionalError(`Não foi possível confirmar o resultado da decisão. Atualize a lista antes de tentar novamente. ${detail}`);
    } finally {
      setProfessionalDecisionBusy(null);
    }
  }

  async function handleLogout() {



    const supabase = createSupabaseBrowserClient();



    await supabase.auth.signOut();



    router.replace("/login");



  }



  if (loading) {



    return (



      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">



        <p className="text-sm text-zinc-400">



          Carregando VemGO Control...



        </p>



      </main>



    );



  }



  return (



    <main className="min-h-screen bg-zinc-950 text-white">\n      <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 md:px-6"><AdminLiveMapPanel /></div>



      <PortalHeaderBar role="admin" menuOpen={adminMenuOpen} menuButtonRef={adminMenuButtonRef} interactions={adminMenuInteractions}>
          <div className="hidden min-w-0 flex-1 md:block">
            <label className="flex h-10 max-w-[520px] items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 text-zinc-400 transition focus-within:border-blue-500/60 focus-within:bg-zinc-900">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg>
              <input value={adminSearch} onChange={(event) => { setAdminSearch(event.target.value); if (event.target.value.trim()) { adminMenuInteractions.clearFocus(); setAdminMenuOpen(true); } }} onFocus={() => { if (adminSearch.trim()) { adminMenuInteractions.clearFocus(); setAdminMenuOpen(true); } }} onKeyDown={(event) => { if (event.key === "Escape") { setAdminSearch(""); adminMenuInteractions.clearFocus(); setAdminMenuOpen(false); } else if (event.key === "Enter") { adminMenuInteractions.clearFocus(); setAdminMenuOpen(true); } }} placeholder="Filtrar itens do menu administrativo..." aria-label="Filtrar itens do menu administrativo" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500" />
              {adminSearch && <button type="button" onClick={() => setAdminSearch("")} aria-label="Limpar pesquisa" className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-white">Limpar</button>}
            </label>
          </div>

          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 sm:gap-4">
            <button type="button" onClick={() => { setProfileNameDraft(fullAdminName); setProfilePhotoFile(null); setProfileEditorOpen(true); }} aria-label="Editar foto e perfil do administrador" title="Editar perfil" className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-950 transition hover:border-blue-500 sm:h-11 sm:w-11">
              {avatarUrl && !avatarFailed ? <Image src={avatarUrl} alt="Foto do administrador" width={44} height={44} unoptimized className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} /> : <span className="text-lg font-bold text-blue-400">{adminName.charAt(0).toUpperCase() || "A"}</span>}
            </button>
            <div className="hidden min-w-0 leading-tight sm:block">
              <p className="text-[10px] font-medium text-blue-400 sm:text-[11px]">VemGO Control</p>
              <p className="max-w-[150px] truncate text-sm font-bold text-white sm:max-w-none sm:text-sm">Olá, {adminName}!</p>
              <p className="mt-0.5 text-[11px] text-zinc-400 sm:text-xs">Administrador</p>
            </div>
            <button type="button" onClick={handleLogout} aria-label="Sair da conta administrativa" title="Sair" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>
            </button>
          </div>
      </PortalHeaderBar>

      <PortalNavigationDrawer role="admin" open={adminMenuOpen} onClose={() => { adminMenuInteractions.clearFocus(); setAdminMenuOpen(false); setAdminSearch(""); }} menuRef={adminMenuDialogRef} interactions={adminMenuInteractions}>
            <div className="flex min-h-[82px] items-center justify-between border-b border-zinc-800 px-5">
              <div className="min-w-0">
                <p className="text-lg font-black tracking-tight text-white">VEM<span className="text-blue-500">GO</span></p>
                <p className="ml-1 text-xs font-bold tracking-[0.2em] text-blue-400">CONTROL</p>
              </div>
              <button type="button" onClick={() => { adminMenuInteractions.clearFocus(); setAdminMenuOpen(false); setAdminSearch(""); }} aria-label="Fechar menu" className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
            </div>
            <div className="border-b border-zinc-800 p-3 md:hidden">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-zinc-400"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg><input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Filtrar itens do menu..." aria-label="Filtrar itens do menu" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500" /></label>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {[
                { label: "Início", icon: "⌂", active: true, action: "home" },
                { label: "Solicitações", icon: "▤", action: "soon" },
                { label: "Profissionais", icon: "♙", action: "professionals" },
                { label: "Clientes", icon: "♧", action: "soon" },
                { label: "Serviços e Preços", icon: "♢", action: "soon" },
                { label: "Pedidos / Chamados", icon: "◷", action: "soon" },
                { label: "Financeiro", icon: "$", action: "soon" },
                { label: "Conteúdo e Páginas", icon: "▱", action: "soon" },
                { label: "Mídia (Fotos e Vídeos)", icon: "▣", action: "soon" },
                { label: "Notificações", icon: "♧", action: "soon" },
                { label: "Relatórios", icon: "▥", action: "soon" },
                { label: "Configurações", icon: "⚙", action: "soon" },
                { label: "Documentos e Conformidade", icon: "▤", action: "soon" },
                { label: "Termos e Políticas", icon: "▧", action: "soon" },
                { label: "LGPD", icon: "♢", action: "soon" },
                { label: "Suporte", icon: "♧", action: "soon" },
                { label: "Ajuda", icon: "?", action: "soon" },
              ].filter((item) => item.label.toLowerCase().includes(adminSearch.trim().toLowerCase())).map((item) => (
                <button key={item.label} type="button" disabled={item.action === "soon"} title={item.action === "soon" ? "Módulo ainda não implementado" : item.label} onClick={() => { if (item.action === "home") { router.push("/controle"); adminMenuInteractions.clearFocus(); setAdminMenuOpen(false); setAdminSearch(""); } else if (item.action === "professionals") { setActiveTab("professionals"); document.getElementById("admin-approvals")?.scrollIntoView({ behavior: "smooth", block: "start" }); adminMenuInteractions.clearFocus(); setAdminMenuOpen(false); setAdminSearch(""); } }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition motion-reduce:transition-none ${item.active ? "bg-gradient-to-r from-blue-600 to-sky-500 font-semibold text-white shadow-lg shadow-blue-950/30" : item.action === "soon" ? "cursor-not-allowed text-zinc-500/80" : "text-zinc-200 hover:bg-blue-500/10 hover:text-blue-300"}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center text-lg ${item.active ? "text-white" : "text-blue-300"}`}>{item.icon}</span><span className="min-w-0 flex-1">{item.label}</span>{item.action === "soon" && <span className="text-[9px] uppercase tracking-wide text-zinc-600">Em breve</span>}
                </button>
              ))}
              <div className="my-3 border-t border-zinc-800" />
              <button type="button" onClick={() => { setProfileNameDraft(fullAdminName); setProfilePhotoFile(null); setProfileEditorOpen(true); adminMenuInteractions.clearFocus(); setAdminMenuOpen(false); setAdminSearch(""); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-200 transition hover:bg-blue-500/10 hover:text-blue-300"><span className="flex h-6 w-6 items-center justify-center text-lg text-blue-300">♙</span>Meu perfil</button>
            </nav>
            <div className="border-t border-zinc-800 px-5 py-4"><p className="text-xs font-semibold text-zinc-300">VemGO Control</p><p className="mt-1 text-[10px] text-zinc-600">Área administrativa • Acesso restrito</p></div>
      </PortalNavigationDrawer>


      <section className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Painel administrativo</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2.1rem]">Visão geral</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-zinc-400">Acompanhe os indicadores disponíveis e acesse os controles da operação VemGO.</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[11px] text-zinc-400 sm:self-auto"><svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 text-sky-400" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 4.8v.1" strokeLinecap="round"/></svg> Indicadores conectados ao sistema</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <button type="button" onClick={() => { setActiveTab("professionals"); document.getElementById("admin-approvals")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="group min-h-[132px] rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-950/60 via-[#0d1722] to-[#101317] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:border-sky-400/50">
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-zinc-300">Profissionais</span><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-300"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M16 5.5a3 3 0 0 1 0 5.8M17 14a4 4 0 0 1 3.5 4v2"/></svg></span></div>
            <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-white">{pendingProfessionals.length}</div><p className="mt-2 text-xs text-sky-300/90">Aguardando aprovação <span className="text-sky-400">· Ver fila →</span></p>
          </button>
          <div className="min-h-[132px] rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-[#101114] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"><div className="flex items-center justify-between"><span className="text-sm font-medium text-zinc-300">Clientes</span><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700/70 bg-black/20 text-zinc-400"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M17 9h4M19 7v4"/></svg></span></div><div className="mt-3 text-2xl font-semibold leading-none text-zinc-500">—</div><p className="mt-2 text-xs text-zinc-500">Integração pendente · Contagem indisponível</p></div>
          <div className="min-h-[132px] rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-[#101114] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"><div className="flex items-center justify-between"><span className="text-sm font-medium text-zinc-300">Chamados hoje</span><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700/70 bg-black/20 text-zinc-400"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="3.5" width="15" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg></span></div><div className="mt-3 text-2xl font-semibold leading-none text-zinc-500">—</div><p className="mt-2 text-xs text-zinc-500">Integração pendente · Dados operacionais indisponíveis</p></div>
          <div className="min-h-[132px] rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-[#101114] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"><div className="flex items-center justify-between"><span className="text-sm font-medium text-zinc-300">Faturamento do mês</span><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700/70 bg-black/20 text-zinc-400"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M17 7.5c-.7-1-2-1.5-4-1.5-2.2 0-3.5 1-3.5 2.5S11 11 13 11.5s3.5 1 3.5 2.8S15 17 12.5 17c-2 0-3.5-.6-4.5-1.8"/></svg></span></div><div className="mt-3 text-2xl font-semibold leading-none text-zinc-500">—</div><p className="mt-2 text-xs text-zinc-500">Integração pendente · Dados financeiros indisponíveis</p></div>
          <div className="min-h-[132px] rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-[#101114] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"><div className="flex items-center justify-between"><span className="text-sm font-medium text-zinc-300">Taxa de conclusão</span><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700/70 bg-black/20 text-zinc-400"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.2 4.2L19 7"/><circle cx="12" cy="12" r="9"/></svg></span></div><div className="mt-3 text-2xl font-semibold leading-none text-zinc-500">—</div><p className="mt-2 text-xs text-zinc-500">Integração pendente · Histórico indisponível</p></div>
        </div>

        <section aria-labelledby="welcome-title" className="overflow-hidden rounded-2xl border border-sky-900/60 bg-[#0a111a] shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center lg:gap-8 lg:p-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400">Central de gestão</p>
              <h2 id="welcome-title" className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-[2.7rem]">Bem-vindo ao <span className="text-sky-400">VemGO CONTROL</span></h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-[15px]">Cadastros, autorizações e recursos da plataforma reunidos em um só lugar.</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-black/25 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">Fila de autorizações</p><p className="mt-1 text-xs text-zinc-500">Pendências carregadas do sistema</p></div><span className="rounded-full border border-sky-500/20 bg-sky-500/[0.08] px-2.5 py-1 text-[10px] font-medium text-sky-300">Em análise</span></div>
              <div className="my-4 border-t border-zinc-800/80" />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3"><span className="text-sm text-zinc-400">Verificações de identidade</span><span className="min-w-8 rounded-lg bg-zinc-800/80 px-2 py-1 text-center text-sm font-semibold tabular-nums text-white">{verifications.length}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm text-zinc-400">Profissionais pendentes</span><span className="min-w-8 rounded-lg bg-zinc-800/80 px-2 py-1 text-center text-sm font-semibold tabular-nums text-white">{pendingProfessionals.length}</span></div>
              </div>
              <button type="button" onClick={() => { setActiveTab("identity"); document.getElementById("admin-approvals")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="mt-4 flex w-full items-center justify-between rounded-lg border border-sky-500/25 bg-sky-500/[0.07] px-3 py-2.5 text-xs font-semibold text-sky-200 transition hover:border-sky-400/50 hover:bg-sky-500/[0.12]">Abrir autorizações <span aria-hidden="true">→</span></button>
            </div>
          </div>
        </section>

        <section aria-labelledby="modules-title" className="rounded-2xl border border-zinc-800 bg-[#0e0f12] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Navegação rápida</p><h2 id="modules-title" className="mt-1 text-base font-semibold text-white">Módulos administrativos</h2></div><span className="text-[11px] text-zinc-500">Acesso aos recursos do Control</span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <button type="button" disabled title="Módulo ainda não implementado" className="group flex min-h-[88px] flex-col justify-between rounded-xl border border-zinc-800/90 bg-black/20 p-3 text-left transition disabled:cursor-not-allowed sm:p-3.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4.5h14v15H5zM8 8h8M8 12h8M8 16h5"/></svg></span><span className="mt-3 flex w-full items-center justify-between gap-1 text-xs font-medium text-zinc-400">Conteúdo <small className="text-[9px] font-medium text-zinc-600">Em breve</small></span></button>
            <button type="button" onClick={() => { setActiveTab("identity"); document.getElementById("admin-approvals")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="group flex min-h-[88px] flex-col justify-between rounded-xl border border-sky-500/30 bg-sky-500/[0.07] p-3 text-left transition hover:border-sky-400/50 hover:bg-sky-500/[0.1] sm:p-3.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-400/10 text-sky-300"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5 19 6v5.2c0 4.4-2.7 7.3-7 9.3-4.3-2-7-4.9-7-9.3V6l7-2.5Z"/><path d="m9 12 2 2 4-4"/></svg></span><span className="mt-3 flex w-full items-center justify-between gap-1 text-xs font-semibold text-white">Autorizações <small className="text-[9px] font-medium text-sky-300">Disponível</small></span></button>
            <button type="button" disabled title="Integração financeira pendente" className="group flex min-h-[88px] flex-col justify-between rounded-xl border border-zinc-800/90 bg-black/20 p-3 text-left transition disabled:cursor-not-allowed sm:p-3.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M17 7.5c-.7-1-2-1.5-4-1.5-2.2 0-3.5 1-3.5 2.5S11 11 13 11.5s3.5 1 3.5 2.8S15 17 12.5 17c-2 0-3.5-.6-4.5-1.8"/></svg></span><span className="mt-3 flex w-full items-center justify-between gap-1 text-xs font-medium text-zinc-400">Financeiro <small className="text-[9px] font-medium text-zinc-600">Pendente</small></span></button>
            <button type="button" onClick={() => { setActiveTab("professionals"); document.getElementById("admin-approvals")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="group flex min-h-[88px] flex-col justify-between rounded-xl border border-zinc-800/90 bg-black/20 p-3 text-left transition hover:border-sky-500/30 hover:bg-sky-500/[0.04] sm:p-3.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900 text-sky-300"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M16 5.5a3 3 0 0 1 0 5.8M17 14a4 4 0 0 1 3.5 4v2"/></svg></span><span className="mt-3 flex w-full items-center justify-between gap-1 text-xs font-medium text-zinc-200">Profissionais <small className="text-[9px] font-medium text-sky-300">Disponível</small></span></button>
            <button type="button" disabled title="Integração de clientes pendente" className="group flex min-h-[88px] flex-col justify-between rounded-xl border border-zinc-800/90 bg-black/20 p-3 text-left transition disabled:cursor-not-allowed sm:p-3.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M15 15a4 4 0 0 1 5.5 3.5V20"/></svg></span><span className="mt-3 flex w-full items-center justify-between gap-1 text-xs font-medium text-zinc-400">Clientes <small className="text-[9px] font-medium text-zinc-600">Pendente</small></span></button>
            <button type="button" disabled title="Módulo ainda não implementado" className="group flex min-h-[88px] flex-col justify-between rounded-xl border border-zinc-800/90 bg-black/20 p-3 text-left transition disabled:cursor-not-allowed sm:p-3.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5V5.8a1.8 1.8 0 0 1 1.8-1.8H20v15.5H5.8A1.8 1.8 0 0 0 4 21M8 8h8M8 12h8M8 16h5"/></svg></span><span className="mt-3 flex w-full items-center justify-between gap-1 text-xs font-medium text-zinc-400">Relatórios <small className="text-[9px] font-medium text-zinc-600">Em breve</small></span></button>
          </div>
        </section>

        <section aria-labelledby="quick-actions-title" className="rounded-2xl border border-zinc-800 bg-[#0e0f12] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Operação</p><h2 id="quick-actions-title" className="mt-1 text-base font-semibold text-white">Ações rápidas</h2></div><span className="text-[11px] text-zinc-500">Atalhos de administração</span></div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
            <button type="button" disabled title="Módulo de conteúdo ainda não implementado" className="flex min-h-[92px] flex-col justify-between rounded-xl border border-zinc-800 bg-black/20 p-3 text-left transition disabled:cursor-not-allowed"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span><span className="mt-3 text-xs font-medium text-zinc-400">Nova página <small className="mt-0.5 block text-[10px] font-normal text-zinc-600">Em breve</small></span></button>
            <button type="button" disabled title="Módulo de conteúdo ainda não implementado" className="flex min-h-[92px] flex-col justify-between rounded-xl border border-zinc-800 bg-black/20 p-3 text-left transition disabled:cursor-not-allowed"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"/></svg></span><span className="mt-3 text-xs font-medium text-zinc-400">Novo post <small className="mt-0.5 block text-[10px] font-normal text-zinc-600">Em breve</small></span></button>
            <button type="button" disabled title="Módulo de mídia ainda não implementado" className="flex min-h-[92px] flex-col justify-between rounded-xl border border-zinc-800 bg-black/20 p-3 text-left transition disabled:cursor-not-allowed"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m20.5 15-5-5L6 19.5"/></svg></span><span className="mt-3 text-xs font-medium text-zinc-400">Subir imagem/vídeo <small className="mt-0.5 block text-[10px] font-normal text-zinc-600">Em breve</small></span></button>
            <button type="button" onClick={() => { setActiveTab("professionals"); document.getElementById("admin-approvals")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="flex min-h-[92px] flex-col justify-between rounded-xl border border-sky-500/25 bg-sky-500/[0.045] p-3 text-left transition hover:border-sky-400/50 hover:bg-sky-500/[0.08]"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-300"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M17 9h4M19 7v4"/></svg></span><span className="mt-3 text-xs font-medium text-zinc-100">Autorizar profissional <small className="mt-0.5 block text-[10px] font-normal text-sky-300">Abrir fila →</small></span></button>
            <button type="button" onClick={() => { setActiveTab("identity"); document.getElementById("admin-approvals")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="flex min-h-[92px] flex-col justify-between rounded-xl border border-sky-500/25 bg-sky-500/[0.045] p-3 text-left transition hover:border-sky-400/50 hover:bg-sky-500/[0.08]"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-300"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M17 9h4M19 7v4"/></svg></span><span className="mt-3 text-xs font-medium text-zinc-100">Autorizar cliente <small className="mt-0.5 block text-[10px] font-normal text-sky-300">Revisar identidade →</small></span></button>
            <button type="button" disabled title="Cadastro administrativo de serviços ainda não implementado" className="flex min-h-[92px] flex-col justify-between rounded-xl border border-zinc-800 bg-black/20 p-3 text-left transition disabled:cursor-not-allowed"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5Z"/><path d="M12 8v8M8 12h8"/></svg></span><span className="mt-3 text-xs font-medium text-zinc-400">Adicionar serviço <small className="mt-0.5 block text-[10px] font-normal text-zinc-600">Em breve</small></span></button>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-3">
          <section aria-labelledby="calls-week-title" className="rounded-2xl border border-zinc-800 bg-[#0e0f12] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 id="calls-week-title" className="text-sm font-semibold text-white">Chamados nos últimos sete dias</h2><p className="mt-1 text-xs text-zinc-500">Volume diário</p></div><span className="shrink-0 rounded-full border border-zinc-800 bg-black/20 px-2.5 py-1 text-[10px] text-zinc-500">Integração pendente</span></div>
            <div className="mt-4 flex min-h-[132px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/90 bg-black/15 px-4 text-center"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5h16M6.5 16l4-4 3 2.5 5-6"/><path d="M16 8.5h2.5V11"/></svg></span><p className="mt-3 text-sm font-medium text-zinc-300">Histórico indisponível</p><p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500">O volume será exibido quando a integração de chamados estiver disponível.</p></div>
          </section>
          <section aria-labelledby="call-status-title" className="rounded-2xl border border-zinc-800 bg-[#0e0f12] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 id="call-status-title" className="text-sm font-semibold text-white">Status dos chamados</h2><p className="mt-1 text-xs text-zinc-500">Visão atual da operação</p></div><span className="shrink-0 rounded-full border border-zinc-800 bg-black/20 px-2.5 py-1 text-[10px] text-zinc-500">Integração pendente</span></div>
            <div className="mt-4 flex min-h-[132px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/90 bg-black/15 px-4 text-center"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v8.5l6 6"/></svg></span><p className="mt-3 text-sm font-medium text-zinc-300">Sem dados de status</p><p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500">Nenhuma contagem ou proporção será mostrada até haver dados confirmados.</p></div>
          </section>
          <section aria-labelledby="activity-title" className="rounded-2xl border border-zinc-800 bg-[#0e0f12] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 id="activity-title" className="text-sm font-semibold text-white">Atividade em tempo real</h2><p className="mt-1 text-xs text-zinc-500">Atualizações da plataforma</p></div><span className="shrink-0 rounded-full border border-zinc-800 bg-black/20 px-2.5 py-1 text-[10px] text-zinc-500">Integração pendente</span></div>
            <div className="mt-4 flex min-h-[132px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/90 bg-black/15 px-4 text-center"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18.5h16M6.5 15l3-3 2.5 2 5.5-6"/><circle cx="17.5" cy="8" r="1.5"/></svg></span><p className="mt-3 text-sm font-medium text-zinc-300">Feed ainda não conectado</p><p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500">Eventos recentes aparecerão aqui quando houver uma fonte confirmada.</p></div>
          </section>
        </div>

        <section aria-labelledby="recent-lists-title" className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#0e0f12]">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-zinc-800/80 px-4 py-4 sm:px-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Acompanhamento</p><h2 id="recent-lists-title" className="mt-1 text-base font-semibold text-white">Atividade recente</h2></div><span className="text-[11px] text-zinc-500">Listas operacionais</span></div>
          <div className="grid divide-y divide-zinc-800/80 md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium text-zinc-200">Últimas solicitações</h3><span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[9px] text-zinc-500">Pendente</span></div><div className="mt-3 flex min-h-[76px] items-center gap-3 rounded-xl bg-black/20 px-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3.5h8l4 4v13H6zM14 3.5v4h4M9 12h6M9 15.5h6"/></svg></span><p className="text-xs leading-5 text-zinc-500">A lista de solicitações ainda não está conectada.</p></div></div>
            <div className="p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium text-zinc-200">Últimos chamados</h3><span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[9px] text-zinc-500">Pendente</span></div><div className="mt-3 flex min-h-[76px] items-center gap-3 rounded-xl bg-black/20 px-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg></span><p className="text-xs leading-5 text-zinc-500">A lista de chamados ainda não está conectada.</p></div></div>
            <div className="p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium text-zinc-200">Conteúdo recente</h3><span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[9px] text-zinc-500">Em breve</span></div><div className="mt-3 flex min-h-[76px] items-center gap-3 rounded-xl bg-black/20 px-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="4" width="15" height="16" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></span><p className="text-xs leading-5 text-zinc-500">O gerenciamento de conteúdo ainda não está implementado.</p></div></div>
          </div>
        </section>
      </section>

      <section aria-labelledby="appointment-outcome-review-title" className="mx-auto max-w-[1600px] px-4 pb-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-500/20 bg-[#0e1115] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">Acompanhamento de serviços</p>
              <h2 id="appointment-outcome-review-title" className="mt-1 text-base font-semibold text-white">Relatos que precisam de revisão</h2>
              <p className="mt-1 text-xs text-zinc-400">Não comparecimento e problemas relatados pelo cliente. Esta lista não aplica penalidades nem decide responsabilidade.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setLoadingAppointmentOutcomeReviews(true);
                setAppointmentOutcomeReviewError("");
                try {
                  const supabase = createSupabaseBrowserClient();
                  const { data, error: reviewError } = await supabase.rpc("admin_get_appointment_outcome_reviews");
                  if (reviewError) throw reviewError;
                  setAppointmentOutcomeReviews((data ?? []) as AppointmentOutcomeReview[]);
                } catch (reviewError) {
                  setAppointmentOutcomeReviewError(reviewError instanceof Error ? reviewError.message : "Não foi possível carregar os relatos para revisão.");
                } finally {
                  setLoadingAppointmentOutcomeReviews(false);
                }
              }}
              disabled={loadingAppointmentOutcomeReviews}
              className="rounded-xl border border-amber-500/30 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              {loadingAppointmentOutcomeReviews ? "Carregando…" : appointmentOutcomeReviews ? "Atualizar relatos" : "Carregar relatos"}
            </button>
          </div>
          {appointmentOutcomeReviewError && <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-200">Não foi possível carregar os relatos. Confirme se a migração de ciclo de atendimento foi aplicada. Detalhe: {appointmentOutcomeReviewError}</p>}
          {appointmentOutcomeReviews && (
            appointmentOutcomeReviews.length === 0
              ? <p className="mt-4 rounded-lg border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-400">Nenhum relato pendente de revisão.</p>
              : <div className="mt-4 space-y-3">{appointmentOutcomeReviews.map((review) => (
                <article key={review.appointment_id} className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{review.client_outcome === "no_show_reported" ? "Não comparecimento relatado" : "Problema relatado pelo cliente"}</h3>
                      <p className="mt-1 text-sm text-zinc-300">{review.service_name || "Serviço"} · Pedido {review.order_id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-zinc-500">Cliente: {review.client_name || "Não informado"} · Profissional: {review.professional_name || "Não informado"}</p>
                    </div>
                    <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">Em revisão</span>
                  </div>
                  {review.client_outcome_note && <p className="mt-3 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-sm leading-6 text-zinc-200">{review.client_outcome_note}</p>}
                  <p className="mt-3 text-xs text-zinc-500">Atendimento: {new Date(review.starts_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · Relato: {review.client_reported_at ? new Date(review.client_reported_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Não informado"}</p>
                  <p className="mt-1 text-xs text-zinc-500">Apenas registro para análise; nenhuma penalidade ou conclusão automática foi aplicada.</p>
                </article>
              ))}</div>
          )}
        </div>
      </section>

      <section id="admin-approvals" className="mx-auto max-w-7xl scroll-mt-6 px-6 pb-10">
        <div className="mb-6 border-b border-zinc-800 pb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">Operação e segurança</p><h2 className="mt-2 text-2xl font-bold text-white">Liberações e verificações</h2><p className="mt-1 text-sm text-zinc-400">As ferramentas existentes de análise de identidade e aprovação profissional continuam disponíveis abaixo.</p></div>



        <div>



          <div className="mb-4 inline-flex rounded-full bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400">



            VemGO CONTROL



          </div>



          <h1 className="text-3xl font-bold">



            Verificações de identidade



          </h1>



          <p className="mt-2 text-zinc-400">



            Analise a documentação enviada pelos usuários



            antes de liberar a identidade.



          </p>



        </div>



        {message && (



          <div className="mt-6 rounded-xl border border-blue-900/50 bg-blue-950/30 px-4 py-3 text-sm text-blue-300">



            {message}



          </div>



        )}



        {error && (



          <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">



            {error}



          </div>



        )}



        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => setActiveTab("identity")} className={`rounded-xl px-5 py-3 text-sm font-semibold ${activeTab === "identity" ? "bg-blue-600 text-white" : "border border-zinc-700 text-zinc-300 hover:border-blue-500"}`}>Verificações de identidade ({verifications.length})</button>
          <button type="button" onClick={() => setActiveTab("professionals")} className={`rounded-xl px-5 py-3 text-sm font-semibold ${activeTab === "professionals" ? "bg-blue-600 text-white" : "border border-zinc-700 text-zinc-300 hover:border-blue-500"}`}>Aprovação profissional ({pendingProfessionals.length})</button>
        </div>
        {activeTab === "professionals" ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Aprovação de profissionais</h2><p className="mt-1 text-sm text-zinc-400">A identidade precisa estar verificada antes da aprovação.</p></div><button type="button" onClick={loadPendingProfessionals} disabled={loadingProfessionals} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-blue-500 disabled:opacity-50">Atualizar lista</button></div>
            {professionalMessage && <p className="mt-5 rounded-xl border border-blue-900/50 bg-blue-950/30 px-4 py-3 text-sm text-blue-300">{professionalMessage}</p>}{professionalError && <p className="mt-5 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{professionalError}</p>}
            {loadingProfessionals ? <p className="mt-6 text-sm text-zinc-400">Carregando profissionais...</p> : pendingProfessionals.length === 0 ? <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-400">Nenhum profissional aguardando aprovação.</p> : <div className="mt-5 space-y-3">{pendingProfessionals.map((pro) => { const eligible = pro.identity_status === "verified" && pro.account_status === "active"; const busy = professionalDecisionBusy === pro.id; return <div key={pro.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h3 className="font-semibold">{pro.full_name}</h3><p className="mt-1 text-sm text-zinc-400">Identidade: <span className={pro.identity_status === "verified" ? "text-emerald-400" : "text-amber-400"}>{traduzirStatus(pro.identity_status)}</span> · Conta: {traduzirStatus(pro.account_status)}</p><p className="mt-1 text-xs text-zinc-500">Aprovação: {traduzirStatus(pro.verification_status)} · Serviço: {traduzirStatus(pro.service_status)}</p>{!eligible && <p className="mt-2 text-sm text-amber-300">É necessário ter identidade verificada e conta ativa.</p>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openProfessionalDossier(pro)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-blue-500">Ver dossiê</button><button type="button" onClick={() => handleProfessionalDecision(pro.id, "approved")} disabled={!eligible || busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40">{busy ? "Salvando..." : "Aprovar e ativar"}</button><button type="button" onClick={() => handleProfessionalDecision(pro.id, "rejected")} disabled={busy} className="rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-40">Reprovar</button></div></div></div>; })}</div>}
          </div>
        ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">



          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">



            <div className="flex items-center justify-between">



              <h2 className="font-semibold">



                Pendentes



              </h2>



              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">



                {verifications.length}



              </span>



            </div>



            {loadingList ? (



              <p className="mt-6 text-sm text-zinc-500">



                Carregando...



              </p>



            ) : verifications.length === 0 ? (



              <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5">



                <p className="text-sm text-zinc-400">



                  Nenhuma verificação pendente.



                </p>



              </div>



            ) : (



              <div className="mt-5 space-y-3">



                {verifications.map((verification) => (



                  <button



                    type="button"



                    key={verification.verification_id}



                    onClick={() =>



                      openVerification(verification)



                    }



                    className={`w-full rounded-xl border p-4 text-left transition ${



                      selected?.verification_id ===



                      verification.verification_id



                        ? "border-blue-600 bg-blue-950/20"



                        : "border-zinc-800 bg-zinc-950 hover:border-blue-700 hover:bg-zinc-900"



                    }`}



                  >



                    <div className="flex items-center justify-between gap-3">



                      <p className="font-semibold text-white">



                        {verification.full_name}



                      </p>



                      <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-400">



                        {verification.user_type ===



                        "client"



                          ? "CLIENTE"



                          : "PROFISSIONAL"}



                      </span>



                    </div>



                    <p className="mt-1 text-xs text-zinc-500">



                      {verification.document_type?.toUpperCase() ||



                        "Documento"}



                    </p>



                    <p className="mt-2 text-xs text-blue-400">



                      Aguardando análise



                    </p>



                  </button>



                ))}



              </div>



            )}



          </div>



          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">



            {!selected ? (



              <div className="flex min-h-[500px] items-center justify-center text-center">



                <div>



                  <p className="text-lg font-semibold text-zinc-300">



                    Selecione uma verificação



                  </p>



                  <p className="mt-2 max-w-md text-sm text-zinc-500">



                    Escolha um usuário na lista para visualizar



                    os documentos e realizar a análise.



                  </p>



                </div>



              </div>



            ) : (



              <div>



                <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-start">



                  <div>



                    <p className="text-xs uppercase tracking-wide text-zinc-500">



                      Usuário



                    </p>



                    <h2 className="mt-1 text-2xl font-bold">



                      {selected.full_name}



                    </h2>



                    <p className="mt-2 text-sm text-zinc-400">



                      Tipo:{" "}



                      <span className="text-white">



                        {selected.user_type === "client"



                          ? "Cliente"



                          : "Profissional"}



                      </span>



                    </p>



                    <p className="mt-1 text-sm text-zinc-400">



                      Documento:{" "}



                      <span className="text-white">



                        {selected.document_type?.toUpperCase() ||



                          "Não informado"}



                      </span>



                    </p>



                    <p className="mt-1 text-sm text-zinc-400">



                      Número:{" "}



                      <span className="text-white">



                        {selected.document_number ||



                          "Não informado"}



                      </span>



                    </p>



                  </div>



                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">



                    Pendente



                  </span>



                </div>



                <div className="mt-6 grid gap-6 md:grid-cols-3">



                  <div>



                    <p className="mb-3 text-sm font-semibold text-zinc-300">



                      Frente do documento



                    </p>



                    {selected.frontUrl ? (



                      <a



                        href={selected.frontUrl}



                        target="_blank"



                        rel="noreferrer"



                        className="block overflow-hidden rounded-xl border border-zinc-800 bg-black"



                      >



                        <div className="relative h-64 w-full">



                          <Image



                            src={selected.frontUrl}



                            alt="Frente do documento"



                            fill



                            sizes="(max-width: 768px) 100vw, 33vw"



                            unoptimized



                            className="object-contain"



                          />



                        </div>



                      </a>



                    ) : (



                      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-black text-sm text-zinc-500">



                        Não disponível



                      </div>



                    )}



                  </div>



                  <div>



                    <p className="mb-3 text-sm font-semibold text-zinc-300">



                      Verso do documento



                    </p>



                    {selected.backUrl ? (



                      <a



                        href={selected.backUrl}



                        target="_blank"



                        rel="noreferrer"



                        className="block overflow-hidden rounded-xl border border-zinc-800 bg-black"



                      >



                        <div className="relative h-64 w-full">



                          <Image



                            src={selected.backUrl}



                            alt="Verso do documento"



                            fill



                            sizes="(max-width: 768px) 100vw, 33vw"



                            unoptimized



                            className="object-contain"



                          />



                        </div>



                      </a>



                    ) : (



                      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-black text-sm text-zinc-500">



                        Não enviado



                      </div>



                    )}



                  </div>



                  <div>



                    <p className="mb-3 text-sm font-semibold text-zinc-300">



                      Selfie



                    </p>



                    {selected.selfieUrl ? (



                      <a



                        href={selected.selfieUrl}



                        target="_blank"



                        rel="noreferrer"



                        className="block overflow-hidden rounded-xl border border-zinc-800 bg-black"



                      >



                        <div className="relative h-64 w-full">



                          <Image



                            src={selected.selfieUrl}



                            alt="Selfie de verificação"



                            fill



                            sizes="(max-width: 768px) 100vw, 33vw"



                            unoptimized



                            className="object-contain"



                          />



                        </div>



                      </a>



                    ) : (



                      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-black text-sm text-zinc-500">



                        Não disponível



                      </div>



                    )}



                  </div>



                </div>



                <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-5">



                  <label



                    htmlFor="rejectionReason"



                    className="mb-2 block text-sm font-semibold text-zinc-300"



                  >



                    Motivo da reprovação



                    <span className="ml-2 text-xs font-normal text-zinc-500">



                      obrigatório somente ao reprovar



                    </span>



                  </label>



                  <textarea



                    id="rejectionReason"



                    value={rejectionReason}



                    onChange={(event) =>



                      setRejectionReason(



                        event.target.value,



                      )



                    }



                    placeholder="Ex.: documento ilegível, divergência de dados..."



                    className="min-h-24 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500"



                  />



                </div>



                <div className="mt-6 flex flex-wrap gap-3">



                  <button



                    type="button"



                    onClick={() =>



                      handleDecision("approved")



                    }



                    disabled={saving}



                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"



                  >



                    Aprovar identidade



                  </button>



                  <button



                    type="button"



                    onClick={() =>



                      handleDecision("manual_review")



                    }



                    disabled={saving}



                    className="rounded-xl border border-amber-600 px-5 py-3 text-sm font-semibold text-amber-400 transition hover:bg-amber-950/30 disabled:cursor-not-allowed disabled:opacity-50"



                  >



                    Análise manual



                  </button>



                  <button



                    type="button"



                    onClick={() =>



                      handleDecision("rejected")



                    }



                    disabled={saving}



                    className="rounded-xl border border-red-700 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"



                  >



                    Reprovar identidade



                  </button>



                </div>



              </div>



            )}



          </div>



        </div>



        )}



      </section>



      {dossierProfessional && (
        <Dialog
          open={Boolean(dossierProfessional)}
          title={`Dossiê: ${dossierProfessional.full_name}`}
          labelledBy="professional-dossier-title"
          size="xl"
          showHeader={false}
          onClose={() => { setDossierProfessional(null); setProfessionalDossier(null); }}
        >
          <div className="mx-auto my-6 w-full max-w-5xl rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-5">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-400">Análise administrativa</p><h2 id="professional-dossier-title" className="mt-1 text-2xl font-bold">Dossiê: {dossierProfessional.full_name}</h2><p className="mt-1 text-sm text-zinc-400">Confira os dados antes de decidir pela aprovação.</p></div>
              <button type="button" onClick={() => { setDossierProfessional(null); setProfessionalDossier(null); }} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-blue-500">Fechar</button>
            </div>
            {loadingDossier ? <p className="py-10 text-sm text-zinc-400">Carregando dossiê...</p> : professionalDossier ? (
              <div className="mt-5 space-y-6">
                <section className="rounded-xl border border-zinc-800 p-4"><h3 className="font-semibold text-blue-300">1. Dados cadastrais</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <p><span className="text-zinc-500">Nome completo:</span><br />{professionalDossier.profile?.full_name || "Não informado"}</p>
                  <p><span className="text-zinc-500">Nome de exibição:</span><br />{professionalDossier.professional?.display_name || "Não informado"}</p>
                  <p><span className="text-zinc-500">Telefone:</span><br />{professionalDossier.profile?.phone || "Não informado"}</p>
                  <p><span className="text-zinc-500">Tipo de conta:</span><br />{traduzirStatus(professionalDossier.profile?.user_type)}</p>
                  <p><span className="text-zinc-500">Status da conta:</span><br />{traduzirStatus(professionalDossier.profile?.status)}</p>
                  <p><span className="text-zinc-500">Telefone verificado:</span><br />{professionalDossier.profile?.phone_verified_at ? new Date(professionalDossier.profile.phone_verified_at).toLocaleString("pt-BR") : "Não verificado"}</p>
                  <p><span className="text-zinc-500">Cadastro:</span><br />{professionalDossier.profile?.created_at ? new Date(professionalDossier.profile.created_at).toLocaleString("pt-BR") : "Não informado"}</p>
                  <p><span className="text-zinc-500">Documento cadastral:</span><br />{[professionalDossier.professional?.document_type, professionalDossier.professional?.document_number].filter(Boolean).join(" · ") || "Não informado"}</p>
                  <p><span className="text-zinc-500">Aceita chamadas:</span><br />{professionalDossier.professional?.is_accepting_calls == null ? "Não informado" : professionalDossier.professional.is_accepting_calls ? "Sim" : "Não"}</p>
                </div><p className="mt-3"><span className="text-zinc-500">Apresentação:</span><br /><span className="whitespace-pre-wrap">{professionalDossier.professional?.bio || "Não informada"}</span></p></section>
                <section className="rounded-xl border border-zinc-800 p-4"><h3 className="font-semibold text-blue-300">2. Identidade e documentos</h3><p className="mt-2 text-sm">Status da identidade: <strong>{traduzirStatus(professionalDossier.profile?.identity_status)}</strong> · Verificada em: {professionalDossier.profile?.identity_verified_at ? new Date(professionalDossier.profile.identity_verified_at).toLocaleString("pt-BR") : "Não informado"}</p>
                  {professionalDossier.identity_documents.length === 0 ? <p className="mt-3 text-sm text-zinc-500">Nenhum documento encontrado.</p> : professionalDossier.identity_documents.map((doc, index) => <div key={`${doc.document_type}-${index}`} className="mt-3 rounded-lg bg-black/40 p-3 text-sm"><p><strong>{doc.document_type || "Documento"}</strong> · Status: {traduzirStatus(doc.verification_status)}</p><p>Número: {doc.document_number || "Não informado"} · Provedor: {doc.verification_provider || "Não informado"}</p><p>Verificado em: {doc.verified_at ? new Date(doc.verified_at).toLocaleString("pt-BR") : "Não informado"}</p>{doc.rejection_reason && <p className="text-red-300">Motivo: {doc.rejection_reason}</p>}<p className="mt-1 text-xs text-zinc-500">Arquivos: {doc.document_front_path ? "Frente enviada" : "Sem frente"} · {doc.document_back_path ? "Verso enviado" : "Sem verso"}</p></div>)}
                  {professionalDossier.identity_verifications.map((item, index) => <div key={`${item.verification_type}-${index}`} className="mt-3 rounded-lg bg-black/40 p-3 text-sm"><p><strong>Verificação: {item.verification_type || "Não especificada"}</strong> · Status: {traduzirStatus(item.status)}</p><p>Provedor: {item.provider || "Não informado"} · Referência: {item.provider_reference || "Não informada"}</p>{item.rejection_reason && <p className="text-red-300">Motivo: {item.rejection_reason}</p>}<p className="text-xs text-zinc-500">Selfie: {item.selfie_path ? "Enviada" : "Não enviada"}</p></div>)}
                </section>
                <section className="rounded-xl border border-zinc-800 p-4"><h3 className="font-semibold text-blue-300">3. Serviços e preços</h3>{professionalDossier.services.length === 0 ? <p className="mt-3 text-sm text-zinc-500">Nenhum serviço cadastrado.</p> : <div className="mt-3 space-y-2">{professionalDossier.services.map((service, index) => <div key={`${service.code}-${index}`} className="rounded-lg bg-black/40 p-3 text-sm"><p className="font-semibold">{service.code || "Sem código"} · {service.name || "Serviço sem nome"}</p><p className="mt-1 text-zinc-400">{service.description || "Sem descrição"}</p><p className="mt-1">Serviço: {service.is_active ? "Ativo" : "Inativo"} · Preço: {service.price == null ? "Não cadastrado" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: service.currency || "BRL" }).format(service.price)} · Preço ativo: {service.price_active ? "Sim" : "Não"}</p><p className="text-xs text-zinc-500">Vigência: {service.valid_from ? new Date(service.valid_from).toLocaleDateString("pt-BR") : "Não informada"} até {service.valid_until ? new Date(service.valid_until).toLocaleDateString("pt-BR") : "sem data final"}</p></div>)}</div>}</section>
                <section className="rounded-xl border border-zinc-800 p-4"><h3 className="font-semibold text-blue-300">4. Área de atendimento</h3>{professionalDossier.regions.length === 0 ? <p className="mt-3 text-sm text-zinc-500">Nenhuma região cadastrada.</p> : professionalDossier.regions.map((region, index) => <p key={`${region.city}-${index}`} className="mt-2 text-sm">{[region.city, region.state, region.country].filter(Boolean).join(" / ")} · Raio: {region.max_distance_km == null ? "Não informado" : `${region.max_distance_km} km`} · {region.is_active ? "Ativa" : "Inativa"}</p>)}</section>
                <section className="rounded-xl border border-zinc-800 p-4"><h3 className="font-semibold text-blue-300">5. Disponibilidade</h3>{professionalDossier.availability.length === 0 ? <p className="mt-3 text-sm text-zinc-500">Nenhum horário cadastrado.</p> : professionalDossier.availability.map((slot, index) => <p key={`${slot.day_of_week}-${slot.start_time}-${index}`} className="mt-2 text-sm">{formatDayOfWeek(slot.day_of_week)} · {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} · {slot.is_active ? "Ativo" : "Inativo"}</p>)}</section>
                <section className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4"><h3 className="font-semibold text-amber-300">6. Checklist antes da decisão</h3><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-300"><li>Identidade verificada: {professionalDossier.profile?.identity_status === "verified" ? "Sim" : "Não — não aprovar"}</li><li>Conta ativa: {professionalDossier.profile?.status === "active" ? "Sim" : "Não — não aprovar"}</li><li>Serviços e preços cadastrados: {professionalDossier.services.some((item) => item.is_active && item.price != null && item.price_active) ? "Sim" : "Verificar — não há serviço ativo com preço ativo confirmado"}</li><li>Região ativa: {professionalDossier.regions.some((item) => item.is_active) ? "Sim" : "Não cadastrada/ativa"}</li><li>Disponibilidade ativa: {professionalDossier.availability.some((item) => item.is_active) ? "Sim" : "Não cadastrada/ativa"}</li><li>Integração KLIOS: {professionalDossier.identity_documents.some((doc) => (doc.verification_provider || "").toLowerCase().includes("klios")) || professionalDossier.identity_verifications.some((item) => (item.provider || "").toLowerCase().includes("klios")) ? "Referência KLIOS encontrada nos registros" : "Não identificada nos registros consultados; confirmar separadamente"}</li></ul><p className="mt-3 text-xs text-zinc-500">O checklist é informativo; a decisão continua sujeita às regras de aprovação do banco.</p></section>
              </div>
            ) : <p className="py-8 text-sm text-zinc-400">Não foi possível carregar os dados do dossiê.</p>}
          </div>
        </Dialog>
      )}

      {profileEditorOpen && (

        <Dialog
          open={profileEditorOpen}
          title="Meu perfil administrativo"
          labelledBy="admin-profile-dialog-title"
          showHeader={false}
          onClose={() => setProfileEditorOpen(false)}
        >

          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">Conta administrativa</p>

                <h2 id="admin-profile-dialog-title" className="mt-1 text-2xl font-bold text-white">Meu perfil</h2>

                <p className="mt-2 text-sm text-zinc-400">Atualize seu nome e sua foto de exibição.</p>

              </div>

              <button type="button" onClick={() => setProfileEditorOpen(false)} className="rounded-lg px-3 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Fechar">×</button>

            </div>

            <div className="mt-6">

              <label htmlFor="admin-full-name" className="mb-2 block text-sm font-medium text-zinc-300">Nome completo</label>

              <input id="admin-full-name" type="text" value={profileNameDraft} onChange={(event) => setProfileNameDraft(event.target.value)} maxLength={120} className="h-12 w-full rounded-xl border border-zinc-700 bg-black px-4 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Digite seu nome completo" />

            </div>

            <div className="mt-5">

              <label htmlFor="admin-profile-photo" className="mb-2 block text-sm font-medium text-zinc-300">Foto de perfil</label>

              <input id="admin-profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProfilePhotoFile(event.target.files?.[0] || null)} className="block w-full rounded-xl border border-zinc-700 bg-black px-3 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500/10 file:px-3 file:py-2 file:font-semibold file:text-blue-400 hover:file:bg-blue-500/20" />

              <p className="mt-2 text-xs text-zinc-500">JPG, PNG ou WEBP. Tamanho máximo: 5 MB.</p>

              {profilePhotoFile && <p className="mt-2 text-sm text-blue-300">Selecionada: {profilePhotoFile.name}</p>}

            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <button type="button" onClick={() => setProfileEditorOpen(false)} disabled={savingProfile} className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 disabled:opacity-50">Cancelar</button>

              <button type="button" onClick={handleSaveProfile} disabled={savingProfile} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{savingProfile ? "Salvando..." : "Salvar alterações"}</button>

            </div>

          </div>

        </Dialog>

      )}



    </main>



  );



}
