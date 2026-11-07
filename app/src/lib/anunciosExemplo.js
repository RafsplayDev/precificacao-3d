/**
 * Produtos de EXEMPLO para desenhar a vitrine e o catálogo.
 *
 * Não são anúncios de verdade: os links não levam a lugar nenhum e as
 * imagens são ilustrações geradas aqui (SVG). Servem só para a prévia em
 * /admin/vitrine, onde dá para comparar os estilos sem depender da tarefa
 * já ter publicado produtos.
 */

/** Ilustração simples por categoria, nas cores de filamento do design system. */
function ilustracao(tipo, cor) {
  const fundo = "#F2F3F6";
  const desenhos = {
    carretel: `<circle cx="100" cy="100" r="70" fill="${cor}" stroke="#D9DCE1" stroke-width="2"/><circle cx="100" cy="100" r="62" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/><circle cx="100" cy="100" r="50" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/><circle cx="100" cy="100" r="26" fill="#2A2D34"/><circle cx="100" cy="100" r="12" fill="${fundo}"/>`,
    bico: `<rect x="72" y="40" width="56" height="40" rx="4" fill="#C9A227"/><polygon points="78,80 122,80 108,130 92,130" fill="#D9B53A"/><polygon points="92,130 108,130 102,150 98,150" fill="#B08A1C"/><rect x="40" y="152" width="120" height="6" rx="3" fill="${cor}" opacity=".7"/>`,
    mesa: `<rect x="30" y="70" width="140" height="70" rx="8" fill="#2A2D34" transform="skewX(-12) translate(18 0)"/><rect x="36" y="76" width="128" height="58" rx="6" fill="${cor}" transform="skewX(-12) translate(18 0)"/><g fill="#fff" opacity=".18"><circle cx="70" cy="95" r="3"/><circle cx="100" cy="110" r="3"/><circle cx="130" cy="95" r="3"/><circle cx="85" cy="122" r="3"/><circle cx="118" cy="122" r="3"/></g>`,
    secador: `<rect x="45" y="45" width="110" height="115" rx="14" fill="#2A2D34"/><rect x="58" y="58" width="84" height="60" rx="8" fill="${cor}" opacity=".9"/><circle cx="100" cy="88" r="20" fill="#2A2D34"/><circle cx="100" cy="88" r="8" fill="${fundo}"/><rect x="70" y="132" width="34" height="14" rx="4" fill="#0FD9A0"/><text x="87" y="143" font-family="monospace" font-size="10" fill="#08090B" text-anchor="middle">45°C</text>`,
    ferramenta: `<rect x="92" y="30" width="16" height="80" rx="6" fill="#2A2D34"/><polygon points="80,110 120,110 132,170 68,170" fill="${cor}"/><rect x="78" y="106" width="44" height="10" rx="3" fill="#8A9099"/>`,
    kit: `<rect x="40" y="70" width="120" height="80" rx="10" fill="#2A2D34"/><rect x="40" y="60" width="120" height="20" rx="8" fill="${cor}"/><g stroke="#B9BEC6" stroke-width="6" stroke-linecap="round"><line x1="62" y1="95" x2="62" y2="135"/><line x1="82" y1="95" x2="82" y2="135"/><line x1="102" y1="95" x2="102" y2="135"/><line x1="122" y1="95" x2="122" y2="135"/><line x1="140" y1="95" x2="140" y2="135"/></g>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${fundo}"/>${desenhos[tipo]}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const base = (i, p) => ({
  id: `exemplo-${i}`,
  href: "#exemplo",
  descricao: null,
  ...p,
  loja: p.loja_codigo === "shopee" ? "Shopee" : "Mercado Livre",
});

export const ANUNCIOS_EXEMPLO = [
  base(1, {
    chamada: "Arco-íris no carretel, lucro no bolso", condicao_preco: "no Pix",
    medalha: { nivel: "ouro", motivo: "Menor preço em 30 dias · 24% abaixo da média" },
    loja_codigo: "shopee", categoria: "filamentos",
    titulo: "Filamento PLA Silk 1kg 1,75mm Arco-íris Dupla Cor",
    imagem_url: ilustracao("carretel", "#FF2D6F"),
    preco: 89.9, preco_original: 119.9, avaliacao: 4.9, num_avaliacoes: 3210, selo: "Mais vendido",
    cupom: { codigo: "FILAMENTO10", descricao: "10% off acima de R$ 80" },
  }),
  base(2, {
    chamada: "O PETG que aguenta o tranco", observacao: "De 2 unidades em diante sai R$ 89,90 cada",
    medalha: null,
    loja_codigo: "mercado-livre", categoria: "filamentos",
    titulo: "Filamento PETG 1kg 1,75mm Preto Alta Resistência",
    imagem_url: ilustracao("carretel", "#15171B"),
    preco: 94.5, preco_original: null, avaliacao: 4.7, num_avaliacoes: 842, selo: "Frete grátis",
    cupom: null,
  }),
  base(3, {
    chamada: "Bico entupiu? Troca e segue o baile", condicao_preco: "o kit",
    medalha: { nivel: "prata", motivo: "12% abaixo da média de 30 dias (R$ 28,30)" },
    loja_codigo: "shopee", categoria: "bicos-hotend",
    titulo: "Kit 10 Bicos 0,4mm Latão MK8 para Ender 3 / CR-10",
    imagem_url: ilustracao("bico", "#FF7A18"),
    preco: 24.9, preco_original: 39.9, avaliacao: 4.8, num_avaliacoes: 5120, selo: null,
    cupom: { codigo: "BICO5", descricao: "R$ 5 off na primeira compra" },
  }),
  base(4, {
    chamada: "Peça soltando da mesa? Acabou o drama",
    medalha: { nivel: "bronze", motivo: "7% abaixo da média de 30 dias (R$ 85,90)" },
    loja_codigo: "mercado-livre", categoria: "mesas-superficies",
    titulo: "Mesa PEI Texturizada Magnética 235x235mm Dupla Face",
    imagem_url: ilustracao("mesa", "#C9A227"),
    preco: 79.9, preco_original: 109.9, avaliacao: 4.8, num_avaliacoes: 1395, selo: null,
    cupom: { codigo: "MESA15", descricao: "R$ 15 off acima de R$ 70" },
  }),
  base(5, {
    chamada: "Filamento úmido nunca mais", condicao_preco: "no Pix", estoque_baixo: 4,
    medalha: { nivel: "prata", motivo: "11% abaixo da média de 30 dias (R$ 212,40)" },
    loja_codigo: "shopee", categoria: "secadores-armazenamento",
    titulo: "Secador de Filamento com Controle de Temperatura e Umidade",
    imagem_url: ilustracao("secador", "#16C0F0"),
    preco: 189.0, preco_original: 249.0, avaliacao: 4.6, num_avaliacoes: 410, selo: "-24%",
    cupom: null,
  }),
  base(6, {
    chamada: null, medalha: null, esgotado_em: new Date(Date.now() - 3 * 3600e3).toISOString(),
    loja_codigo: "mercado-livre", categoria: "ferramentas",
    titulo: "Espátula de Remoção para Mesa de Impressora 3D Inox",
    imagem_url: ilustracao("ferramenta", "#7B5BFF"),
    preco: 19.9, preco_original: null, avaliacao: 4.5, num_avaliacoes: 260, selo: null,
    cupom: null,
  }),
  base(7, {
    chamada: "Acabamento de vitrine sem sair de casa",
    medalha: { nivel: "ouro", motivo: "Menor preço em 30 dias · 18% abaixo da média" },
    loja_codigo: "shopee", categoria: "acabamento",
    titulo: "Kit Acabamento 3D: Lixas, Estiletes e Rebarbador (12 peças)",
    imagem_url: ilustracao("kit", "#0FD9A0"),
    preco: 42.9, preco_original: 59.9, avaliacao: 4.7, num_avaliacoes: 978, selo: null,
    cupom: { codigo: "KIT3D", descricao: "Frete grátis acima de R$ 39" },
  }),
  base(8, {
    chamada: "Flexível como o seu prazo de entrega", observacao: "Leve 3 e ganhe 10% OFF",
    medalha: null,
    loja_codigo: "mercado-livre", categoria: "filamentos",
    titulo: "Filamento TPU Flexível 95A 500g 1,75mm Branco",
    imagem_url: ilustracao("carretel", "#FFFFFF"),
    preco: 69.9, preco_original: 79.9, avaliacao: 4.6, num_avaliacoes: 318, selo: null,
    cupom: null,
  }),
];
