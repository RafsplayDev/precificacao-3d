"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Icon } from "@/design-system";
import { PASSOS, ETAPAS } from "@/lib/tutorial";
import { ehTeste } from "@/lib/modo";
import { usoDoTeste } from "@/lib/dadosLocais";

/**
 * O tutorial guiado.
 *
 * Um recorte de luz sobre o elemento do passo e um cartão ao lado dele. O
 * recorte não é um scrim clicável: `pointer-events: none` no escuro inteiro
 * é o que permite a pessoa **usar** o app enquanto é guiada — clicar em
 * "Adicionar impressora", digitar, salvar. Um tutorial que só deixa apertar
 * "Próximo" mostra o app; este faz a pessoa operá-lo, e é operando que ela
 * descobre se vale os R$ 34,90.
 *
 * O estado mora no localStorage porque ele precisa sobreviver à navegação
 * entre /cadastros, /produtos e / — que aqui é troca de página de verdade,
 * não de aba. Uma cópia vai no cookie `dc_tour`, que é o que o middleware
 * lê para manter essas telas abertas a quem ainda não criou conta.
 *
 * O tutorial nunca começa sozinho: quem o liga é a página /tutorial (o
 * link que o afiliado divulga) ou o botão na gaveta da conta. Enquanto ele
 * partia de qualquer visita ao app, quem já tinha conta topava com o
 * roteiro toda vez que abria o site em outro navegador.
 *
 * O roteiro termina na calculadora e acaba ali: nada de cartão vendendo
 * acesso no último passo. Quem gostou do preço que viu encontra o convite
 * na faixa do teste e segue pelo caminho normal — criar conta, depois
 * pagar.
 *
 * Quando um diálogo do app abre (o formulário de cadastro), o cartão se
 * recolhe: o scrim do diálogo passa por cima dele de qualquer jeito, e
 * deixá-lo lá só empilharia sombra sobre sombra.
 */

const CHAVE = "dc_tutorial_v1";

/**
 * O mesmo estado, em cookie, para o middleware enxergar.
 *
 * Quem chega sem conta faz o tutorial antes de se cadastrar, e o middleware
 * precisa saber se ele ainda está rolando para deixar /cadastros e
 * /produtos abertos. localStorage não viaja no request; cookie viaja. O
 * cookie não autoriza nada além dessas telas de teste, cujo banco é o
 * próprio navegador — forjá-lo não dá acesso a dado de ninguém.
 */
const COOKIE_TOUR = "dc_tour";
const DIA = 60 * 60 * 24;

function marcarTour(valor) {
  try {
    document.cookie = `${COOKIE_TOUR}=${valor}; path=/; max-age=${DIA}; samesite=lax`;
  } catch {}
}

/**
 * As telas em que o tutorial pode acontecer.
 *
 * A lista existe por causa de um laço: o cookie `dc_modo` dura 24 horas e
 * sobrevive ao logout. Sem esta checagem, quem saísse da conta caía em
 * /entrar com o modo teste ainda no cookie, o tutorial tentava levar a
 * pessoa para /cadastros, o middleware devolvia para /entrar — e assim sem
 * parar. O tutorial só existe dentro do app.
 */
const ROTAS_DO_APP = ["/", "/produtos", "/cadastros", "/concorrentes"];
const MARGEM = 8; // folga do recorte em volta do alvo

const Ctx = React.createContext({ passo: null, ativo: false, iniciar: () => {} });
export const useTutorial = () => React.useContext(Ctx);

function lerEstado() {
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE) || "null");
  } catch {
    return null;
  }
}

/**
 * Ligar o tutorial de fora do React.
 *
 * A página /tutorial precisa deixar o roteiro armado *antes* de trocar de
 * endereço, e nesse momento o provider da tela seguinte ainda nem montou.
 * Gravar estado e cookie aqui é o que faz o primeiro passo já chegar de pé.
 */
export function iniciarTutorial() {
  gravarEstado({ estado: "ativo", indice: 0 });
}

function gravarEstado(estado) {
  marcarTour(estado.estado === "ativo" ? "ativo" : "fim");
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {}
}

export function TutorialProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [indice, setIndice] = React.useState(null); // null = tutorial fora do ar
  const [pronto, setPronto] = React.useState(false);

  // A primeira leitura só pode acontecer no navegador: no servidor não há
  // localStorage nem cookie de modo, e chutar aqui faria o tutorial piscar.
  React.useEffect(() => {
    const salvo = lerEstado();
    if (salvo?.estado === "ativo" && Number.isInteger(salvo.indice)) {
      setIndice(salvo.indice);
      marcarTour("ativo");
    } else if (salvo) {
      // O cookie vence em um dia e o localStorage não: sem este reforço,
      // quem terminou o tutorial ontem voltaria a ter as telas abertas hoje.
      marcarTour("fim");
    }
    setPronto(true);
  }, []);

  const noApp = ROTAS_DO_APP.includes(pathname);
  const passo = indice == null || !noApp ? null : PASSOS[indice] || null;

  const ir = React.useCallback((novo) => {
    if (novo == null || novo >= PASSOS.length) {
      setIndice(null);
      gravarEstado({ estado: "fim" });
      return;
    }
    const alvo = Math.max(0, novo);
    setIndice(alvo);
    gravarEstado({ estado: "ativo", indice: alvo });
  }, []);

  const encerrar = React.useCallback(() => {
    setIndice(null);
    gravarEstado({ estado: "saiu" });
  }, []);

  const iniciar = React.useCallback(() => {
    setIndice(0);
    gravarEstado({ estado: "ativo", indice: 0 });
  }, []);

  // O marcador no body é o que levanta o menu acima do escuro: durante o
  // tutorial ele fica aceso junto com o alvo, porque vários passos pedem
  // para a pessoa trocar de tela por ele.
  React.useEffect(() => {
    const ligado = indice != null && noApp;
    if (ligado) document.body.dataset.tutorial = "on";
    else delete document.body.dataset.tutorial;
    return () => {
      delete document.body.dataset.tutorial;
    };
  }, [indice, noApp]);

  // Cada passo sabe em que tela mora. Trocar de tela é do tutorial, não da
  // pessoa: quem está sendo guiado não deveria precisar achar o menu.
  React.useEffect(() => {
    if (!passo || passo.rota === pathname) return;
    router.push(passo.rota);
  }, [passo, pathname, router]);

  const valor = React.useMemo(
    () => ({
      passo: passo && passo.rota === pathname ? passo : null,
      indice,
      total: PASSOS.length,
      ativo: indice != null,
      iniciar,
      encerrar,
      proximo: () => ir((indice ?? 0) + 1),
      anterior: () => ir((indice ?? 0) - 1),
    }),
    [passo, pathname, indice, ir, iniciar, encerrar]
  );

  return (
    <Ctx.Provider value={valor}>
      {children}
      {pronto && valor.passo && (
        <Guia
          passo={valor.passo}
          indice={indice}
          total={PASSOS.length}
          onProximo={valor.proximo}
          onAnterior={valor.anterior}
          onSair={encerrar}
        />
      )}
    </Ctx.Provider>
  );
}

/* ------------------------------------------------------------------ */

function Guia({ passo, indice, total, onProximo, onAnterior, onSair }) {
  const area = useAreaDoAlvo(passo.alvo);
  const dialogoAberto = useDialogoAberto();
  const uso = useUso(passo.exigeLinha);
  const cartao = React.useRef(null);
  const posicao = usePosicao(area, cartao, passo.id);

  // ----------------------------------------------------------------
  // Quem avança é o cadastro, não um botão
  //
  // Nos passos que pedem uma linha, o "Próximo" era uma saída falsa: dava
  // para seguir sem cadastrar nada e chegar na calculadora com a tela
  // vazia — exatamente o que o roteiro existe para evitar. Sem ele, o
  // passo vira o que promete ser: clique no botão aceso, preencha, e o
  // tutorial segue sozinho quando a linha existir.
  //
  // O ponto de partida é lido na entrada do passo: quem volta para um
  // passo já cumprido não pode ser empurrado de novo para a frente.
  // ----------------------------------------------------------------
  const espera = passo.exigeLinha && ehTeste();
  const partida = React.useRef(null);
  // Lido do próprio armazenamento, e não do estado da tela: logo depois de
  // um "Voltar" o contador ainda traz o número da tabela do passo anterior,
  // e usá-lo como ponto de partida empurrava a pessoa para a frente de
  // novo — o botão Voltar não voltava.
  React.useLayoutEffect(() => {
    partida.current = espera ? usoDoTeste()[passo.exigeLinha]?.usado || 0 : null;
  }, [espera, passo.id, passo.exigeLinha]);
  React.useEffect(() => {
    if (!espera || partida.current == null) return;
    if (uso > partida.current) onProximo();
  }, [espera, uso, onProximo]);

  if (dialogoAberto) return null;

  const feito = passo.exigeLinha ? uso > 0 : true;

  return (
    <>
      {area
        ? <span
            className={"ap-tour__luz" + (espera ? " ap-tour__luz--pulsa" : "")}
            style={{ ...caixa(area), position: "fixed" }}
            aria-hidden="true"
          />
        : <span className="ap-tour__escuro" aria-hidden="true" />}
      {area && <Bloqueio area={caixa(area)} />}
      <div
        ref={cartao}
        className={"ap-tour__cartao" + (area ? "" : " ap-tour__cartao--centro")}
        style={area ? posicao : undefined}
        role="dialog"
        aria-live="polite"
        aria-label={`Tutorial, passo ${indice + 1} de ${total}`}
      >
        <div className="ap-tour__topo">
          {passo.semAvanco ? <span /> : <Avanco indice={indice} />}
          <button type="button" className="ap-tour__fechar" onClick={onSair} aria-label="Sair do tutorial">
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Só o corpo rola. Quando o cartão inteiro rolava, um texto longo
            empurrava "Próximo" para fora da área visível e o tutorial ficava
            sem saída aparente — que foi o que aconteceu no celular. */}
        <div className="ap-tour__corpo">
          <h2 className="ap-tour__titulo">{passo.titulo}</h2>
          <p className="ap-tour__texto">{passo.texto}</p>
        </div>

        <div className="ap-tour__acoes">
          {indice > 0 && (
            <button type="button" className="ap-tour__voltar" onClick={onAnterior}>
              Voltar
            </button>
          )}
          <span className="ap-tour__espaco" />
          {passo.opcional && (
            <button type="button" className="ap-tour__pular" onClick={onProximo}>
              Pular esta parte
            </button>
          )}
          {!espera && (
            <Button size="sm" variant={feito ? "accent" : "secondary"} onClick={onProximo}>
              {passo.acao || (passo.opcional ? "Cadastrei" : "Próximo")}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * O que fica fora do destaque não recebe clique.
 *
 * Antes o escuro inteiro era `pointer-events: none` e a pessoa podia mexer
 * em qualquer canto da tela no meio do roteiro — abrir outro cadastro,
 * trocar de aba, sair do caminho e não achar mais o caminho de volta. Agora
 * o clique só passa em dois lugares: o recorte iluminado e o menu (que os
 * passos usam para trocar de tela). O menu sobe por CSS, acima do escuro;
 * aqui ficam as quatro faixas que cercam o recorte.
 *
 * Quatro faixas, e não um retângulo com furo: um elemento só teria de ter
 * um buraco de verdade para deixar o clique passar, e nenhuma propriedade
 * de CSS faz isso sem `clip-path` — que recorta a pintura, não a área de
 * toque.
 */
function Bloqueio({ area }) {
  const faixas = [
    { top: 0, left: 0, right: 0, height: Math.max(0, area.top) },
    { top: area.top + area.height, left: 0, right: 0, bottom: 0 },
    { top: area.top, left: 0, width: Math.max(0, area.left), height: area.height },
    { top: area.top, left: area.left + area.width, right: 0, height: area.height },
  ];

  return faixas.map((f, i) => (
    <span key={i} className="ap-tour__trava" style={f} aria-hidden="true" />
  ));
}

/* --------------------------- o avanço ---------------------------- */

/**
 * Quanto falta, sem contar passos.
 *
 * Uma barra por etapa: as que ficaram para trás estão cheias, a atual
 * enche conforme os passos dela caem, as próximas esperam. "Passo 7 de 18"
 * dizia a verdade e assustava; três barras curtas dizem a mesma coisa e
 * parecem o que são — um caminho de três partes, quase todo já andado.
 */
function Avanco({ indice }) {
  const atual = PASSOS[indice]?.etapa;
  const numero = ETAPAS.findIndex((e) => e.id === atual);

  return (
    <div className="ap-tour__avanco">
      <span className="ap-tour__etapa">
        {numero + 1} - {ETAPAS[numero]?.nome}
      </span>
      <span className="ap-tour__barras" aria-hidden="true">
        {ETAPAS.map((e) => (
          <span key={e.id} className="ap-tour__barra">
            <i style={{ transform: `scaleX(${fracao(e.id, indice)})` }} />
          </span>
        ))}
      </span>
    </div>
  );
}

/** Quanto da barra de uma etapa já foi vencido: 0, 1, ou algo no meio. */
function fracao(etapa, indice) {
  const passos = PASSOS.filter((p) => p.etapa === etapa);
  const feitos = passos.filter((p) => PASSOS.indexOf(p) < indice).length;
  // O passo atual conta como meio: a barra sai do zero assim que a etapa
  // começa (senão a primeira tela parece não ter avançado nada) e só enche
  // de vez quando a etapa acaba.
  const noAtual = passos.some((p) => PASSOS.indexOf(p) === indice) ? 0.5 : 0;
  return Math.min(1, (feitos + noAtual) / passos.length);
}

/* --------------------------- as medidas --------------------------- */

/**
 * Onde o alvo está agora.
 *
 * Medido de tempos em tempos, e não uma vez só: entre um passo e outro a
 * pessoa abre formulários, salva linhas e a tabela cresce. Um retângulo
 * congelado acabaria destacando o lugar onde o botão estava.
 *
 * O relógio é um `setInterval` curto e não um `requestAnimationFrame`
 * porque o rAF para em aba oculta ou sem composição — e o destaque voltaria
 * pela metade quando a pessoa retomasse. O custo de medir a cada 120 ms é
 * um `getBoundingClientRect`, e o estado só muda quando o retângulo muda.
 */
function useAreaDoAlvo(alvo) {
  const [area, setArea] = React.useState(null);

  React.useEffect(() => {
    if (!alvo) {
      setArea(null);
      return;
    }

    let jaRolou = false;
    let anterior = "";

    const medir = () => {
      const el = visivel(document.querySelectorAll(`[data-tutorial="${alvo}"]`));
      if (!el) {
        if (anterior !== "") {
          anterior = "";
          setArea(null);
        }
        return;
      }

      const r = el.getBoundingClientRect();
      const assinatura = `${Math.round(r.top)}:${Math.round(r.left)}:${Math.round(r.width)}:${Math.round(r.height)}`;
      if (assinatura !== anterior) {
        anterior = assinatura;
        setArea({ top: r.top, left: r.left, width: r.width, height: r.height });
      }

      // Só na primeira medição: rolar a cada passagem brigaria com a pessoa
      // que está rolando a página para ler a tabela.
      if (!jaRolou) {
        jaRolou = true;
        if (r.top < 80 || r.bottom > window.innerHeight - 80) {
          // Alvo alto (a tabela inteira) ou tela estreita: centralizar
          // jogava metade dele para debaixo do cartão, que no celular é
          // um rodapé fixo. Encostar no topo mantém à vista o começo do
          // alvo — que é onde está o botão que o passo manda apertar.
          const alto = r.height > window.innerHeight * 0.45;
          el.scrollIntoView({ block: alto ? "start" : "center", behavior: "smooth" });
        }
      }
    };

    medir();
    const relogio = setInterval(medir, 120);
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    // O navegador estrangula timers em aba oculta — o recorte pode ficar
    // parado enquanto ninguem olha. Ao voltar para a aba, remedimos antes
    // de a pessoa ver o destaque no lugar antigo.
    document.addEventListener("visibilitychange", medir);
    return () => {
      clearInterval(relogio);
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
      document.removeEventListener("visibilitychange", medir);
    };
  }, [alvo]);

  return area;
}

/** O mesmo `data-tutorial` existe no menu do topo e na barra do rodapé; vale o que está na tela. */
function visivel(lista) {
  for (const el of lista) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Enquanto o formulário de cadastro está aberto, o cartão sai da frente. */
function useDialogoAberto() {
  const [aberto, setAberto] = React.useState(false);
  React.useEffect(() => {
    const olhar = () => setAberto(Boolean(document.querySelector(".dc-dialog__scrim")));
    olhar();
    const obs = new MutationObserver(olhar);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  return aberto;
}

/**
 * Quantas linhas a pessoa já cadastrou na tabela que este passo pede.
 *
 * O número vem carimbado com a tabela a que pertence. Sem esse carimbo, o
 * primeiro instante de um passo novo ainda devolvia a contagem do passo
 * anterior — e como é essa contagem que faz o tutorial andar sozinho, o
 * passo seguinte se dava por cumprido antes de a pessoa digitar qualquer
 * coisa.
 */
function useUso(tabela) {
  const [estado, setEstado] = React.useState({ tabela: null, n: 0 });

  React.useEffect(() => {
    if (!tabela || !ehTeste()) return;
    const olhar = () => setEstado({ tabela, n: usoDoTeste()[tabela]?.usado || 0 });
    olhar();
    const id = setInterval(olhar, 400);
    return () => clearInterval(id);
  }, [tabela]);

  if (!tabela || !ehTeste()) return 1;
  return estado.tabela === tabela ? estado.n : 0;
}

const caixa = (a) => ({
  top: a.top - MARGEM,
  left: a.left - MARGEM,
  width: a.width + MARGEM * 2,
  height: a.height + MARGEM * 2,
});

/**
 * Onde o cartão cabe sem tapar o alvo.
 *
 * A conta antiga só olhava para cima e para baixo, com uma altura chutada:
 * quando o alvo era alto — a tabela inteira de impressoras — nenhum dos
 * dois lados cabia, o cartão ia para o rodapé da tela e acabava deitado
 * por cima justamente do lugar onde a pessoa precisava digitar.
 *
 * Agora o cartão é medido de verdade e as quatro faixas livres em volta do
 * alvo entram na disputa. Vence a primeira em que ele cabe inteiro; se
 * nenhuma couber, vence a maior e o cartão é limitado a ela (o corpo já
 * rola). O alvo nunca fica coberto — é a única regra que não se negocia
 * aqui, porque o destaque é o único lugar em que o clique passa.
 */
function usePosicao(area, cartao, id) {
  const [tamanho, setTamanho] = React.useState({ largura: 380, altura: 260 });

  // Medido a cada passo e a cada mudança do alvo: o texto muda de tamanho
  // de um passo para outro, e um cartão medido uma vez só erra na próxima.
  React.useEffect(() => {
    const el = cartao.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      setTamanho((v) =>
        Math.abs(v.largura - r.width) < 1 && Math.abs(v.altura - r.height) < 1
          ? v
          : { largura: r.width, altura: r.height }
      );
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [cartao, id, area]);

  if (!area || typeof window === "undefined") return undefined;
  return posicaoDoCartao(caixa(area), tamanho);
}

function posicaoDoCartao(a, { largura, altura }) {
  const folga = 16;
  const tela = { w: window.innerWidth, h: window.innerHeight };
  const LARGURA = Math.min(380, tela.w - folga * 2);

  // As quatro faixas livres em volta do alvo, na ordem de preferência.
  const faixas = [
    { nome: "abaixo", w: tela.w, h: tela.h - (a.top + a.height) },
    { nome: "acima", w: tela.w, h: a.top },
    { nome: "direita", w: tela.w - (a.left + a.width), h: tela.h },
    { nome: "esquerda", w: a.left, h: tela.h },
  ].map((f) => ({ ...f, w: f.w - folga * 2, h: f.h - folga * 2 }));

  const cabe = faixas.find((f) => f.w >= Math.min(largura, LARGURA) && f.h >= altura);
  const f = cabe || faixas.reduce((m, x) => (x.w * x.h > m.w * m.h ? x : m));

  const larg = Math.min(LARGURA, Math.max(f.w, 220));
  const base = { width: larg, maxHeight: Math.max(f.h, 160) };

  if (f.nome === "abaixo" || f.nome === "acima") {
    const left = presa(a.left + a.width / 2 - larg / 2, folga, tela.w - larg - folga);
    return f.nome === "abaixo"
      ? { ...base, left, top: a.top + a.height + folga }
      : { ...base, left, bottom: tela.h - a.top + folga };
  }

  const top = presa(a.top + a.height / 2 - altura / 2, folga, tela.h - altura - folga);
  return f.nome === "direita"
    ? { ...base, top, left: a.left + a.width + folga }
    : { ...base, top, right: tela.w - a.left + folga };
}

const presa = (valor, min, max) => Math.min(Math.max(valor, min), Math.max(min, max));
