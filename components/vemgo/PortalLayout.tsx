"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { useAccessibleDrawer, useDrawerInteractions } from "@/components/vemgo/useAccessibleDrawer";

export type PortalRole = "client" | "professional" | "admin";

type PortalLink = { label: string; href: string; icon: string };

const portalSettings: Record<PortalRole, {
  label: string;
  accent: string;
  links: PortalLink[];
  signOutTarget: string;
}> = {
  client: {
    label: "Área do cliente",
    accent: "#10b981",
    links: [
      { label: "Início", href: "/cliente", icon: "⌂" },
      { label: "Agendamentos", href: "/cliente/agendamento", icon: "◷" },
      { label: "Serviços", href: "/cliente/servicos", icon: "⚒" },
      { label: "Endereços", href: "/cliente/enderecos", icon: "⌖" },
      { label: "Verificação", href: "/cliente/verificacao", icon: "✓" },
      { label: "Perfil", href: "/cliente/perfil", icon: "♙" },
      { label: "Favoritos", href: "/cliente/recurso-indisponivel/favoritos", icon: "♡" },
      { label: "Ajuda", href: "/cliente/recurso-indisponivel/ajuda", icon: "?" },
      { label: "VemGO Pay", href: "/cliente/recurso-indisponivel/vemgo-pay", icon: "$" },
      { label: "Clube VemGO+", href: "/cliente/recurso-indisponivel/clube-vemgo", icon: "✦" },
    ],
    signOutTarget: "/login?role=client",
  },
  professional: {
    label: "Área profissional",
    accent: "#f97316",
    links: [
      { label: "Início", href: "/profissional", icon: "⌂" },
      { label: "Agendamentos", href: "/profissional/agendamento", icon: "◷" },
      { label: "Serviços", href: "/profissional/servicos", icon: "⚒" },
      { label: "Oportunidades", href: "/profissional/oportunidades", icon: "✦" },
      { label: "Preços", href: "/profissional/precos", icon: "$" },
      { label: "Disponibilidade", href: "/profissional/disponibilidade", icon: "◷" },
      { label: "Regiões", href: "/profissional/regioes", icon: "⌖" },
      { label: "Perfil", href: "/profissional/perfil", icon: "♙" },
      { label: "VemGO Pay", href: "/profissional/recurso-indisponivel/vemgo-pay", icon: "$" },
      { label: "Planos VemGO", href: "/profissional/recurso-indisponivel/planos", icon: "▦" },
      { label: "Ajuda e suporte", href: "/profissional/recurso-indisponivel/ajuda", icon: "?" },
    ],
    signOutTarget: "/login?role=professional",
  },
  admin: {
    label: "VemGO Control",
    accent: "#3b82f6",
    links: [
      { label: "Início", href: "/controle", icon: "⌂" },
      { label: "Profissionais", href: "/controle/profissionais", icon: "♙" },
    ],
    signOutTarget: "/admin/login",
  },
};

export function PortalHeaderBar({
  role,
  menuOpen,
  menuButtonRef,
  interactions,
  children,
}: {
  role: PortalRole;
  menuOpen: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  interactions: ReturnType<typeof useDrawerInteractions>;
  children?: ReactNode;
}) {
  const settings = portalSettings[role];

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#090b0c]/95 text-white shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-1.5 px-3 sm:gap-3 sm:px-6">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={interactions.onClick}
          onPointerEnter={interactions.onPointerEnter}
          onPointerLeave={interactions.onPointerLeave}
          aria-label={`Abrir ou fechar menu ${settings.label}`}
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? "portal-navigation-drawer" : undefined}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-white/5 hover:text-[var(--portal-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <Link
          href={role === "admin" ? "/controle" : `/${role === "client" ? "cliente" : "profissional"}`}
          aria-label={`Página inicial VemGO — ${settings.label}`}
          className="flex min-h-11 shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]"
        >
          <Image
            src="/logo-vemgo-transparente.png"
            alt={`VemGO — ${settings.label}`}
            width={1751}
            height={465}
            priority
            className="h-auto w-[105px] object-contain sm:w-[140px]"
          />
        </Link>
        {children}
      </div>
    </header>
  );
}

export function PortalNavigationDrawer({
  role,
  open,
  onClose,
  menuRef,
  interactions,
  children,
}: {
  role: PortalRole;
  open: boolean;
  onClose: () => void;
  menuRef: RefObject<HTMLElement | null>;
  interactions: ReturnType<typeof useDrawerInteractions>;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const settings = portalSettings[role];

  if (!open) return null;

  return (
    <>
      <aside
        id="portal-navigation-drawer"
        ref={menuRef}
        aria-label={`Navegação ${settings.label}`}
        onPointerEnter={(event) => { interactions.cancelClose(); if (event.pointerType === "mouse") interactions.onPointerEnter(event); }}
        onPointerLeave={interactions.onPointerLeave}
        className="fixed inset-y-0 left-0 z-[60] flex w-[min(320px,88vw)] flex-col border-r border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.48)] motion-reduce:transition-none"
        style={{
          backgroundColor: "rgb(10 14 14 / 65%)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {children ?? <>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--portal-accent)]">VemGO</p>
            <p className="mt-1 text-sm font-semibold text-white">{settings.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>
          </button>
        </div>
        <nav aria-label={`Navegação ${settings.label}`} className="flex-1 overflow-y-auto p-3">
          {settings.links.map((link) => {
            const active = pathname === link.href ||
              (link.href !== "/cliente" && link.href !== "/profissional" && link.href !== "/controle" && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`mb-1 flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] ${active ? "bg-white/10 text-[var(--portal-accent)]" : "text-zinc-300 hover:bg-white/5 hover:text-white"}`}
              >
                <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center text-lg">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
        </>}
      </aside>
    </>
  );
}

export function PortalLayout({
  role,
  children,
}: {
  role: PortalRole;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const settings = portalSettings[role];
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const interactions = useDrawerInteractions(menuOpen, setMenuOpen);
  const drawerRef = useAccessibleDrawer(menuOpen, setMenuOpen, menuButtonRef, interactions.focusOnOpen, interactions.clearFocus);
  const pageHasOwnHeader = pathname === "/cliente" ||
    pathname === "/profissional" ||
    pathname === "/controle";
  const contentClassName = pathname === "/cliente"
    ? "min-h-screen pt-16"
    : pageHasOwnHeader
    ? "min-h-screen pt-16"
    : role === "client"
      ? "min-h-screen pt-16 [&>main]:min-h-[calc(100vh-4rem)]"
      : "min-h-screen pt-16";

  async function signOut() {
    setSignOutError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace(settings.signOutTarget);
    } catch {
      setSignOutError("Não foi possível sair agora. Tente novamente.");
    }
  }

  const themeStyle = { "--portal-accent": settings.accent } as CSSProperties;

  return (
    <div data-portal-shell={role} style={themeStyle}>
      <a
        href="#portal-content-main"
        className="sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[120] focus:not-sr-only focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-black focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]"
      >
        Pular para o conteúdo
      </a>
      {!pageHasOwnHeader && (
        <>
          <PortalHeaderBar
            role={role}
            menuOpen={menuOpen}
            menuButtonRef={menuButtonRef}
            interactions={interactions}
          >
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label={`Sair da conta ${settings.label}`}
                title="Sair"
                className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M10 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
          </PortalHeaderBar>

          {signOutError && (
            <p role="alert" className="fixed right-3 top-[72px] z-[80] max-w-[calc(100vw-24px)] rounded-xl border border-red-500/20 bg-[#160b0b] px-4 py-3 text-sm text-red-300 shadow-xl sm:right-6">
              {signOutError}
            </p>
          )}

          <PortalNavigationDrawer
            role={role}
            open={menuOpen}
            onClose={() => { interactions.clearFocus(); setMenuOpen(false); }}
            menuRef={drawerRef}
            interactions={interactions}
          />
        </>
      )}

      <div id="portal-content-main" data-portal-content tabIndex={-1} className={contentClassName}>
        {children}
      </div>
    </div>
  );
}
