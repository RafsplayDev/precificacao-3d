"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Toast } from "@/design-system";

const NAV = [
  { href: "/", label: "Calculadora" },
  { href: "/produtos", label: "Produtos" },
  { href: "/cadastros", label: "Cadastros" },
  { href: "/concorrentes", label: "Concorrentes" },
];

const ToastCtx = React.createContext(() => {});
export const useToast = () => React.useContext(ToastCtx);

export function AppShell({ children }) {
  const pathname = usePathname();
  const [toasts, setToasts] = React.useState([]);

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
            </nav>
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
