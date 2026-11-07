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

/**
 * Sem emoji: a chamada e a vantagem extra são texto. Os ícones são do
 * próprio site, e um emoji vindo da tarefa destoaria deles.
 */
function semEmoji(v) {
  if (v == null) return v;
  return String(v)
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function numero(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function urlHttps(v) {
  try {
    const u = new URL(String(v));
    return u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

function slug(v) {
  return String(v || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** As duas lojas aceitas, com os domínios de cada uma. */
export const LOJAS = {
  shopee: {
    nome: "Shopee",
    daLoja: "da Shopee",
    hosts: ["shopee.com.br", "s.shopee.com.br", "shp.ee"],
  },
  "mercado-livre": {
    nome: "Mercado Livre",
    daLoja: "do Mercado Livre",
    hosts: ["mercadolivre.com.br", "mercadolivre.com", "meli.la", "mercadolibre.com"],
  },
};

const APELIDOS = {
  shopee: "shopee", "shopee-brasil": "shopee",
  "mercado-livre": "mercado-livre", mercadolivre: "mercado-livre", ml: "mercado-livre",
  meli: "mercado-livre", "mercado-libre": "mercado-livre",
};

export function codigoLoja(v) {
  return APELIDOS[slug(v)] || null;
}

/** A URL é https e é mesmo da loja (ou de um subdomínio dela)? */
function daLoja(v, loja) {
  const u = urlHttps(v);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  const ok = LOJAS[loja].hosts.some((h) => host === h || host.endsWith("." + h));
  return ok ? u.toString() : null;
}

function data(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString();
}

/** Campos opcionais: numa atualização, só mudam os que vieram no envio. */
const OPCIONAIS = ["chamada", "condicao_preco", "observacao", "descricao", "categoria", "imagem_url", "url_produto", "link_afiliado", "preco",
  "preco_original", "avaliacao", "num_avaliacoes", "vendas", "comissao_pct", "selo",
  "cupom_codigo", "cupom_descricao", "cupom_validade", "pontuacao", "ativo", "expira_em"];

/**
 * Valida um produto vindo da tarefa. Devolve { ok, enviados } ou { erro }.
 * Obrigatórios: origem_id, loja (shopee | mercado-livre), titulo e pelo
 * menos um link (link_afiliado ou url_produto), sempre do domínio da loja.
 */
export function normalizarProduto(p) {
  if (!p || typeof p !== "object") return { erro: "item não é um objeto" };
  const origem_id = texto(p.origem_id ?? p.id_origem ?? p.sku, 200);
  if (!origem_id) return { erro: "falta origem_id" };
  const loja = codigoLoja(p.loja);
  if (!loja) return { erro: `${origem_id}: loja precisa ser "shopee" ou "mercado-livre"` };
  const titulo = texto(p.titulo, 160);
  if (!titulo) return { erro: `${origem_id}: falta titulo` };

  const link_afiliado = p.link_afiliado ? daLoja(p.link_afiliado, loja) : null;
  if (p.link_afiliado && !link_afiliado) {
    return { erro: `${origem_id}: link_afiliado precisa ser https e do domínio ${LOJAS[loja].daLoja}` };
  }
  const url_produto = p.url_produto ? daLoja(p.url_produto, loja) : null;
  if (p.url_produto && !url_produto) {
    return { erro: `${origem_id}: url_produto precisa ser https e do domínio ${LOJAS[loja].daLoja}` };
  }
  if (!link_afiliado && !url_produto) return { erro: `${origem_id}: envie link_afiliado ou url_produto` };

  const cat = slug(p.categoria);
  const avaliacao = numero(p.avaliacao);
  const inteiro = (v) => (numero(v) === null ? null : Math.round(numero(v)));
  const cupom = texto(p.cupom_codigo, 40);

  const enviados = OPCIONAIS.filter((c) => Object.prototype.hasOwnProperty.call(p, c));
  // Um link vazio no envio não apaga o que já estava salvo (por exemplo, o
  // link do Mercado Livre que você colou no /admin).
  const semLink = enviados.indexOf("link_afiliado");
  if (semLink >= 0 && !link_afiliado) enviados.splice(semLink, 1);

  return {
    enviados: ["loja", "titulo", ...enviados],
    ok: {
      origem_id,
      loja,
      titulo,
      descricao: texto(p.descricao, 400),
      chamada: texto(semEmoji(p.chamada), 70),
      condicao_preco: texto(p.condicao_preco, 20),
      observacao: texto(semEmoji(p.observacao), 70),
      categoria: CATEGORIAS.includes(cat) ? cat : "outros",
      imagem_url: p.imagem_url && urlHttps(p.imagem_url) ? urlHttps(p.imagem_url).toString() : null,
      url_produto,
      link_afiliado,
      preco: numero(p.preco),
      preco_original: numero(p.preco_original),
      avaliacao: avaliacao === null ? null : Math.min(Math.max(avaliacao, 0), 5),
      num_avaliacoes: inteiro(p.num_avaliacoes),
      vendas: inteiro(p.vendas),
      comissao_pct: numero(p.comissao_pct),
      selo: texto(p.selo, 30),
      cupom_codigo: cupom ? cupom.toUpperCase().replace(/\s+/g, "") : null,
      cupom_descricao: texto(p.cupom_descricao, 120),
      cupom_validade: data(p.cupom_validade),
      pontuacao: numero(p.pontuacao) ?? 0,
      ativo: p.ativo === false || p.ativo === 0 ? 0 : 1,
      expira_em: data(p.expira_em),
    },
  };
}

export { MAX_LOTE };

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
export function paraVitrine(a, medalha) {
  const cupomValendo = a.cupom_codigo && (!a.cupom_validade || a.cupom_validade > new Date().toISOString());
  return {
    id: a.id,
    loja: LOJAS[a.loja]?.nome || a.loja,
    loja_codigo: a.loja,
    titulo: a.titulo,
    chamada: a.chamada,
    condicao_preco: a.condicao_preco,
    observacao: a.observacao,
    descricao: a.descricao,
    categoria: a.categoria,
    imagem_url: a.imagem_url,
    preco: a.preco,
    preco_original: a.preco_original,
    avaliacao: a.avaliacao,
    num_avaliacoes: a.num_avaliacoes,
    selo: a.selo,
    cupom: cupomValendo ? { codigo: a.cupom_codigo, descricao: a.cupom_descricao } : null,
    medalha: medalha?.nivel ? { nivel: medalha.nivel, motivo: medalha.motivo } : null,
    href: `/api/anuncios/${a.id}/ir`,
  };
}
