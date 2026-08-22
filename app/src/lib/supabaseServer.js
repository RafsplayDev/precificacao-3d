import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Cliente para route handlers e Server Components: enxerga o usuário logado
 * através dos cookies e respeita o RLS, como o navegador.
 */
export function supabaseServidor() {
  const jar = cookies();
  return createServerClient(url, publishable, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (lista) => {
        // Em Server Components os cookies são somente leitura. Quem renova a
        // sessão de verdade é o middleware; aqui o erro é esperado e inócuo.
        try {
          lista.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {}
      },
    },
  });
}

/**
 * Cliente administrativo: usa a service_role e portanto IGNORA o RLS.
 *
 * É o que permite ao webhook do Mercado Pago ativar a licença de alguém sem
 * estar logado como essa pessoa. Nunca importe este arquivo em um componente
 * "use client": a chave vazaria para o navegador e daria a qualquer visitante
 * acesso irrestrito ao banco.
 */
export function supabaseAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor.");
  }
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
