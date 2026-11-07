import "server-only";
import { variavel } from "./cf";
import { sha256 } from "./sessao";

/**
 * Cliente da Open API do programa Shopee Afiliados (Brasil).
 *
 * Com o AppId e o Secret do painel (affiliate.shopee.com.br → Open API),
 * o servidor consegue sozinho:
 *   • buscar produtos com comissão (productOfferV2) — já devolve o link de
 *     afiliado de cada um (`offerLink`);
 *   • transformar qualquer link de produto em link de afiliado
 *     (generateShortLink).
 *
 * A autenticação é uma assinatura SHA-256 de AppId + timestamp + corpo +
 * Secret, mandada no cabeçalho Authorization. O corpo assinado tem de ser
 * exatamente o que vai na requisição, por isso ele é montado uma vez só.
 */
const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

export async function credenciaisShopee() {
  const limpar = (v) => String(v || "").trim();
  const appId = limpar(await variavel("SHOPEE_APP_ID"));
  const secret = limpar(await variavel("SHOPEE_APP_SECRET"));
  return appId && secret ? { appId, secret } : null;
}

async function chamar(query) {
  const cred = await credenciaisShopee();
  if (!cred) throw new Error("Faltam SHOPEE_APP_ID e SHOPEE_APP_SECRET.");
  const corpo = JSON.stringify({ query });
  const ts = Math.floor(Date.now() / 1000);
  const assinatura = await sha256(`${cred.appId}${ts}${corpo}${cred.secret}`);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `SHA256 Credential=${cred.appId}, Timestamp=${ts}, Signature=${assinatura}`,
    },
    body: corpo,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors?.length) {
    const msg = json.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`;
    throw new Error(`Shopee: ${msg}`);
  }
  return json.data;
}

/** Link comum de produto → link de afiliado (s.shopee.com.br/...). */
export async function gerarLinkShopee(url) {
  const data = await chamar(
    `mutation { generateShortLink(input: { originUrl: ${JSON.stringify(url)}, subIds: ["precifica"] }) { shortLink } }`
  );
  const link = data?.generateShortLink?.shortLink;
  if (!link) throw new Error("Shopee não devolveu o link.");
  return link;
}

/**
 * Busca produtos no catálogo de afiliados. `ordem`: 1 relevância,
 * 2 mais vendidos, 3 maior preço, 4 menor preço, 5 maior comissão.
 */
export async function buscarShopee({ termo, pagina = 1, limite = 20, ordem = 2 }) {
  const filtros = [
    `keyword: ${JSON.stringify(String(termo || "").slice(0, 100))}`,
    `sortType: ${Math.min(Math.max(Number(ordem) || 2, 1), 5)}`,
    `page: ${Math.max(Number(pagina) || 1, 1)}`,
    `limit: ${Math.min(Math.max(Number(limite) || 20, 1), 50)}`,
  ].join(", ");
  const data = await chamar(`{
    productOfferV2(${filtros}) {
      nodes {
        itemId productName imageUrl productLink offerLink
        priceMin priceMax priceDiscountRate
        commissionRate sales ratingStar shopName shopId
      }
      pageInfo { page limit hasNextPage }
    }
  }`);
  const r = data?.productOfferV2 || {};
  return {
    pagina: r.pageInfo,
    produtos: (r.nodes || []).map((n) => ({
      origem_id: `shopee:${n.itemId}`,
      loja: "shopee",
      titulo: n.productName,
      imagem_url: n.imageUrl,
      url_produto: n.productLink,
      link_afiliado: n.offerLink,
      preco: Number(n.priceMin) || null,
      preco_max: Number(n.priceMax) || null,
      desconto_pct: n.priceDiscountRate != null ? Number(n.priceDiscountRate) : null,
      comissao_pct: n.commissionRate != null ? Number(n.commissionRate) * 100 : null,
      vendas: n.sales != null ? Number(n.sales) : null,
      avaliacao: n.ratingStar != null ? Number(n.ratingStar) : null,
      vendedor: n.shopName,
    })),
  };
}
