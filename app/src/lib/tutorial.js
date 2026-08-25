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
/**
 * As três etapas do roteiro, na ordem em que acontecem.
 *
 * Elas existem para responder à pergunta que todo tutorial longo provoca:
 * "quanto falta?". Dezoito passos numerados assustam; três etapas com nome
 * — Cadastro, Produto, Calculadora — descrevem um caminho que a pessoa
 * reconhece, e a barra de cada uma mostra o avanço sem transformar o
 * tutorial numa contagem regressiva.
 */
export const ETAPAS = [
  { id: "cadastro", nome: "Cadastro" },
  { id: "produto", nome: "Produto" },
  { id: "calculadora", nome: "Calculadora" },
];

export const PASSOS = [
  {
    id: "inicio",
    etapa: "cadastro",
    // Abre na calculadora, e não na tela de cadastros: é dela que a pessoa
    // vai sentir falta de dados, e é para ela que o roteiro volta no fim.
    rota: "/",
    titulo: "Descubra quanto cobrar pela sua peça",
    texto:
      "Use os dados reais: sua impressora, seu filamento, sua conta de luz. No fim você vai " +
      "saber o valor de venda da sua peça.",
    // A abertura não mostra etapa nem barra: antes de começar não há
    // avanço nenhum para relatar, e a promessa do caminho é o texto.
    semAvanco: true,
    acao: "Começar",
  },
  {
    id: "abas",
    etapa: "cadastro",
    // O passo acontece fora dos Cadastros de propósito: mandar tocar num
    // menu já aberto não ensina nada. Aqui a pessoa está na calculadora,
    // toca em Cadastros e a tela muda — o caminho fica sabido, não dito.
    rota: "/",
    // O foco é o item do menu, não a régua de abas: este passo apresenta a
    // tela de Cadastros, e destacar a faixa inteira de abas acendia meia
    // página sem dizer de onde ela veio.
    alvo: "nav-cadastros",
    // Quem avança é o toque no próprio menu. Um "Próximo" ao lado seria a
    // saída fácil, e a pessoa terminaria o passo sem nunca ter visto onde
    // fica a porta de que o texto está falando.
    aoClicar: true,
    titulo: "Comece pelos cadastros",
    texto:
      "A calculadora puxa tudo daqui. Cada aba é uma parte do custo — vamos pelas principais.",
  },
  {
    id: "impressora",
    etapa: "cadastro",
    rota: "/cadastros",
    aba: "impressoras",
    alvo: "cadastros-tabela",
    titulo: "Primeiro a impressora",
    texto:
      "Preencha com a sua impressora. Esses dados viram o custo de máquina de cada peça.\n" +
      "Toque em Adicionar impressora.",
    exigeLinha: "impressoras",
    destaque: "Adicionar impressora",
    // Os cadastros obrigatórios ganham o feixe no botão: a tabela chega
    // vazia e nada nela diz por onde se começa. Os passos que só explicam
    // não têm — quando o brilho aparece, é porque há um clique a dar.
    feixe: true,
  },
  {
    id: "filamento",
    etapa: "cadastro",
    rota: "/cadastros",
    aba: "filamentos",
    alvo: "cadastros-tabela",
    titulo: "Agora o filamento",
    texto:
      "Peso do carretel, quanto você pagou nele… Daí sai o custo por grama de cada peça.\n" +
      "Toque em Adicionar filamento.",
    exigeLinha: "filamentos",
    destaque: "Adicionar filamento",
    feixe: true,
  },
  {
    id: "tarifa",
    etapa: "cadastro",
    rota: "/cadastros",
    aba: "geral",
    alvo: "geral-energia",
    titulo: "Sua conta de luz",
    texto:
      "Já deixamos uma média aqui. Se tiver a fatura por perto, troque pelo seu kWh.",
  },
  {
    id: "extras",
    etapa: "cadastro",
    rota: "/cadastros",
    aba: "impressoras",
    alvo: "cadastros-abas",
    // A régua de abas aparece acesa, mas fechada: aqui ela é uma vitrine do
    // que existe, não um convite a sair do caminho. Markup, insumos e mão de
    // obra são reais e ninguém precisa deles para ver o primeiro preço —
    // cada um deles era um passo em que o roteiro parava.
    semToque: true,
    pulsaAcao: true,
    titulo: "Extras",
    texto: "Você ainda pode cadastrar insumos, markup, mão de obra e etc.",
    acao: "Ir para Produtos",
  },
  {
    id: "novo-produto",
    etapa: "produto",
    rota: "/produtos",
    alvo: "produtos-novo",
    // Cumprido, o passo aponta para o produto em vez do botão.
    alvoFeito: "produto-criado",
    titulo: "Crie o seu produto",
    texto: "Clique em Novo produto e dê o nome de um produto que você quer vender.",
    exigeLinha: "produtos",
  },
  {
    id: "pecas",
    etapa: "produto",
    rota: "/produtos",
    abaProduto: "pecas",
    alvo: "produto-pecas",
    titulo: "As peças impressas",
    texto:
      "Vamos cadastrar a primeira peça do seu produto: tempo, peso, impressora e filamento.\n" +
      "Toque em Adicionar peça.",
    exigeLinha: "pecas",
    destaque: "Adicionar peça",
    feixe: true,
  },
  {
    id: "ir-calculadora",
    etapa: "produto",
    rota: "/produtos",
    alvo: "nav-calculadora",
    // Sem botão: quem abre a calculadora é a pessoa, no menu. Insumos e mão
    // de obra ficaram para depois — nenhum dos dois muda o fato de que o
    // preço já pode aparecer, e cada um era mais uma parada antes dele.
    aoClicar: true,
    titulo: "Pronto para ver o preço",
    texto: "Todo custo já está cadastrado. Toque em Calculadora para ver o preço da sua peça.",
  },
  {
    // O preço primeiro, e o custo depois.
    //
    // A ordem antiga era a da planilha: custo, linhas, preço. Mas quem
    // chegou até aqui veio atrás de uma resposta — "por quanto eu vendo?"
    // —, e fazê-la esperar três cartões por ela era pedir paciência de
    // quem já deu sete minutos. Com o preço na tela, o custo deixa de ser
    // lição de casa e vira explicação de um número que ela já quer
    // entender.
    id: "calc-sugeridos",
    etapa: "calculadora",
    rota: "/",
    alvo: "calc-sugeridos",
    titulo: "O preço sugerido",
    texto: "Aqui está o preço da sua peça, no varejo e no atacado.",
  },
  {
    id: "calc-pilha",
    etapa: "calculadora",
    rota: "/",
    alvo: "calc-pilha",
    titulo: "O custo real da sua peça",
    texto:
      "Tudo que sai do seu bolso para essa peça existir. A barra mostra de onde vem cada pedaço.",
  },
  {
    id: "calc-custos",
    etapa: "calculadora",
    rota: "/",
    alvo: "calc-custos",
    titulo: "Linha por linha",
    texto:
      "Cada custo que entra na peça. Você pode desmarcar qualquer um e o preço se ajusta na hora.",
  },
  {
    id: "calc-preco",
    etapa: "calculadora",
    rota: "/",
    alvo: "calc-preco",
    titulo: "O que sobra no seu bolso",
    texto:
      "Escolha onde você vende e a calculadora desconta as taxas e impostos. O número final é o " +
      "seu lucro de verdade.",
    acao: "Terminei",
  },
];

export const TOTAL_PASSOS = PASSOS.length;
