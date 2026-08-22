"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Toast } from "@/design-system";
import { supabase } from "@/lib/supabaseClient";
import { irPara } from "@/lib/navegar";

const NAV = [
  { href: "/", label: "Calculadora" },
  { href: "/produtos", label: "Produtos" },
  { href: "/cadastros", label: "Cadastros" },
  { href: "/concorrentes", label: "Concorrentes" },
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

  async function sair() {
    await supabase.auth.signOut();
    irPara("/entrar");
  }

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
                <nav className="ap-nav">
                  {NAV.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      aria-current={pathname === n.href ? "page" : undefined}
                    >
                      {n.label}
                    </Link>
                  ))}
                  {extras.afiliado && (
                    <Link href="/afiliado" aria-current={pathname === "/afiliado" ? "page" : undefined}>
                      Indicações
                    </Link>
                  )}
                  {extras.admin && (
                    <Link href="/admin" aria-current={pathname === "/admin" ? "page" : undefined}>
                      Admin
                    </Link>
                  )}
                </nav>

                {conta && (
                  <div className="ap-conta">
                    <span className="ap-conta__email">{conta.email}</span>
                    <button type="button" onClick={sair}>Sair</button>
                  </div>
                )}
              </>
            )}
          </div>
        </header>

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
