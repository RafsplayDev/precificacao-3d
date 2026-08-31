"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Toast, Icon } from "@/design-system";
import { supabase } from "@/lib/supabaseClient";
import { irPara } from "@/lib/navegar";
import { TutorialProvider, useTutorial } from "@/components/Tutorial";

const NAV = [
  { href: "/", label: "Calculadora", icone: "calculator", tour: "nav-calculadora" },
  { href: "/produtos", label: "Produtos", icone: "box", tour: "nav-produtos" },
  { href: "/cadastros", label: "Cadastros", icone: "layers", tour: "nav-cadastros" },
  // Gestão fica de fora do MVP: a tela continua inteira em
  // app/gestao/pagina-oculta.jsx e volta renomeando o arquivo para page.jsx e
  // devolvendo esta linha (e o "/gestao" na lista APP do middleware).
  // { href: "/gestao", label: "Gestão", icone: "trending-up" },
  { href: "/concorrentes", label: "Concorrentes", icone: "store" },
];

/**
 * Páginas que existem antes do acesso liberado. Elas se bastam: mostrar o
 * menu do app para quem ainda não pagou seria oferecer portas fechadas.
 */
const SEM_MENU = ["/entrar", "/assinar", "/vendas", "/tutorial"];

const ToastCtx = React.createContext(() => {});
export const useToast = () => React.useContext(ToastCtx);

export function AppShell({ children }) {
  return (
    <TutorialProvider>
      <Casca>{children}</Casca>
    </TutorialProvider>
  );
}

function Casca({ children }) {
  const pathname = usePathname();
  const reduzido = useReducedMotion();
  const [toasts, setToasts] = React.useState([]);
  const [conta, setConta] = React.useState(null);
  const [logado, setLogado] = React.useState(null);
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
      if (!vivo) return;
      // `false` e `null` querem dizer coisas diferentes: null é "ainda não
      // sei", e é o que segura a gaveta de oferecer criar conta a quem já
      // tem uma.
      setLogado(!!user);
      if (!user) return;
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
    // O carimbo do modo dura 24h e não tem por que sobreviver à sessão que
    // o gerou: deixá-lo para trás faria a próxima pessoa neste navegador
    // ser tratada como se estivesse no teste de outra.
    document.cookie = "dc_modo=; Max-Age=0; path=/";
    irPara("/entrar");
  }

  // O ícone só existe na barra do rodapé: no header o menu é texto, como sempre foi.
  // O realce da aba atual é um elemento só, que desliza de uma para a outra —
  // dois `layoutId` porque header e rodapé são listas independentes.
  const links = (comIcone) =>
    itens.map((n) => {
      const atual = pathname === n.href;
      return (
        <Link
          key={n.href}
          href={n.href}
          aria-current={atual ? "page" : undefined}
          data-tutorial={n.tour}
        >
          {atual && (
            <motion.span
              layoutId={comIcone ? "aba-rodape" : "aba-topo"}
              className="ap-nav__marca"
              aria-hidden="true"
              transition={
                reduzido
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 400, damping: 34, mass: 0.7 }
              }
            />
          )}
          <span className="ap-nav__rot">
            {comIcone && <Icon name={n.icone} size={20} />}
            {comIcone ? <span className="ap-nav__txt">{n.label}</span> : n.label}
          </span>
        </Link>
      );
    });

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

                {/* Sem conta a gaveta continua existindo: é ali que mora o
                    "ver o tutorial" e o convite para se cadastrar.
                    Um botão de perfil que abre o vazio seria pior que não
                    ter botão. */}
                {(conta || logado === false) && (
                  <div className={"ap-gaveta" + (aberto === "perfil" ? " is-open" : "")}>
                    <div className="ap-conta">
                      <span className="ap-conta__email">
                        {conta ? conta.email : "Você está no teste grátis"}
                      </span>
                      {/* Só no teste: o tutorial é a demonstração de quem
                          ainda não comprou. Quem já tem conta passou por ele
                          e não precisa do atalho ocupando a gaveta. */}
                      {!conta && <RepetirTutorial />}
                      {conta ? (
                        <button type="button" onClick={sair}>Sair</button>
                      ) : (
                        <Link href="/entrar?modo=criar">Criar minha conta</Link>
                      )}
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

/** Ver o tutorial de novo — de dentro da gaveta da conta, onde ninguém tropeça nele. */
function RepetirTutorial() {
  const { iniciar } = useTutorial();
  return (
    <button type="button" onClick={iniciar}>
      Ver o tutorial
    </button>
  );
}
