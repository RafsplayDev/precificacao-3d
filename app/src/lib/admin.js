import { supabaseServidor, supabaseAdmin } from "@/lib/supabaseServer";

/**
 * Porteiro das rotas /api/admin.
 *
 * Devolve { admin } quando pode passar, ou { erro, status } quando não.
 * A conferência é feita contra a tabela `admins` com a service_role, e não
 * com o que o navegador diz ser: esconder o botão no front não protege a
 * rota, que continua alcançável por um POST direto.
 */
export async function exigirAdmin() {
  const sb = supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { erro: "Faça login.", status: 401 };

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return { erro: "Sem permissão.", status: 403 };
  return { admin, user };
}

/**
 * Código de indicação: 8 caracteres, sem 0/O/1/I/L.
 * Ele é ditado por telefone e digitado à mão, então os pares que se
 * confundem visualmente ficam de fora do alfabeto.
 */
export function gerarCodigo() {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let saida = "";
  for (let i = 0; i < 8; i++) {
    saida += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return saida;
}
