"use client";
import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card } from "@/design-system";
import { supabase } from "@/lib/supabaseClient";
import { PRECO_CENTAVOS, reais } from "@/lib/produto";

const INCLUI = [
  "Custo real por peça: material, energia, desgaste, falhas e acabamento",
  "Mão de obra e insumos por produto, do jeito que você trabalha",
  "Markup e faixas de atacado com preço sugerido automático",
  "Taxas de marketplace embutidas no preço final",
  "Comparação com concorrentes",
  "Acesso vitalício — paga uma vez, é seu",
];

function Conteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const retorno = params.get("retorno");

  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState(null);
  const [conferindo, setConferindo] = React.useState(retorno === "sucesso");

  // ------------------------------------------------------------------
  // Volta do Mercado Pago
  // O comprador costuma chegar aqui antes do webhook. Em vez de dizer que
  // não pagou — o que seria assustador e falso — a página fica conferindo
  // por alguns segundos até a licença virar ativa.
  // ------------------------------------------------------------------
  React.useEffect(() => {
    if (retorno !== "sucesso") return;
    let vivo = true;
    let tentativas = 0;

    const conferir = async () => {
      const { data } = await supabase.from("licencas").select("status").maybeSingle();
      if (!vivo) return;
      if (data?.status === "ativa") {
        router.refresh();
        router.push("/");
        return;
      }
      if (++tentativas >= 15) {
        setConferindo(false);
        setErro(
          "O pagamento foi registrado, mas a confirmação do Mercado Pago ainda não chegou. " +
            "Isso costuma levar poucos minutos — atualize esta página. Se demorar, fale com o suporte."
        );
        return;
      }
      setTimeout(conferir, 2000);
    };
    conferir();
    return () => {
      vivo = false;
    };
  }, [retorno, router]);

  async function comprar() {
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/checkout", { method: "POST" });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados?.erro || "Não foi possível iniciar a compra.");
      window.location.href = dados.url;
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/entrar");
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
        <span className="ap-paywall__selo">Acesso vitalício</span>
        <h1>Libere sua calculadora</h1>
        <p className="ap-paywall__sub">
          Sua conta já existe. Falta só liberar o acesso — pagamento único, sem
          mensalidade e sem renovação.
        </p>

        <div className="ap-paywall__preco">
          <strong>{reais(PRECO_CENTAVOS)}</strong>
          <span>uma vez só</span>
        </div>

        <ul className="ap-paywall__lista">
          {INCLUI.map((item) => (
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
