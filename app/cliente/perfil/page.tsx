"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type AccountProfile = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  user_type: "client" | "professional";
  status: string;
};

export default function MeuPerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [phoneVerificationPassed, setPhoneVerificationPassed] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/login");
        return;
      }
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url, user_type, status")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (profileError || !data || !["client", "professional"].includes(data.user_type)) {
        setError("Não foi possível carregar os dados da conta.");
        setLoading(false);
        return;
      }
      if (data.status === "blocked") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }
      const current = data as AccountProfile;
      setProfile(current);
      setName(current.full_name ?? "");
      setPhone(current.phone ?? "");
      setEmail(user.email ?? "");
      setNewEmail(user.email ?? "");
      setNewPhone(current.phone ?? "");
      if (user.phone_confirmed_at && user.phone && user.phone !== current.phone) {
        setPendingPhone(user.phone);
        setNewPhone(user.phone);
        setPhoneVerificationPassed(true);
        setMessage("O celular já foi confirmado. Conclua a sincronização do perfil.");
      }
      if (current.avatar_url) {
        if (/^https?:\/\//i.test(current.avatar_url)) {
          setAvatarPreview(current.avatar_url);
        } else {
          const { data: signedAvatar } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(current.avatar_url, 60 * 60);
          if (signedAvatar?.signedUrl && active) setAvatarPreview(signedAvatar.signedUrl);
        }
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [router]);

  async function savePersonalData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!name.trim()) {
      setError("Informe seu nome completo.");
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("id", user.id);
    if (updateError) {
      setError("Não foi possível salvar o nome. " + updateError.message);
    } else {
      setProfile((old) => old ? { ...old, full_name: name.trim() } : old);
      setMessage("Nome atualizado.");
    }
    setSaving(false);
  }

  async function requestEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const candidate = newEmail.trim().toLowerCase();
    if (!candidate || !candidate.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (candidate === email.toLowerCase()) {
      setError("O novo e-mail é igual ao atual.");
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser(
      { email: candidate },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/cliente/perfil` }
    );
    if (updateError) setError("Não foi possível solicitar a troca de e-mail. " + updateError.message);
    else setMessage("Solicitação enviada. Confirme o novo e-mail pelo link enviado pela VemGO. O endereço só será atualizado após a confirmação.");
    setSaving(false);
  }

  async function requestPhoneChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalized = newPhone.replace(/[^\d+]/g, "");
    if (!/^\+?[1-9]\d{9,14}$/.test(normalized)) {
      setError("Informe o celular com DDD. Para SMS internacional, use o formato +55...");
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ phone: normalized });
    if (updateError) {
      setError("Não foi possível iniciar a confirmação por SMS. Verifique se a autenticação por telefone está habilitada no Supabase. " + updateError.message);
    } else {
      setPendingPhone(normalized);
      setPhoneCode("");
      setPhoneVerificationPassed(false);
      setMessage("Enviamos um código de confirmação para o novo celular. Digite-o abaixo para concluir a alteração.");
    }
    setSaving(false);
  }

  async function confirmPhoneChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!pendingPhone || (!phoneVerificationPassed && !/^\d{6}$/.test(phoneCode.trim()))) {
      setError("Informe o código SMS de 6 dígitos.");
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!phoneVerificationPassed) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token: phoneCode.trim(),
        type: "phone_change",
      });
      if (verifyError) {
        setError("Código inválido ou expirado. " + verifyError.message);
        setSaving(false);
        return;
      }
      setPhoneVerificationPassed(true);
    }
    if (!user) {
      setError("Sua sessão expirou. Entre novamente.");
      router.replace("/login");
      setSaving(false);
      return;
    }
    const { error: syncError } = await supabase.rpc("sync_verified_phone");
    if (syncError) {
      setError("O celular foi confirmado na autenticação, mas não foi possível sincronizar o perfil. " + syncError.message);
    } else {
      setPhone(pendingPhone);
      setNewPhone(pendingPhone);
      setPendingPhone("");
      setPhoneCode("");
      setPhoneVerificationPassed(false);
      setMessage("Celular alterado e confirmado com sucesso.");
    }
    setSaving(false);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
    if (passwordError) setError("Não foi possível alterar a senha. " + passwordError.message);
    else {
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Senha alterada com sucesso.");
    }
    setSaving(false);
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!photo) {
      setError("Escolha uma imagem primeiro.");
      return;
    }
    if (!photo.type.startsWith("image/") || photo.size > 5 * 1024 * 1024) {
      setError("Escolha uma imagem de até 5 MB.");
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      setSaving(false);
      return;
    }
    const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, photo, { upsert: false, contentType: photo.type });
    if (uploadError) {
      setError("Não foi possível enviar a foto. " + uploadError.message);
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    if (updateError) {
      setError("A foto foi enviada, mas não foi possível salvar no perfil. " + updateError.message);
      setSaving(false);
      return;
    }
    const { data: signedAvatar } = await supabase.storage
      .from("profile-photos")
      .createSignedUrl(path, 60 * 60);
    if (signedAvatar?.signedUrl) setAvatarPreview(signedAvatar.signedUrl);
    setPhoto(null);
    setMessage("Foto atualizada com sucesso.");
    setSaving(false);
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">Carregando perfil...</main>;

  const isProfessional = profile?.user_type === "professional";

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex justify-end">
          <button type="button" onClick={() => router.push(isProfessional ? "/profissional" : "/cliente")} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm transition hover:border-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400">Voltar ao painel</button>
        </div>
        <h1 className="text-3xl font-bold">Meu perfil</h1>
        <p className="mt-2 text-sm text-zinc-400">Atualize seus dados de acesso e contato. CPF e documentos de identidade não podem ser alterados por esta tela.</p>
        {message && <div role="status" className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-green-300">{message}</div>}
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold">Dados pessoais</h2>
          <form onSubmit={savePersonalData} className="mt-4 space-y-4">
            <label className="block text-sm">Nome completo<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3" /></label>
            <label className="block text-sm">Celular atual<input value={phone || "Não informado"} readOnly className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-500" /></label>
            <button disabled={saving} className="rounded-xl bg-green-500 px-5 py-3 font-semibold text-black disabled:opacity-50">{saving ? "Salvando..." : "Salvar nome"}</button>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold">E-mail de acesso</h2>
          <p className="mt-1 text-sm text-zinc-400">Atual: {email || "Não informado"}</p>
          <form onSubmit={requestEmailChange} className="mt-4 space-y-4">
            <label className="block text-sm">Novo e-mail<input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" required className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3" /></label>
            <button disabled={saving} className="rounded-xl border border-green-500/40 px-5 py-3 font-semibold text-green-300 disabled:opacity-50">{saving ? "Processando..." : "Solicitar alteração e confirmar e-mail"}</button>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold">Celular</h2>
          <p className="mt-1 text-sm text-zinc-400">A alteração só será concluída após a confirmação do código enviado por SMS.</p>
          <form onSubmit={requestPhoneChange} className="mt-4 space-y-4">
            <label className="block text-sm">Novo celular com DDD<input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+5511999999999" autoComplete="tel" required className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3" /></label>
            <button disabled={saving} className="rounded-xl border border-green-500/40 px-5 py-3 font-semibold text-green-300 disabled:opacity-50">{saving ? "Enviando..." : "Enviar código SMS"}</button>
          </form>
          {pendingPhone && <form onSubmit={confirmPhoneChange} className="mt-5 space-y-4 border-t border-zinc-800 pt-5">
            {!phoneVerificationPassed && <label className="block text-sm">Código SMS de 6 dígitos<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={phoneCode} onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3" /></label>}
            <button disabled={saving} className="rounded-xl bg-green-500 px-5 py-3 font-semibold text-black disabled:opacity-50">{saving ? "Confirmando..." : "Confirmar celular"}</button>
          </form>}
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold">Senha</h2>
          <form onSubmit={changePassword} className="mt-4 space-y-4">
            <label className="block text-sm">Nova senha<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" required className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3" /></label>
            <label className="block text-sm">Confirmar nova senha<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} autoComplete="new-password" required className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3" /></label>
            <button disabled={saving} className="rounded-xl bg-green-500 px-5 py-3 font-semibold text-black disabled:opacity-50">{saving ? "Salvando..." : "Alterar senha"}</button>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold">Foto de perfil</h2>
          <p className="mt-1 text-sm text-zinc-400">Selecione uma imagem para habilitar o botão de atualização. Formatos de imagem, até 5 MB.</p>
          {avatarPreview && (
            <div className="mt-4 flex items-center gap-4">
              <Image src={avatarPreview} alt="Foto de perfil atual" width={64} height={64} unoptimized className="h-16 w-16 rounded-full border border-green-500/40 object-cover" />
              <span className="text-sm text-zinc-400">Foto atual</span>
            </div>
          )}
          {photo && <p className="mt-3 break-all text-sm text-green-300">Selecionada: {photo.name}</p>}
          <form onSubmit={uploadPhoto} className="mt-4 space-y-4">
            <label className="block text-sm">Escolher imagem (máximo 5 MB)
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-green-500 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-green-400" />
            </label>
            <button type="submit" disabled={saving || !photo} className="rounded-xl bg-green-500 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Enviando..." : photo ? "Atualizar foto" : "Escolha uma imagem primeiro"}</button>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold">Documento de identidade</h2>
          <p className="mt-2 text-sm text-zinc-400">CPF e documentos usados na verificação não podem ser alterados pelo perfil. Se houver erro, solicite correção ao suporte da VemGO para manter o histórico de verificação.</p>
          {!isProfessional && <button type="button" onClick={() => router.push("/cliente/verificacao/identidade")} className="mt-4 rounded-xl border border-green-500/40 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/10">Consultar verificação de identidade</button>}
          {isProfessional && <button type="button" onClick={() => router.push("/cadastro-profissional/identidade")} className="mt-4 rounded-xl border border-green-500/40 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/10">Consultar verificação de identidade</button>}
        </section>
      </div>
    </main>
  );
}
