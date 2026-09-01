"use client";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card } from "@/design-system";
import { supabase } from "@/lib/supabaseClient";
import { irPara } from "@/lib/navegar";
import { PRECO_PADRAO, normalizarPreco, reais } from "@/lib/produto";

const INCLUI = [
  "Custo real por peça: material, energia, desgaste, falhas e acabamento",
  "Mão de obra e insumos por produto, do jeito que você trabalha",
  "Markup e faixas de atacado com preço sugerido automático",
  "Taxas de marketplace embutidas no preço final",
  "Comparação com concorrentes",
  "Acesso vitalício — paga uma vez, é seu",
];

function Conteudo() {
  const params = useSearchParams();
  const retorno = params.get("retorno");

  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState(null);
  const [conferindo, setConferindo] = React.useState(retorno === "sucesso");
  const [preco, setPreco] = React.useState(PRECO_PADRAO);

  // O preço vem de /api/preco, que resolve no servidor a mesma conta que o
  // checkout faz na hora de cobrar — é o que garante que o valor no botão e o
  // valor no Mercado Pago sejam o mesmo, promoção ligada ou vaga de fundador.
  // Consultar `vw_preco` daqui mostraria o preço de tabela a um fundador, que
  // seria cobrado por outro.
  React.useEffect(() => {
    let vivo = true;
    fetch("/api/preco")
      .then((r) => r.json())
      .then((d) => {
        if (vivo) setPreco({ ...normalizarPreco(d), fundador: !!d?.fundador });
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // ------------------------------------------------------------------
  // Esperando o pagamento cair
  //
  // A página fica conferindo a licença enquanto estiver aberta, e não só
  // quando o Mercado Pago devolve com retorno=sucesso. O motivo é o Pix:
  // quem paga por Pix não é redirecionado de volta — paga no aplicativo do
  // banco e volta para esta aba por conta própria, ou nem volta. Sem esta
  // conferência contínua, a pessoa pagava, o dinheiro caía, e a tela
  // continuava pedindo que ela comprasse.
  //
  // Quando há retorno=sucesso, a conferência é rápida e tem fim: o webhook
  // costuma chegar em segundos, e passar disso merece uma explicação. Sem
  // retorno, ela é lenta e não desiste — a pessoa pode levar minutos para
  // abrir o banco, e o custo de uma consulta a cada dez segundos é baixo.
  // ------------------------------------------------------------------
  React.useEffect(() => {
    const voltandoDoCheckout = retorno === "sucesso";
    const intervalo = voltandoDoCheckout ? 2000 : 10000;
    const limite = voltandoDoCheckout ? 15 : Infinity;

    let vivo = true;
    let tentativas = 0;

    const conferir = async () => {
      const { data } = await supabase.from("licencas").select("status").maybeSingle();
      if (!vivo) return;
      if (data?.status === "ativa") {
        irPara("/");
        return;
      }
      if (++tentativas >= limite) {
        setConferindo(false);
        setErro(
          "O pagamento foi registrado, mas a confirmação do Mercado Pago ainda não chegou. " +
            "Isso costuma levar poucos minutos — deixe esta página aberta que ela libera " +
            "sozinha. Se demorar muito, fale com o suporte."
        );
        return;
      }
      setTimeout(conferir, intervalo);
    };

    const inicio = setTimeout(conferir, voltandoDoCheckout ? 0 : intervalo);
    return () => {
      vivo = false;
      clearTimeout(inicio);
    };
  }, [retorno]);

  async function comprar() {
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/checkout", { method: "POST" });
      const dados = await r.json();

      // 409 é "já pagou". Dizer isso e deixar a pessoa parada aqui é o
      // oposto do que ela quer: ela clicou no botão justamente para entrar.
      // Quem já tem acesso vai direto para o painel.
      if (r.status === 409) {
        irPara("/");
        return;
      }

      if (!r.ok) throw new Error(dados?.erro || "Não foi possível iniciar a compra.");
      window.location.href = dados.url;
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    irPara("/entrar");
  }

  if (conferindo) {
    return (
      <div className="ap-paywall">
        <Card>
          <h1>Confirmando seu pagamento…</h1>
          <p>
            Estamos aguardando a confirmação do Mercado Pago. Não feche esta página — ela
            libera o acesso sozinha assim que o pagamento cair.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="ap-paywall">
      <Card>
        <span className="ap-paywall__selo">
          {preco.fundador
            ? "Lote de fundador"
            : preco.em_promocao
              ? preco.promo_rotulo || "Oferta por tempo limitado"
              : "Acesso vitalício"}
        </span>
        <h1>Libere sua calculadora</h1>
        <p className="ap-paywall__sub">
          {preco.fundador
            ? "Sua vaga no beta fechado está reconhecida nesta conta: o preço abaixo é o do lote de fundador. Pagamento único, sem mensalidade e sem renovação."
            : "Sua conta já existe. Falta só liberar o acesso — pagamento único, sem mensalidade e sem renovação."}
        </p>

        <div className="ap-paywall__preco">
          {preco.em_promocao && (
            <s className="ap-paywall__de">{reais(preco.cheio_centavos)}</s>
          )}
          <strong>{reais(preco.vigente_centavos)}</strong>
          <span>uma vez só</span>
        </div>

        <ul className="ap-paywall__lista">
          {(preco.fundador
            ? [...INCLUI, "Sua parte do trato: um formulário de 5 minutos em duas semanas"]
            : INCLUI
          ).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        {retorno === "falha" && (
          <p className="ap-auth__erro">
            O pagamento não foi concluído. Você pode tentar de novo — nada foi cobrado.
          </p>
        )}
        {retorno === "pendente" && (
          <p className="ap-auth__aviso">
            Seu pagamento está em processamento. Assim que for aprovado, o acesso é
            liberado automaticamente e você recebe o aviso por e-mail.
          </p>
        )}
        {erro && <p className="ap-auth__erro">{erro}</p>}

        <Button block onClick={comprar} disabled={enviando}>
          {enviando ? "Abrindo o pagamento…" : "Liberar meu acesso"}
        </Button>
        <p className="ap-paywall__pagamento">
          Pix ou cartão de crédito, pelo Mercado Pago.
        </p>

        <button type="button" className="ap-paywall__sair" onClick={sair}>
          Sair desta conta
        </button>
      </Card>
    </div>
  );
}

export default function AssinarPage() {
  return (
    <Suspense fallback={null}>
      <Conteudo />
    </Suspense>
  );
}
