import { abrir, json, respostaDeErro, TABELAS } from "@/lib/servidor/dados";

export const dynamic = "force-dynamic";

/** O banco inteiro da conta, numa ida só. O volume é pequeno (dezenas de linhas). */
export async function GET(req) {
  const { resposta, user, banco } = await abrir(req);
  if (resposta) return resposta;
  try {
    const nomes = Object.keys(TABELAS);
    const consultas = nomes.map((t) => {
      const def = TABELAS[t];
      return def.unicaPorConta
        ? banco.prepare(`SELECT user_id AS id, * FROM ${t} WHERE user_id = ?`).bind(user.id)
        : banco.prepare(`SELECT * FROM ${t} WHERE user_id = ? ORDER BY ${def.ordem}`).bind(user.id);
    });
    const res = await banco.batch(consultas);
    return json(Object.fromEntries(nomes.map((t, i) => [t, res[i].results || []])));
  } catch (e) {
    return respostaDeErro(e);
  }
}
