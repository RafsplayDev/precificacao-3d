import "server-only";
import { variavel } from "./cf";
import { usuarioDaRequisicao } from "./sessao";

/**
 * Regras da vitrine de afiliados.
 *
 * Quem abastece a vitrine é uma tarefa automática (Claude) que garimpa
 * produtos do ramo 3D e manda os aprovados para POST /api/anuncios com o
 * token ANUNCIOS_TOKEN. Esta é a "estrutura pronta": a tarefa só manda os
 * dados de cada produto, e aqui eles são validados, normalizados e gravados
 * — um produto que já existe (mesmo `origem_id`) é atualizado, não duplicado.
 */

export const CATEGORIAS = [
  "filamentos", "impressoras", "pecas-reposicao", "bicos-hotend", "mesas-superficies",
  "ferramentas", "acabamento", "resinas", "secadores-armazenamento", "eletronica",
  "upgrades", "outros",
];

const MAX_LOTE = 200;

function texto(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
}

function numero(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function urlHttps(v) {
  try {
    const u = new URL(String(v));
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function slug(v) {
  return String(v || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Valida um produto vindo da tarefa. Devolve { ok: linha } ou { erro }.
 * Campos obrigatórios: origem_id, loja, titulo, link_afiliado (https).
 */
export function normalizarProduto(p) {
  if (!p || typeof p !== "object") return { erro: "item não é um objeto" };
  const origem_id = texto(p.origem_id ?? p.id_origem ?? p.sku, 200);
  const loja = texto(p.loja, 60);
  const titulo = texto(p.titulo, 160);
  const link_afiliado = urlHttps(p.link_afiliado);
  if (!origem_id) return { erro: "falta origem_id" };
  if (!loja) return { erro: `${origem_id}: falta loja` };
  if (!titulo) return { erro: `${origem_id}: falta titulo` };
  if (!link_afiliado) return { erro: `${origem_id}: link_afiliado precisa ser uma URL https` };

  const cat = slug(p.categoria);
  const avaliacao = numero(p.avaliacao);
  const expira = p.expira_em ? new Date(p.expira_em) : null;

  // Numa atualização só mudam os campos que vieram: reenviar um produto sem
  // a imagem não apaga a imagem que já estava salva.
  const enviados = OPCIONAIS.filter((c) => Object.prototype.hasOwnProperty.call(p, c));

  return {
    enviados: ["loja", "titulo", "link_afiliado", ...enviados],
    ok: {
      origem_id,
      loja,
      titulo,
      descricao: texto(p.descricao, 400),
      categoria: CATEGORIAS.includes(cat) ? cat : "outros",
      imagem_url: p.imagem_url ? urlHttps(p.imagem_url) : null,
      link_afiliado,
      preco: numero(p.preco),
      preco_original: numero(p.preco_original),
      avaliacao: avaliacao === null ? null : Math.min(Math.max(avaliacao, 0), 5),
      num_avaliacoes: numero(p.num_avaliacoes) === null ? null : Math.round(numero(p.num_avaliacoes)),
      selo: texto(p.selo, 30),
      pontuacao: numero(p.pontuacao) ?? 0,
      ativo: p.ativo === false || p.ativo === 0 ? 0 : 1,
      expira_em: expira && !isNaN(expira) ? expira.toISOString() : null,
    },
  };
}

export { MAX_LOTE };

const OPCIONAIS = ["descricao", "categoria", "imagem_url", "preco", "preco_original", "avaliacao",
  "num_avaliacoes", "selo", "pontuacao", "ativo", "expira_em"];

/** A tarefa automática se identifica com `Authorization: Bearer <ANUNCIOS_TOKEN>`. */
export async function ehTarefa(req) {
  const esperado = await variavel("ANUNCIOS_TOKEN");
  const veio = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!esperado || esperado.length < 24 || !veio || veio.length !== esperado.length) return false;
  // comparação em tempo constante
  let dif = 0;
  for (let i = 0; i < veio.length; i++) dif |= veio.charCodeAt(i) ^ esperado.charCodeAt(i);
  return dif === 0;
}

/** Pode gerenciar anúncios: a tarefa (token) ou um admin logado. */
export async function podeGerenciar(req) {
  if (await ehTarefa(req)) return true;
  const user = await usuarioDaRequisicao(req);
  return !!user?.admin;
}

/** O que o navegador recebe: sem métricas internas, com o link de clique rastreado. */
export function paraVitrine(a) {
  return {
    id: a.id,
    loja: a.loja,
    titulo: a.titulo,
    descricao: a.descricao,
    categoria: a.categoria,
    imagem_url: a.imagem_url,
    preco: a.preco,
    preco_original: a.preco_original,
    avaliacao: a.avaliacao,
    num_avaliacoes: a.num_avaliacoes,
    selo: a.selo,
    href: `/api/anuncios/${a.id}/ir`,
  };
}
