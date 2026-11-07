import { abrir, json, lerLinha, conferirRefs, respostaDeErro, filtrarCampos } from "@/lib/servidor/dados";

export const dynamic = "force-dynamic";

/** Atualiza uma linha da conta e devolve o registro atualizado. */
export async function PATCH(req, { params }) {
  const { tabela, id } = await params;
  const { resposta, user, banco, def } = await abrir(req, tabela);
  if (resposta) return resposta;

  try {
    const campos = filtrarCampos(tabela, await req.json().catch(() => ({})));
    const ruim = await conferirRefs(banco, tabela, user.id, campos);
    if (ruim) return json({ message: ruim }, 400);

    const sets = Object.keys(campos).map((c) => `${c} = ?`);
    const vals = Object.values(campos);
    if (def.tocaUpdatedAt) sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    if (def.unicaPorConta) sets.push("atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ','now')");

    if (sets.length) {
      const onde = def.unicaPorConta ? "user_id = ?" : "id = ? AND user_id = ?";
      const chaves = def.unicaPorConta ? [user.id] : [id, user.id];
      await banco.prepare(`UPDATE ${tabela} SET ${sets.join(", ")} WHERE ${onde}`).bind(...vals, ...chaves).run();
    }

    const linha = await lerLinha(banco, tabela, user.id, id);
    if (!linha) return json({ message: "Este registro não existe mais." }, 404);
    return json(linha);
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function DELETE(req, { params }) {
  const { tabela, id } = await params;
  const { resposta, user, banco, def } = await abrir(req, tabela);
  if (resposta) return resposta;
  if (def.unicaPorConta) return json({ message: "Esta tabela não pode ser apagada." }, 405);

  try {
    await banco.prepare(`DELETE FROM ${tabela} WHERE id = ? AND user_id = ?`).bind(id, user.id).run();
    return json({ ok: true });
  } catch (e) {
    return respostaDeErro(e);
  }
}
