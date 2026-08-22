"use client";
import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  const faltando = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  // Quem lê este erro está em um de dois lugares, e a correção é diferente
  // em cada um. A mensagem antiga mandava todo mundo para o .env.local, que
  // no build da Vercel não existe — e o erro parecia um bug do código.
  const onde = process.env.VERCEL
    ? "Cadastre em Settings > Environment Variables e refaça o deploy."
    : "Defina no arquivo .env.local (veja .env.example).";

  throw new Error(`Falta ${faltando.join(" e ")}. ${onde}`);
}

/**
 * Cliente do navegador.
 *
 * Antes era o createClient comum, que guarda a sessão no localStorage. O
 * localStorage não viaja nas requisições, então o middleware — que roda no
 * servidor — não teria como saber quem está logado, e o paywall seria
 * inaplicável. O createBrowserClient guarda a sessão em cookies, que o
 * servidor lê. O export continua sendo `supabase`, então as páginas que já
 * existiam não mudam em nada.
 */
export const supabase = createBrowserClient(url, key);
