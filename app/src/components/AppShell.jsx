"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Toast, Icon } from "@/design-system";
import { irPara } from "@/lib/navegar";
import { Vitrine } from "@/components/Vitrine";
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
  { href: "/achados", label: "Achados", icone: "shopping-bag" },
];

/** Páginas que se bastam: sem menu do app e sem a vitrine no rodapé. */
const SEM_MENU = ["/entrar", "/tutorial", "/privacidade", "/termos"];

/** Onde a vitrine de afiliados não aparece no rodapé. */
const SEM_VITRINE = ["/entrar", "/admin", "/tutorial", "/privacidade", "/termos", "/achados"];

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
  // "perfil" ou nada: a única gaveta que resta é a da conta.
  const [aberto, setAberto] = React.useState(null);
  const alternar = (qual) => setAberto((v) => (v === qual ? null : qual));
  const inicial = (conta?.email || "?").trim().charAt(0).toUpperCase();
  const itens = React.useMemo(() => [
    ...NAV,
    ...(conta?.admin ? [{ href: "/admin", label: "Anúncios", icone: "megaphone" }] : []),
  ], [conta?.admin]);

  const publica = SEM_MENU.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const { ativo: emTutorial } = useTutorial();
  // Durante o tutorial a vitrine sai de cena: o guia já disputa a atenção
  // da pessoa com a tela inteira, e um anúncio ali seria só mais ruído.
  const comVitrine = !emTutorial && !SEM_VITRINE.some((p) => pathname === p || pathname.startsWith(p + "/"));

  React.useEffect(() => {
    if (publica || conta) return;
    let vivo = true;
    fetch("/api/auth/eu", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => vivo && setConta(d.user || null))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [publica, conta]);

  React.useEffect(() => {
    setAberto(null);
  }, [pathname]);

  async function sair() {
    await fetch("/api/auth/sair", { method: "POST" }).catch(() => {});
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

                {conta && (
                  <div className={"ap-gaveta" + (aberto === "perfil" ? " is-open" : "")}>
                    <div className="ap-conta">
                      {conta.foto_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="ap-conta__foto" src={conta.foto_url} alt="" referrerPolicy="no-referrer" />
                      )}
                      <span className="ap-conta__email">{conta.email}</span>
                      <RepetirTutorial />
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

        <main className="ap-main">
          {children}
          {comVitrine && <Vitrine key={pathname} limite={4} recarregarEm={pathname} />}
        </main>

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
