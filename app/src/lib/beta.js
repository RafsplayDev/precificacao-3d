/**
 * O filtro do beta fechado — perguntas, critério e decisão.
 *
 * Está isolado de propósito: a página, a API e o banco só sabem que existe
 * uma função `decidir`. Hoje ela é binária (um "barra" reprova); quando o
 * filtro virar pontuação com nota de corte, só este arquivo muda.
 */

/** Vagas do lote de fundador. */
export const VAGAS = 20;

/**
 * O preço do lote de fundador, em centavos.
 *
 * Fica aqui e não em produto.js porque é o preço de uma janela, não o preço
 * do produto: acabado o lote, o vitalício deixa de existir e a tabela volta
 * a mandar. Enquanto o beta estiver de pé, a precificação do painel de admin
 * precisa estar neste mesmo valor — é dela que sai a cobrança.
 */
export const PRECO_FUNDADOR_CENTAVOS = 3900;

/** Quanto tempo a vaga de quem passou fica reservada antes do pagamento. */
export const HORAS_DE_RESERVA = 24;

/**
 * As perguntas, na ordem em que aparecem.
 *
 * `passa: false` marca a resposta que reprova.
 *
 * `porque` não está sendo exibido: a tela ficou só com a pergunta e as
 * opções. O texto continua aqui porque foi escrito com uma regra que vale
 * para qualquer versão futura dele — diz o que a resposta informa sobre o
 * uso da ferramenta, e nunca qual opção passa. Entregar o critério seria
 * ensinar a mentir no formulário, e um lote de 20 pessoas escolhidas por
 * respostas ensaiadas não devolve o feedback que justifica o filtro.
 */
export const PERGUNTAS = [
  {
    id: "vende",
    // Nome curto para as tabelas do admin, onde a pergunta inteira não cabe.
    curto: "Vende",
    titulo: "Você já vende peças impressas?",
    porque:
      "Cada perfil de vendedor usa a calculadora de um jeito. Isso define o que testamos primeiro.",
    opcoes: [
      { valor: "nao", rotulo: "Não vendo ainda", passa: false },
      { valor: "ocasional", rotulo: "Vendas ocasionais", passa: true },
      { valor: "regular", rotulo: "Vendo com regularidade", passa: true },
      { valor: "principal", rotulo: "É minha renda principal", passa: true },
    ],
  },
  {
    id: "como_calcula",
    // Nome curto para as tabelas do admin, onde a pergunta inteira não cabe.
    curto: "Como calcula",
    titulo: "Como você calcula seu preço hoje?",
    porque:
      "Queremos comparar o resultado do PRECIFICA com o método que você já usa.",
    opcoes: [
      { valor: "olho", rotulo: "No olho / chuto", passa: true },
      { valor: "concorrente", rotulo: "Olho o preço do concorrente", passa: true },
      { valor: "filamento_margem", rotulo: "Filamento + uma margem", passa: true },
      { valor: "planilha", rotulo: "Planilha própria ou baixada", passa: true },
      { valor: "ia", rotulo: "Uso IA (ChatGPT, Gemini etc.)", passa: true },
      { valor: "ferramenta_paga", rotulo: "Uso uma ferramenta paga", passa: false },
    ],
  },
  {
    id: "impressoras",
    // Nome curto para as tabelas do admin, onde a pergunta inteira não cabe.
    curto: "Impressoras",
    titulo: "Quantas impressoras você tem?",
    porque:
      "O cálculo de depreciação e desgaste muda conforme o parque de máquinas.",
    opcoes: [
      { valor: "0", rotulo: "Nenhuma", passa: false },
      { valor: "1a3", rotulo: "1 a 3", passa: true },
      { valor: "4mais", rotulo: "4 ou mais", passa: true },
    ],
  },
  {
    id: "prejuizo",
    // Nome curto para as tabelas do admin, onde a pergunta inteira não cabe.
    curto: "Já viu prejuízo",
    titulo:
      "Você já vendeu uma peça e depois percebeu que tinha lucrado menos do que esperava — ou até saído no prejuízo?",
    porque:
      "O PRECIFICA costuma revelar custos esquecidos. Saber sua experiência ajuda a medir o impacto real.",
    opcoes: [
      { valor: "sim", rotulo: "Sim, já aconteceu", passa: true },
      { valor: "nunca_conferi", rotulo: "Nunca conferi se lucrei", passa: false },
      { valor: "confiro", rotulo: "Confiro sempre e meus preços estão certos", passa: true },
    ],
  },
  {
    id: "feedback",
    // Nome curto para as tabelas do admin, onde a pergunta inteira não cabe.
    curto: "Topa dar feedback",
    titulo: "Aceita preencher um formulário daqui duas semanas sobre o sistema?",
    porque:
      "O lote de fundador é uma troca: acesso antecipado por retorno de quem usa.",
    opcoes: [
      { valor: "sim", rotulo: "Sim, topo", passa: true },
      { valor: "nao", rotulo: "Não, ou talvez", passa: false },
    ],
  },
];

/** A opção escolhida, ou undefined se a resposta não existir no formulário. */
function opcaoDe(pergunta, respostas) {
  return pergunta.opcoes.find((o) => o.valor === respostas?.[pergunta.id]);
}

/** Todas as perguntas foram respondidas com um valor que existe? */
export function completo(respostas) {
  return PERGUNTAS.every((p) => Boolean(opcaoDe(p, respostas)));
}

/**
 * Quem responde a pergunta N ainda está passando?
 *
 * Serve para a tela tratar de um jeito quem continua no páreo. O compromisso
 * de feedback só é pedido com cerimônia a quem chegou até ele passando: para
 * quem já esbarrou em alguma pergunta, pedir um juramento seria encenação —
 * o resultado já está decidido.
 */
export function passandoAte(respostas, ate) {
  return PERGUNTAS.slice(0, ate).every((p) => {
    const o = opcaoDe(p, respostas);
    return o ? o.passa : false;
  });
}

/**
 * A decisão.
 *
 * Devolve também quais perguntas barraram — quem responde não vê essa lista,
 * mas ela é o que permite entender depois por que o lote ficou como ficou.
 */
export function decidir(respostas) {
  if (!completo(respostas)) {
    return { aprovado: false, incompleto: true, barrou: [] };
  }
  const barrou = PERGUNTAS.filter((p) => !opcaoDe(p, respostas).passa).map((p) => p.id);
  return { aprovado: barrou.length === 0, incompleto: false, barrou };
}

/** Só os campos que o filtro conhece — o resto do corpo do request é descartado. */
export function limparRespostas(bruto) {
  const limpo = {};
  for (const p of PERGUNTAS) {
    const v = bruto?.[p.id];
    if (p.opcoes.some((o) => o.valor === v)) limpo[p.id] = v;
  }
  return limpo;
}

/**
 * As respostas de uma candidatura em forma de lista legível.
 *
 * O banco guarda os valores crus ("nunca_conferi"), que não dizem nada em uma
 * tabela. Esta função é o que o painel de administração usa para ler uma
 * candidatura sem precisar decorar o formulário.
 */
export function resumoDasRespostas(respostas) {
  return PERGUNTAS.map((p) => {
    const o = p.opcoes.find((x) => x.valor === respostas?.[p.id]);
    return {
      id: p.id,
      curto: p.curto,
      rotulo: o ? o.rotulo : "—",
      passa: o ? o.passa : null,
    };
  });
}

/**
 * A situação da vaga de um candidato, do jeito que o admin precisa ver.
 *
 * Reprovado no filtro e reserva vencida são coisas diferentes: o primeiro
 * nunca teve vaga, o segundo teve e deixou passar — e só o segundo é alguém
 * para cutucar.
 */
export function situacaoDaVaga(linha) {
  if (!linha?.aprovado) return { chave: "espera", rotulo: "Lista de espera" };
  if (linha.pago_em) return { chave: "pago", rotulo: "Pago" };
  const ate = linha.reservada_ate ? new Date(linha.reservada_ate) : null;
  if (ate && ate > new Date()) return { chave: "reservada", rotulo: "Reservada", ate };
  return { chave: "vencida", rotulo: "Reserva vencida", ate };
}
