import Link from "next/link";

/** Moldura comum das páginas de privacidade e termos. */
export function PaginaLegal({ titulo, atualizado, children }) {
  return (
    <article className="ap-legal">
      <Link href="/entrar" className="ap-legal__voltar">← Precificação 3D</Link>
      <h1>{titulo}</h1>
      <p className="ap-legal__data">Atualizado em {atualizado}</p>
      {children}
    </article>
  );
}

export const CONTATO = "dropcolorec@gmail.com";
