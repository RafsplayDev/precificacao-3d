/**
 * A URL pública do site, do jeito que o Supabase e o Mercado Pago precisam.
 *
 * Existe porque o link de confirmação de e-mail chegava apontando para
 * http://localhost:3000: sem `emailRedirectTo`, o Supabase usa a "Site URL"
 * do painel dele, que ficou marcada como localhost desde o desenvolvimento.
 * Quem se cadastrava em produção recebia um link que só abre na máquina de
 * quem programou — e simplesmente não conseguia confirmar a conta.
 *
 * Em produção o valor vem de NEXT_PUBLIC_URL_SITE. No navegador, sem essa
 * variável, cai na origem da página aberta, que é o que faz o mesmo código
 * continuar funcionando em localhost e no túnel de teste.
 */
export function urlDoSite() {
  const cfg = process.env.NEXT_PUBLIC_URL_SITE;
  if (cfg) return cfg.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
