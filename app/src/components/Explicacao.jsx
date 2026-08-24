"use client";
import React from "react";
import { Icon } from "@/design-system";

/**
 * O "i" de explicação.
 *
 * Textos como "nível de uso define o desgaste: básico 10%, médio 20%…" são
 * úteis na primeira vez e ruído em todas as seguintes. Deixá-los abertos
 * empurrava a tabela — a coisa que a pessoa veio ver — para baixo da dobra
 * no celular. Aqui eles ficam a um toque de distância.
 *
 * Não usa o Tooltip do design system de propósito: aquele é `white-space:
 * nowrap` e só abre no hover, o que serve para rótulo curto de mouse e não
 * para um parágrafo lido no telefone.
 *
 * Abre no toque e no clique, e também no hover de quem tem mouse. Fecha no
 * segundo toque, no clique fora e no Escape — as três saídas que alguém
 * tenta sem pensar.
 */
export function Explicacao({ children, rotulo = "O que é isto?" }) {
  const [aberto, setAberto] = React.useState(false);
  const caixa = React.useRef(null);
  const balao = React.useRef(null);
  const [desvio, setDesvio] = React.useState(0);

  // ------------------------------------------------------------------
  // O hover só existe onde existe mouse
  //
  // Em tela de toque o navegador dispara `mouseenter` junto com o clique.
  // Com os dois ligados, um toque abria pelo hover e fechava pelo clique no
  // mesmo gesto — o painel simplesmente não abria, que é o oposto do que
  // este componente existe para fazer.
  // ------------------------------------------------------------------
  const [temMouse, setTemMouse] = React.useState(false);
  React.useEffect(() => {
    setTemMouse(window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false);
  }, []);

  // ------------------------------------------------------------------
  // O balão volta para dentro da tela
  //
  // Ancorado no ícone, ele sai pela direita quando o ícone está perto da
  // borda direita — e pela esquerda se fosse ancorado do outro lado. Em vez
  // de escolher um lado, mede-se onde ele caiu e desloca-se o que faltar.
  // `margin-left` e não `transform` porque o transform é da animação.
  // ------------------------------------------------------------------
  React.useLayoutEffect(() => {
    if (!aberto) {
      setDesvio(0);
      return;
    }
    const el = balao.current;
    if (!el) return;
    const folga = 12;
    const r = el.getBoundingClientRect();
    const sobra = r.right - (window.innerWidth - folga);
    const falta = folga - r.left;
    if (sobra > 0) setDesvio((d) => d - sobra);
    else if (falta > 0) setDesvio((d) => d + falta);
  }, [aberto]);

  React.useEffect(() => {
    if (!aberto) return;

    const fora = (ev) => {
      if (!caixa.current?.contains(ev.target)) setAberto(false);
    };
    const tecla = (ev) => {
      if (ev.key === "Escape") setAberto(false);
    };

    // `capture` no clique: sem isso, um clique num controle que para a
    // propagação deixaria o painel aberto para sempre.
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora, true);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <span
      className={"ap-expl" + (aberto ? " is-open" : "")}
      ref={caixa}
      onMouseEnter={temMouse ? () => setAberto(true) : undefined}
      onMouseLeave={temMouse ? () => setAberto(false) : undefined}
    >
      <button
        type="button"
        className="ap-expl__btn"
        aria-label={rotulo}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        <Icon name="info" size={15} />
      </button>
      {/* Só existe no DOM quando está aberto. Escondido por `visibility`
          ele continuava ocupando layout: uma caixa de 320px ancorada num
          ícone no meio da tela esticava a página para além da largura do
          telefone, e aí o que é fixo (o cartão do tutorial, a barra de
          abas) passava a medir essa largura maior enquanto o conteúdo
          continuava no tamanho da tela — as duas larguras diferentes que
          apareciam ao fundo. */}
      {aberto && (
        <span
          className="ap-expl__balao"
          role="note"
          ref={balao}
          style={desvio ? { marginLeft: desvio } : undefined}
        >
          {children}
        </span>
      )}
    </span>
  );
}
