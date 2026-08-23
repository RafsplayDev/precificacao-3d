"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Toast, Icon } from "@/design-system";
import { supabase } from "@/lib/supabaseClient";
import { irPara } from "@/lib/navegar";

const NAV = [
  { href: "/", label: "Calculadora", icone: "calculator" },
  { href: "/produtos", label: "Produtos", icone: "box" },
  { href: "/cadastros", label: "Cadastros", icone: "layers" },
  { href: "/concorrentes", label: "Concorrentes", icone: "store" },
];

/**
 * Páginas que existem antes do acesso liberado. Elas se bastam: mostrar o
 * menu do app para quem ainda não pagou seria oferecer portas fechadas.
 */
const SEM_MENU = ["/entrar", "/assinar", "/vendas"];

const ToastCtx = React.createContext(() => {});
export const useToast = () => React.useContext(ToastCtx);

export function AppShell({ children }) {
  const pathname = usePathname();
  const [toasts, setToasts] = React.useState([]);
  const [conta, setConta] = React.useState(null);
  const [extras, setExtras] = React.useState({ afiliado: false, admin: false });
  // "perfil" ou nada: a única gaveta que resta é a da conta.
  const [aberto, setAberto] = React.useState(null);
  const alternar = (qual) => setAberto((v) => (v === qual ? null : qual));
  const inicial = (conta?.email || "?").trim().charAt(0).toUpperCase();
  const itens = React.useMemo(() => [
    ...NAV,
    ...(extras.afiliado ? [{ href: "/afiliado", label: "Indicações", icone: "gift" }] : []),
    ...(extras.admin ? [{ href: "/admin", label: "Admin", icone: "shield" }] : []),
  ], [extras.afiliado, extras.admin]);

  const publica = SEM_MENU.some((p) => pathname === p || pathname.startsWith(p + "/"));

  React.useEffect(() => {
    if (publica) return;
    let vivo = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!vivo || !user) return;
      setConta(user);
      // Duas consultas curtas que o RLS já filtra: se voltou linha, a pessoa
      // tem aquele papel. Definem quais links aparecem no menu.
      const [{ data: af }, { data: ad }] = await Promise.all([
        supabase.from("afiliados").select("id").maybeSingle(),
        supabase.from("admins").select("user_id").maybeSingle(),
      ]);
      if (vivo) setExtras({ afiliado: !!af, admin: !!ad });
    })();
    return () => {
      vivo = false;
    };
  }, [publica, pathname]);

  React.useEffect(() => {
    setAberto(null);
  }, [pathname]);

  async function sair() {
    await supabase.auth.signOut();
    irPara("/entrar");
  }

  // O ícone só existe na barra do rodapé: no header o menu é texto, como sempre foi.
  const links = (comIcone) =>
    itens.map((n) => (
      <Link
        key={n.href}
        href={n.href}
        aria-current={pathname === n.href ? "page" : undefined}
      >
        {comIcone && <Icon name={n.icone} size={20} />}
        {comIcone ? <span className="ap-nav__txt">{n.label}</span> : n.label}
      </Link>
    ));

  const push = React.useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((v) => [...v, { id, ...t }]);
    setTimeout(() => setToasts((v) => v.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      <div className="ap-shell">
        <header className="ap-header">
          <div className="ap-header__in">
            <Link href="/" className="ap-logo" style={{ textDecoration: "none" }}>
              <Image src="/brand/logo-icon.png" alt="" width={26} height={26} priority />
              <span className="ap-logo__name">Drop Color</span>
              <span className="ap-logo__sub">Precificação</span>
            </Link>
            {!publica && (
              <>
                <div className="ap-barra">
                  <button
                    type="button"
                    className={"ap-perfil" + (aberto === "perfil" ? " is-on" : "")}
                    aria-label="Sua conta"
                    aria-expanded={aberto === "perfil"}
                    onClick={() => alternar("perfil")}
                  >
                    <span aria-hidden="true">{inicial}</span>
                  </button>
                </div>

                <nav className="ap-nav" aria-label="Seções">{links(false)}</nav>

                {conta && (
                  <div className={"ap-gaveta" + (aberto === "perfil" ? " is-open" : "")}>
                    <div className="ap-conta">
                      <span className="ap-conta__email">{conta.email}</span>
                      <button type="button" onClick={sair}>Sair</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </header>

        {/* A barra do rodapé vive fora do header de propósito: dentro dele o
            blur criaria bloco de contenção e ela deixaria de ser fixa. */}
        {!publica && (
          <nav className="ap-tabbar" aria-label="Seções">{links(true)}</nav>
        )}

        <main className="ap-main">{children}</main>

        <div className="ap-toasts">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              tone={t.tone || "success"}
              title={t.title}
              message={t.message}
              onClose={() => setToasts((v) => v.filter((x) => x.id !== t.id))}
            />
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}
