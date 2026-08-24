"use client";

/**
 * O roteiro do tutorial.
 *
 * A ordem aqui não é a das telas: é a das dependências. Não dá para montar
 * um produto sem impressora e filamento, nem ver preço sem produto. Quem
 * chega e clica em "Calculadora" primeiro encontra uma tela vazia e conclui
 * que o app não faz nada — o roteiro existe para essa pessoa nunca passar
 * por esse momento.
 *
 * Cada passo aponta para um elemento pelo atributo `data-tutorial`. Ligar o
 * passo ao elemento por atributo, e não por seletor de classe, é o que
 * impede o tutorial de quebrar em silêncio quando o CSS muda: se o alvo
 * some, o passo vira um cartão centralizado em vez de destacar o lugar
 * errado.
 *
 * `aba` e `abaProduto` mandam a tela abrir a seção certa antes do destaque
 * — a pessoa não deveria ter que adivinhar em qual aba está o que o texto
 * está descrevendo.
 *
 * `opcional` marca os passos que oferecem "Pular esta parte": insumo e mão
 * de obra são reais, mas nem todo mundo usa, e travar o tutorial neles
 * custaria a compra de quem só quer ver o preço sair.
 */
export const PASSOS = [
  {
    id: "inicio",
    rota: "/cadastros",
    titulo: "Vamos precificar uma peça sua de verdade",
    texto:
      "São sete minutos. Use dados reais — a sua impressora, o filamento que está na bancada, " +
      "a sua conta de luz. No fim você vai ter o preço de uma peça sua, não de um exemplo.",
    acao: "Começar",
  },
  {
    id: "abas",
    rota: "/cadastros",
    aba: "impressoras",
    alvo: "cadastros-abas",
    titulo: "Tudo que a calculadora usa mora aqui",
    texto:
      "Cada aba é um pedaço do seu custo. Vamos passar pelas que importam agora e pular as " +
      "que você pode preencher depois.",
  },
  {
    id: "impressora",
    rota: "/cadastros",
    aba: "impressoras",
    alvo: "cadastros-tabela",
    titulo: "Comece pela impressora",
    texto:
      "Clique em Adicionar impressora e preencha com a sua: quanto ela custou, quantas horas por " +
      "dia ela roda e a potência. Daqui saem o desgaste, a manutenção e o retorno do investimento " +
      "embutidos em cada peça.",
    exigeLinha: "impressoras",
  },
  {
    id: "filamento",
    rota: "/cadastros",
    aba: "filamentos",
    alvo: "cadastros-tabela",
    titulo: "Agora o filamento",
    texto:
      "Peso do carretel e quanto você pagou nele. O custo por grama sai da divisão e é ele que " +
      "transforma os gramas da sua peça em reais.",
    exigeLinha: "filamentos",
  },
  {
    id: "tarifa",
    rota: "/cadastros",
    aba: "geral",
    alvo: "geral-energia",
    titulo: "A sua conta de luz",
    texto:
      "Pegue o valor do kWh na última fatura. É o único número aqui que não muda de peça para " +
      "peça — e é o que a maioria esquece de cobrar.",
  },
  {
    id: "markup",
    rota: "/cadastros",
    aba: "geral",
    alvo: "geral-markup",
    titulo: "Quanto você quer multiplicar",
    texto:
      "O markup é o que separa custo de preço. 2,0 no varejo e 1,5 no atacado são um ponto de " +
      "partida honesto; ajuste depois de ver o preço sair.",
  },
  {
    id: "insumos",
    rota: "/cadastros",
    aba: "insumos",
    alvo: "cadastros-tabela",
    titulo: "Argola, saquinho, tinta",
    texto:
      "O que entra na peça mas não sai da impressora. Diga quanto pagou e quanto veio no pacote " +
      "— o custo por unidade sai sozinho. Não usa nada disso? Pule.",
    opcional: true,
  },
  {
    id: "maoobra",
    rota: "/cadastros",
    aba: "maos_obra",
    alvo: "cadastros-tabela",
    titulo: "O seu tempo vale dinheiro",
    texto:
      "Lixar, pintar, montar, modelar. Cadastre pelo menos um tipo de trabalho com o valor da sua " +
      "hora — é o custo que some das planilhas e come a margem inteira.",
    opcional: true,
  },
  {
    id: "ir-produtos",
    rota: "/cadastros",
    alvo: "nav-produtos",
    titulo: "A base está pronta",
    texto:
      "Impressora, filamento e tarifa valem para o negócio inteiro — você não mexe mais nisso. " +
      "Agora vamos montar a peça que você quer vender.",
    acao: "Ir para Produtos",
  },
  {
    id: "novo-produto",
    rota: "/produtos",
    alvo: "produtos-novo",
    titulo: "Crie o seu produto",
    texto:
      "Dê o nome do que você vende de verdade. Um produto pode ter várias peças impressas — o " +
      "vaso e a base, o corpo e a tampa.",
    exigeLinha: "produtos",
  },
  {
    id: "pecas",
    rota: "/produtos",
    abaProduto: "pecas",
    alvo: "produto-pecas",
    titulo: "As peças impressas",
    texto:
      "Abra o produto e adicione uma peça: tempo de impressão, peso em gramas, qual impressora e " +
      "qual filamento. Material, energia, manutenção e falhas saem tudo dessas quatro respostas.",
  },
  {
    id: "prod-insumos",
    rota: "/produtos",
    abaProduto: "insumos",
    alvo: "produto-insumos",
    titulo: "O que mais entra nesta peça",
    texto:
      "Escolha um insumo cadastrado e diga a quantidade na unidade dele — 2 argolas, 15 ml de " +
      "tinta. O valor vem do custo por unidade.",
    opcional: true,
  },
  {
    id: "prod-trabalho",
    rota: "/produtos",
    abaProduto: "trabalho",
    alvo: "produto-trabalho",
    titulo: "Quantos minutos seus",
    texto:
      "Diga quantos minutos de produção e de acabamento esta peça leva. Se os minutos são de um " +
      "lote, preencha as unidades atendidas e o valor vira o de uma peça só.",
    opcional: true,
  },
  {
    id: "ir-calculadora",
    rota: "/produtos",
    alvo: "nav-calculadora",
    titulo: "Pronto para ver o preço",
    texto: "Todo custo já está cadastrado. Agora é só olhar o resultado.",
    acao: "Ver o preço",
  },
  {
    id: "calc-pilha",
    rota: "/",
    alvo: "calc-pilha",
    titulo: "O custo real da sua peça",
    texto:
      "Este é o número que quase ninguém tem: tudo que sai do seu bolso para essa peça existir. " +
      "A barra colorida mostra de onde vem cada pedaço — e quanto sobra de margem.",
  },
  {
    id: "calc-custos",
    rota: "/",
    alvo: "calc-custos",
    titulo: "Linha por linha, sem mistério",
    texto:
      "Material, energia, desgaste, falhas, seu tempo. Desmarque uma linha e veja o preço mudar " +
      "na hora — é assim que você descobre o que está te custando caro.",
  },
  {
    id: "calc-sugeridos",
    rota: "/",
    alvo: "calc-sugeridos",
    titulo: "O preço sugerido",
    texto:
      "Custo vezes markup, no varejo e no atacado. Prefere fechar num valor redondo? Troque para " +
      "Preço definido e a calculadora mostra a margem que sobra.",
  },
  {
    id: "calc-preco",
    rota: "/",
    alvo: "calc-preco",
    titulo: "O que sobra no seu bolso",
    texto:
      "Taxa de marketplace e imposto entram aqui, no preço final — não na sua margem. Este é o " +
      "lucro líquido de verdade. Daqui em diante a calculadora é sua: mexa nos números e veja o " +
      "preço responder.",
    acao: "Terminei",
  },
];

export const TOTAL_PASSOS = PASSOS.length;
