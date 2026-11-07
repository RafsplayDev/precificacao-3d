import { abrir, json, lerLinha, conferirRefs, respostaDeErro, filtrarCampos } from "@/lib/servidor/dados";

export const dynamic = "force-dynamic";

/** Insere uma linha na conta e devolve o registro completo (com as colunas geradas). */
export async function POST(req, { params }) {
  const { tabela } = await params;
  const { resposta, user, banco, def } = await abrir(req, tabela);
  if (resposta) return resposta;
  if (def.unicaPorConta) return json({ message: "Use PATCH para esta tabela." }, 405);

  try {
    const campos = filtrarCampos(tabela, await req.json().catch(() => ({})));
    const ruim = await conferirRefs(banco, tabela, user.id, campos);
    if (ruim) return json({ message: ruim }, 400);

    const id = crypto.randomUUID();
    const cols = ["id", "user_id", ...Object.keys(campos)];
    const vals = [id, user.id, ...Object.values(campos)];
    await banco
      .prepare(`INSERT INTO ${tabela} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`)
      .bind(...vals)
      .run();
    return json(await lerLinha(banco, tabela, user.id, id), 201);
  } catch (e) {
    return respostaDeErro(e);
  }
}
