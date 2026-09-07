"use client";
import React from "react";
import { Dialog, Button } from "@/design-system";
import { ehTeste } from "@/lib/modo";

/**
 * O aviso que aparece quando a pessoa acabou de criar algo no modo teste.
 *
 * A faixa do AppShell avisa o tempo todo, e por isso vira paisagem: ninguém
 * lê a tarja que está lá desde que entrou. Este aviso escolhe o outro
 * momento — o primeiro cadastro feito, seja produto, impressora ou
 * filamento, quando existe trabalho a perder e a frase "salvo só neste
 * navegador" deixa de ser abstrata.
 *
 * Aparece uma vez por navegador, nunca mais. Repetir a cada produto seria
 * transformar o argumento em incômodo, e quem já decidiu continuar no teste
 * não muda de ideia por insistência.
 */
const CHAVE = "dc_aviso_teste";

/** Se cabe avisar agora: só no modo teste, e só se este navegador nunca viu. */
export function deveAvisarTeste() {
  if (!ehTeste()) return false;
  try {
    return !localStorage.getItem(CHAVE);
  } catch {
    // localStorage bloqueado (aba anônima, cookies de terceiros): sem onde
    // lembrar que já avisamos, o certo é calar em vez de avisar sempre.
    return false;
  }
}

function marcar() {
  try {
    localStorage.setItem(CHAVE, "1");
  } catch {}
}

export function AvisoTeste({ open, onClose }) {
  // Marca na abertura, e não no fechamento: quem fecha a aba no meio já viu
  // o aviso, e veria de novo no próximo produto.
  React.useEffect(() => {
    if (open) marcar();
  }, [open]);

  if (!open) return null;

  return (
    <Dialog
      open
      title="Salvo — mas só neste navegador"
      description="O que você acabou de cadastrar está guardado neste computador, não na sua conta."
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Continuar no teste
          </Button>
          <Button href="/assinar">Guardar na minha conta</Button>
        </>
      }
    >
      <p style={{ margin: 0 }}>
        Enquanto a assinatura não está ativa, tudo o que você cadastra fica no
        armazenamento deste navegador. Limpar os dados do site, trocar de
        aparelho ou abrir a conta em outro computador e o trabalho não vem
        junto.
      </p>
      <p style={{ margin: "12px 0 0 0" }}>
        Ao assinar, o que você já cadastrou sobe para a sua conta — nada do que
        você fez até aqui se perde.
      </p>
    </Dialog>
  );
}
