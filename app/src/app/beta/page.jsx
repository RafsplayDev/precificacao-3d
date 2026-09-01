"use client";
import React from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Button, Card, Input, Radio } from "@/design-system";
import { irPara } from "@/lib/navegar";
import { supabase } from "@/lib/supabaseClient";
import { urlDoSite } from "@/lib/site";
import { reais } from "@/lib/produto";
import {
  PERGUNTAS,
  VAGAS,
  HORAS_DE_RESERVA,
  PRECO_FUNDADOR_CENTAVOS,
  passandoAte,
} from "@/lib/beta";

/**
 * O erro do cadastro em português, e só os que a pessoa pode resolver.
 *
 * A vaga já foi aprovada quando isto aparece — nenhuma destas mensagens é
 * uma recusa, todas são "termine de entrar por aqui".
 */
function traduzirErroConta(e) {
  const m = String(e?.message || e || "").toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Você já tem uma conta com este e-mail — entre com ela para pagar.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres. Crie a conta na próxima tela.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas seguidas. Entre pela tela de acesso em um minuto.";
  return "Sua vaga está guardada, mas a conta não foi criada. Crie-a na próxima tela com este mesmo e-mail.";
}

const TOTAL_PASSOS = PERGUNTAS.length + 1; // as perguntas + a tela de contato

/**
 * O movimento entre passos.
 *
 * O formulário troca o conteúdo de dentro do mesmo card, e sem transição a
 * pergunta seguinte aparece no lugar da anterior sem que nada indique que se
 * avançou — parece que a tela piscou. A direção do deslize é o que diz para
 * onde: entra pelo lado de onde se veio, sai pelo lado oposto.
 *
 * `custom` é a direção (1 avançando, -1 voltando).
 */
const DESLIZE = {
  entra: (d) => ({ opacity: 0, x: d * 28 }),
  centro: { opacity: 1, x: 0 },
  sai: (d) => ({ opacity: 0, x: d * -28 }),
};

const MOLA = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 };

/**
 * A barra de vagas.
 *
 * O número vem do banco a cada carregamento, não de um contador de enfeite:
 * ocupa vaga quem foi aprovado e ou pagou, ou ainda está dentro da reserva de
 * 24h. Enquanto a contagem não chega, a barra não aparece — mostrar "20 de 20"
 * e corrigir meio segundo depois seria inventar um número.
 */
function BarraVagas({ vagas }) {
  const reduzido = useReducedMotion();
  if (!vagas) return null;
  const pct = Math.round((vagas.ocupadas / vagas.total) * 100);
  const esgotado = vagas.restantes <= 0;
  return (
    <motion.div
      className="ap-beta__vagas"
      initial={reduzido ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduzido ? 0 : 0.35 }}
    >
      <div className="ap-beta__vagas-topo">
        <strong>
          {esgotado
            ? "Lote de fundador completo"
            : `${vagas.restantes} ${vagas.restantes === 1 ? "vaga restante" : "vagas restantes"}`}
        </strong>
      </div>
      <div
        className="ap-beta__barra"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={vagas.total}
        aria-valuenow={vagas.ocupadas}
        aria-label="Vagas preenchidas no lote de fundador"
      >
        {/* A barra cresce até a marca em vez de já nascer preenchida: é o
            que faz o número lá em cima ser lido como uma contagem viva. */}
        <motion.div
          className="ap-beta__barra-cheia"
          initial={reduzido ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduzido ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Quem já entrou.
 *
 * Fica escondido enquanto ninguém entrou: uma lista vazia sob o título
 * "os fundadores" diria justamente o contrário do que ela existe para
 * dizer. Aparece a partir do primeiro aprovado e cresce sozinha.
 *
 * Vem do banco já abreviado — primeiro nome e inicial do sobrenome
 * (migração 0025). Nome inteiro e contato nunca saem do servidor.
 */
function Fundadores({ lista }) {
  const reduzido = useReducedMotion();
  if (!lista?.length) return null;
  return (
    <div className="ap-beta__fundadores">
      <span className="ap-beta__fundadores-rot">
        {lista.length === 1 ? "Já entrou" : "Já entraram"}
      </span>
      <ul>
        {lista.map((f, i) => (
          <motion.li
            key={`${f.nome}-${i}`}
            initial={reduzido ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduzido ? { duration: 0 } : { delay: i * 0.04, duration: 0.3 }}
          >
            <strong>{f.nome}</strong>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export default function BetaPage() {
  const [vagas, setVagas] = React.useState(null);
  const [fundadores, setFundadores] = React.useState([]);
  // A abertura é uma tela, não um cabeçalho: quem chega do vídeo decide se
  // entra, e só então o formulário aparece — sozinho, sem nada competindo
  // com a pergunta da vez.
  const [iniciado, setIniciado] = React.useState(false);
  const [passo, setPasso] = React.useState(0);
  // Para onde a animação corre. Só existe por causa do "Voltar": sem ele,
  // avançar e retroceder teriam o mesmo movimento e nenhum dos dois diria
  // nada sobre o sentido.
  const [direcao, setDirecao] = React.useState(1);
  const [respostas, setRespostas] = React.useState({});
  const [contato, setContato] = React.useState({
    nome: "",
    email: "",
    whatsapp: "",
    senha: "",
  });
  // O que aconteceu com a criação da conta. `sessao` decide o botão do card
  // de aprovado: com sessão a pessoa vai direto pagar; sem ela (confirmação
  // de e-mail ligada no Supabase) o caminho passa pela caixa de entrada.
  const [conta, setConta] = React.useState({ sessao: false, erro: null });
  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState(null);
  const [resultado, setResultado] = React.useState(null);
  const reduzido = useReducedMotion();
  // Quem pediu menos movimento ao sistema recebe as mesmas telas sem o
  // deslize: a transição some, o conteúdo continua inteiro.
  const transicao = reduzido ? { duration: 0 } : MOLA;

  // ------------------------------------------------------------------
  // Ver os estados da página sem depender do banco
  //
  //   ?ver=aprovado | reprovado | lotado   monta o veredito correspondente
  //   ?vagas=17                            finge 17 das 20 vagas ocupadas
  //   ?fundadores=Ana S.,Bruno L.          mostra o bloco de quem já entrou
  //
  // Nada disso concede coisa alguma: quem decide o preço e a vaga é o
  // servidor, no checkout, a partir da linha em beta_candidatos. E os nomes
  // saem da própria URL — a tela não inventa fundador nenhum.
  // ------------------------------------------------------------------
  React.useEffect(() => {
    const busca = new URLSearchParams(window.location.search);

    const ver = busca.get("ver");
    if (ver === "aprovado") setResultado({ aprovado: true, lotado: false });
    if (ver === "reprovado") setResultado({ aprovado: false, lotado: false });
    if (ver === "lotado") setResultado({ aprovado: false, lotado: true });

    const ocupadas = Number(busca.get("vagas"));
    if (Number.isFinite(ocupadas) && busca.has("vagas")) {
      const cheias = Math.max(0, Math.min(VAGAS, ocupadas));
      setVagas({ total: VAGAS, ocupadas: cheias, restantes: VAGAS - cheias });
    }

    const nomes = busca.get("fundadores");
    if (nomes) {
      setFundadores(
        nomes.split(",").map((n) => ({ nome: n.trim() })).filter((f) => f.nome)
      );
    }
  }, []);

  React.useEffect(() => {
    let vivo = true;
    fetch("/api/beta")
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        // O que veio na URL manda: sem isto a resposta do banco chegaria
        // depois e apagaria a simulação um instante após a tela abrir.
        const busca = new URLSearchParams(window.location.search);
        if (!busca.has("vagas")) setVagas(d);
        if (!busca.get("fundadores")) setFundadores(d.fundadores || []);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const naContato = passo === PERGUNTAS.length;
  const pergunta = PERGUNTAS[passo];
  // A cerimônia do compromisso é para quem ainda está no páreo. Para quem já
  // esbarrou em uma pergunta anterior o resultado está decidido, e pedir um
  // juramento seria encenação — essa pessoa responde no radio, como nas
  // outras perguntas.
  const compromisso = pergunta?.id === "feedback" && passandoAte(respostas, passo);

  function voltar() {
    setDirecao(-1);
    setPasso((p) => Math.max(p - 1, 0));
  }

  function responder(perguntaId, valor) {
    setRespostas((r) => ({ ...r, [perguntaId]: valor }));
    setDirecao(1);
    // Um passo por pergunta, e a escolha já avança: com resposta única, pedir
    // "escolha" e depois "continuar" seria dois cliques para uma decisão só.
    setTimeout(() => setPasso((p) => Math.min(p + 1, PERGUNTAS.length)), 140);
  }

  /**
   * Um envio só: a candidatura e a conta.
   *
   * A ordem importa. A rota grava a candidatura e devolve o veredito; só
   * quem passou ganha conta. Criar a conta antes seria deixar cadastro de
   * reprovado no auth, e criar depois de uma tela de "garanta sua vaga"
   * era um formulário a mais entre o sim e o pagamento.
   *
   * Se a conta falhar (e-mail já cadastrado, por exemplo), a vaga continua
   * de pé: ela está presa ao e-mail em beta_candidatos, não à conta. O card
   * de aprovado manda essa pessoa entrar com a conta que já tem.
   */
  async function enviar(ev) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/beta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome: contato.nome,
          email: contato.email,
          whatsapp: contato.whatsapp,
          respostas,
        }),
      });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados?.erro || "Não foi possível enviar.");
      if (dados.vagas) setVagas(dados.vagas);

      if (dados.aprovado) {
        // O nome e o WhatsApp viajam nos metadados do signUp: o trigger
        // `semear_conta` os copia para `perfis` (migração 0026). Sem isso o
        // WhatsApp que a pessoa acabou de digitar ficaria só na candidatura.
        const { data, error } = await supabase.auth.signUp({
          email: contato.email.trim().toLowerCase(),
          password: contato.senha,
          options: {
            data: { nome: contato.nome.trim(), whatsapp: contato.whatsapp.trim() },
            emailRedirectTo: `${urlDoSite()}/auth/callback?proximo=/assinar`,
          },
        });
        if (error) {
          setConta({ sessao: false, erro: traduzirErroConta(error) });
        } else {
          setConta({ sessao: !!data.session, erro: null });
        }
      }

      setResultado(dados);
    } catch (e) {
      setErro(e.message || "Não foi possível enviar. Tente de novo.");
      setEnviando(false);
    }
  }

  // A decisão sai da rota, não daqui. A tela responde na hora porque o
  // servidor devolve o veredito na mesma requisição que grava a candidatura —
  // calcular por conta própria abriria espaço para as duas respostas
  // discordarem, e a que a pessoa lê tem que ser a que vale.
  if (resultado) {
    return (
      <div className="ap-beta">
        <BarraVagas vagas={vagas} />
        <Fundadores lista={fundadores} />
        {/* O veredito não desliza como um passo do formulário: ele chega, e
            por isso entra por cima, com escala. */}
        <motion.div
          initial={reduzido ? false : { opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={transicao}
        >
          {resultado.aprovado ? (
            <Aprovado email={contato.email} conta={conta} />
          ) : (
            <Reprovado lotado={resultado.lotado} />
          )}
        </motion.div>
      </div>
    );
  }

  if (!iniciado) {
    return (
      <div className="ap-beta">
        <BarraVagas vagas={vagas} />
        <Fundadores lista={fundadores} />
        <Abertura onComecar={() => setIniciado(true)} />
      </div>
    );
  }

  return (
    <div className="ap-beta">
      <BarraVagas vagas={vagas} />
      <Fundadores lista={fundadores} />

      <motion.div
        initial={reduzido ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduzido ? 0 : 0.35 }}
      >
      <Card>
        <div className="ap-beta__progresso">
          <span>
            Passo {passo + 1} de {TOTAL_PASSOS}
          </span>
          <div className="ap-beta__passos" aria-hidden="true">
            {Array.from({ length: TOTAL_PASSOS }, (_, i) => (
              <motion.i
                key={i}
                className={i <= passo ? "on" : ""}
                // A barrinha do passo atual cresce ao ser alcançada: é o
                // sinal de que a resposta foi registrada, dado no mesmo
                // instante em que a pergunta troca.
                animate={{ scaleX: i === passo && !reduzido ? 1.35 : 1 }}
                transition={transicao}
              />
            ))}
          </div>
        </div>

        <motion.div layout={!reduzido} transition={transicao}>
        <AnimatePresence mode="wait" custom={direcao} initial={false}>
        <motion.div
          key={passo}
          custom={direcao}
          variants={DESLIZE}
          initial="entra"
          animate="centro"
          exit="sai"
          transition={transicao}
        >
        {naContato ? (
          // Este passo já é o cadastro. Vale um título curto porque agora há
          // uma senha em jogo: sem ele o campo apareceria sem explicação no
          // meio de um formulário que até aqui só perguntava sobre vendas.
          <form onSubmit={enviar} className="ap-beta__form">
            <div className="ap-beta__form-cabeca">
              <h2>Crie sua conta</h2>
              <p>É com ela que sua vaga e o preço de fundador ficam guardados.</p>
            </div>
            <Input
              id="beta-whatsapp"
              label="WhatsApp"
              type="tel"
              value={contato.whatsapp}
              onChange={(e) => setContato({ ...contato, whatsapp: e.target.value })}
              autoComplete="tel"
              required
            />
            <Input
              id="beta-nome"
              label="Seu nome"
              value={contato.nome}
              onChange={(e) => setContato({ ...contato, nome: e.target.value })}
              autoComplete="name"
              required
            />
            <Input
              id="beta-email"
              label="E-mail"
              type="email"
              value={contato.email}
              onChange={(e) => setContato({ ...contato, email: e.target.value })}
              autoComplete="email"
              required
            />
            <Input
              id="beta-senha"
              label="Senha"
              type="password"
              value={contato.senha}
              onChange={(e) => setContato({ ...contato, senha: e.target.value })}
              autoComplete="new-password"
              hint="Mínimo de 6 caracteres."
              minLength={6}
              required
            />
            {erro && <p className="ap-beta__erro">{erro}</p>}
            <Button type="submit" block disabled={enviando}>
              {enviando ? "Criando sua conta…" : "Criar conta e ver meu resultado"}
            </Button>
            <button
              type="button"
              className="ap-beta__voltar"
              onClick={voltar}
            >
              Voltar
            </button>
          </form>
        ) : (
          <div className="ap-beta__pergunta">
            <h2>{pergunta.titulo}</h2>
            {compromisso ? (
              // Quem chegou até aqui passando não responde a última pergunta:
              // firma. As opções continuam existindo — a saída para quem não
              // topa fica logo abaixo, em texto.
              <div className="ap-beta__firmar">
                <SegurarParaFirmar onFirmado={() => responder(pergunta.id, "sim")} />
                <button
                  type="button"
                  className="ap-beta__recusar"
                  onClick={() => responder(pergunta.id, "nao")}
                >
                  Não posso me comprometer com isso
                </button>
              </div>
            ) : (
            <div className="ap-beta__opcoes">
              {pergunta.opcoes.map((o, i) => (
                // Em cascata, e não todas de uma vez: a lista se apresenta na
                // ordem em que vai ser lida.
                <motion.div
                  key={o.valor}
                  initial={reduzido ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduzido ? { duration: 0 } : { delay: 0.06 + i * 0.05, duration: 0.25 }}
                >
                  <Radio
                    name={pergunta.id}
                    value={o.valor}
                    label={o.rotulo}
                    checked={respostas[pergunta.id] === o.valor}
                    onChange={(valor) => responder(pergunta.id, valor)}
                  />
                </motion.div>
              ))}
            </div>
            )}
            {passo > 0 && (
              <button
                type="button"
                className="ap-beta__voltar"
                onClick={voltar}
              >
                Voltar
              </button>
            )}
          </div>
        )}
        </motion.div>
        </AnimatePresence>
        </motion.div>
      </Card>
      </motion.div>

    </div>
  );
}

/**
 * A tela de abertura.
 *
 * Explicação curta de propósito: quem chega aqui vem de um vídeo que já
 * apresentou o PRECIFICA. O que falta é dizer o que esta página é — uma
 * seleção, não uma compra — e abrir a porta.
 */
function Abertura({ onComecar }) {
  const reduzido = useReducedMotion();
  // Cada linha entra depois da anterior, na ordem de leitura, e o botão por
  // último — a tela se monta na frente de quem chegou em vez de já estar
  // pronta antes de ser olhada.
  const entrada = (i) => ({
    initial: reduzido ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: reduzido ? { duration: 0 } : { delay: i * 0.09, duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  });
  return (
    <Card className="ap-beta__abertura">
      {/* O título nomeia os dois extremos do chute, não um só: barato demais
          dá prejuízo, caro demais espanta o cliente. É entre esses dois medos
          que quem vende decide preço no olho — e é dessa gangorra que a
          calculadora tira a pessoa. */}
      <motion.h1 {...entrada(0)}>
        Pare de escolher entre o prejuízo e a venda perdida.
      </motion.h1>
      <motion.p className="ap-beta__abertura-texto" {...entrada(1)}>
        O lote de fundador do PRECIFICA é fechado. Cinco perguntas definem se este é o
        seu momento.
      </motion.p>
      <motion.div {...entrada(2)}>
        <Button variant="accent" block onClick={onComecar}>
          Começar
        </Button>
      </motion.div>
      <motion.p className="ap-beta__abertura-nota" {...entrada(3)}>
        Nem todo mundo entra. O resultado aparece ao final.
      </motion.p>
    </Card>
  );
}

/**
 * Um dos dois cards que viram.
 *
 * É um <button> de verdade, e não uma div com onMouseEnter: assim o card
 * entra na ordem de tabulação, vira com Enter ou espaço, e o verso deixa de
 * ser conteúdo que só existe para quem tem mouse. O clique também é o que
 * faz o efeito funcionar no celular, onde não há "passar o mouse".
 *
 * As duas faces ficam sempre no DOM — quem usa leitor de tela ouve o card
 * inteiro sem precisar descobrir que ele vira.
 */

/**
 * Segurar para concordar.
 *
 * A última pergunta é um compromisso, não uma preferência: responder "sim"
 * com um clique custa o mesmo que responder qualquer outra coisa, e é
 * justamente essa a promessa que o lote de fundador está comprando. Segurar
 * o botão por um segundo e meio não prova nada juridicamente — mas obriga a
 * pessoa a permanecer na decisão pelo tempo dela, que é mais do que um
 * clique reflexo pede.
 *
 * Só aparece para quem chegou aqui passando; ver {@link passandoAte}.
 *
 * O teclado firma igual: Espaço ou Enter mantidos têm o mesmo efeito de
 * manter o dedo na tela.
 */
function SegurarParaFirmar({ duracao = 1500, onFirmado }) {
  const reduzido = useReducedMotion();
  const [progresso, setProgresso] = React.useState(0);
  const [firmado, setFirmado] = React.useState(false);
  const quadro = React.useRef(null);
  const comeco = React.useRef(0);

  const parar = React.useCallback(() => {
    if (quadro.current) cancelAnimationFrame(quadro.current);
    quadro.current = null;
  }, []);

  // Solta antes do fim: volta a zero. Não há crédito por meio compromisso.
  const soltar = React.useCallback(() => {
    if (firmado) return;
    parar();
    setProgresso(0);
  }, [firmado, parar]);

  const segurar = React.useCallback(() => {
    if (firmado || quadro.current) return;
    comeco.current = performance.now();
    const passo = (agora) => {
      const p = Math.min((agora - comeco.current) / duracao, 1);
      setProgresso(p);
      if (p >= 1) {
        parar();
        setFirmado(true);
        onFirmado();
        return;
      }
      quadro.current = requestAnimationFrame(passo);
    };
    quadro.current = requestAnimationFrame(passo);
  }, [duracao, firmado, onFirmado, parar]);

  React.useEffect(() => parar, [parar]);

  return (
    <button
      type="button"
      className={`ap-beta__segurar${firmado ? " ap-beta__segurar--firmado" : ""}`}
      onPointerDown={segurar}
      onPointerUp={soltar}
      onPointerLeave={soltar}
      onPointerCancel={soltar}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          segurar();
        }
      }}
      onKeyUp={soltar}
      onBlur={soltar}
      aria-label="Segure para concordar em preencher o formulário daqui duas semanas"
    >
      {/* Duas camadas com o mesmo rótulo, uma por cima da outra: embaixo o
          rosa fraco com texto escuro, em cima o rosa cheio com texto branco,
          recortado até onde a carga chegou. É o que permite o preenchimento
          ser a cor da marca em 100% sem que a palavra suma na metade do
          caminho — um único rótulo teria que ser legível sobre os dois
          fundos ao mesmo tempo, e nenhuma cor é. */}
      <span className="ap-beta__segurar-rot">
        {firmado ? "Combinado" : "Segure para concordar"}
      </span>
      <span
        className="ap-beta__segurar-carga"
        style={{ clipPath: `inset(0 ${(1 - progresso) * 100}% 0 0)` }}
        aria-hidden="true"
      >
        <span className="ap-beta__segurar-rot">
          {firmado ? "Combinado" : "Segure para concordar"}
        </span>
      </span>
    </button>
  );
}


function Aprovado({ email, conta }) {
  const limpo = String(email || "").trim();
  // Três saídas, uma por estado da conta recém-criada:
  //   • com sessão      — vai direto para o pagamento;
  //   • sem sessão      — a confirmação de e-mail está ligada, e o link da
  //                       caixa de entrada já volta em /assinar;
  //   • com erro        — a conta não nasceu; a tela de acesso resolve, com
  //                       o e-mail preenchido para o preço ser reconhecido.
  const destino = conta?.erro
    ? `/entrar?proximo=/assinar&email=${encodeURIComponent(limpo)}`
    : "/assinar";
  const pronto = conta?.sessao && !conta?.erro;
  return (
    // A moldura é a única coisa "cara" da tela: uma borda de um pixel com as
    // cores da marca e um brilho difuso por trás. O conteúdo continua sóbrio —
    // quem está prestes a pagar precisa ler, não se impressionar.
    <div className="ap-beta__premium">
    <Card>
      {/* Uma coluna, um caminho, um botão. É a última tela antes do
          pagamento: tudo o que disputa atenção com o preço e com o CTA
          atrapalha a leitura de quem está prestes a pagar. */}
      <div className="ap-beta__resultado">
        <span className="ap-beta__selo">Vaga confirmada</span>
        <h1>LOTE DE INICIAÇÃO</h1>

        {/* O preço é o elemento mais importante da tela: tipografia grande e
            sólida, sem gradiente e sem enfeite em volta. */}
        <p className="ap-beta__preco">{reais(PRECO_FUNDADOR_CENTAVOS)} pelo PRECIFICA</p>
        <p className="ap-beta__preco-sub">Acesso vitalício</p>

        <p className="ap-beta__parte">
          Esse valor irá valer apenas para os {VAGAS} primeiros usuários, e você fica
          entre os fundadores do produto. Sem mensalidade, e toda atualização futura já
          está inclusa.
        </p>

        {/* O compromisso em texto corrido: ele precisa ser lido antes do
            pagamento, mas fundo colorido em volta de uma frase curta se
            parece com aviso de erro. */}
        <p className="ap-beta__parte">
          O que peço em troca: um formulário de 5 minutos daqui a duas semanas, com
          prints do que travar.
        </p>

        <Button block onClick={() => irPara(destino)}>
          {pronto ? "Quero o acesso vitalício" : "Continuar"}
        </Button>

        <p className="ap-beta__nota">
          Preço reservado por {HORAS_DE_RESERVA}h.
          {conta?.erro ? (
            <>
              <br />
              {conta.erro}
            </>
          ) : !conta?.sessao ? (
            <>
              <br />
              Sua conta foi criada: confirme o link enviado para {limpo} e você cai
              direto no pagamento.
            </>
          ) : null}
        </p>
      </div>
    </Card>
    </div>
  );
}

function Reprovado({ lotado }) {
  return (
    <Card>
      <div className="ap-beta__resultado">
        <span className="ap-beta__selo">Lista de espera</span>
        <h1>{lotado ? "As vagas acabaram." : "Ainda não é a sua vez — e tudo bem."}</h1>
        <p>
          {lotado
            ? "Seu perfil é o do lote, mas as vagas fecharam antes de a sua resposta chegar. Seu contato está registrado para o lançamento aberto."
            : `O beta é restrito a quem já vende peças impressas com alguma frequência e ainda calcula o preço no braço. Não é uma avaliação sobre você — é sobre o momento. Com ${VAGAS} vagas e duas semanas de teste, o feedback só serve se vier de quem usa a ferramenta em vendas reais.`}
        </p>
        <p>
          Quando isso mudar — as vendas começarem, o volume aumentar — a porta continua
          aberta. Guardamos seu contato e avisamos no lançamento, sem filtro e sem
          compromisso de feedback.
        </p>
        <Link className="ap-beta__link" href="/tutorial">
          Enquanto isso, teste a calculadora sem cadastro →
        </Link>
      </div>
    </Card>
  );
}
