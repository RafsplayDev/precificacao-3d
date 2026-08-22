"use client";
import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local"
  );
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
