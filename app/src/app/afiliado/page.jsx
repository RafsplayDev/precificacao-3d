"use client";
import React from "react";
import { Button, Card, Input } from "@/design-system";
import { supabase } from "@/lib/supabaseClient";
import { reais } from "@/lib/produto";

export default function AfiliadoPage() {
  const [afiliado, setAfiliado] = React.useState(null);
  const [comissoes, setComissoes] = React.useState([]);
  const [carregando, setCarregando] = React.useState(true);
  const [pix, setPix] = React.useState("");
  const [salvandoPix, setSalvandoPix] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      // O RLS já limita ao próprio afiliado, então não há filtro por id aqui.
      const { data: af } = await supabase.from("afiliados").select("*").maybeSingle();
      setAfiliado(af || null);
      setPix(af?.chave_pix || "");
      if (af) {
        const { data: cs } = await supabase
          .from("comissoes")
          .select("id, valor_centavos, status, criado_em, pago_em")
          .order("criado_em", { ascending: false });
        setComissoes(cs || []);
      }
      setCarregando(false);
    })();
  }, []);

  const link =
    afiliado && typeof window !== "undefined"
      ? // O link leva direto ao tutorial, não à vitrine: quem clica já sai
        // precificando uma peça sua. A indicação continua gravada no
        // primeiro request, seja qual for a página de chegada.
        `${window.location.origin}/tutorial?ref=${afiliado.codigo}`
      : "";

  const aPagar = comissoes
    .filter((c) => c.status === "a_pagar")
    .reduce((s, c) => s + c.valor_centavos, 0);
  const pago = comissoes
    .filter((c) => c.status === "pago")
    .reduce((s, c) => s + c.valor_centavos, 0);
  const vendas = comissoes.filter((c) => c.status !== "cancelado").length;

  async function copiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function salvarPix() {
    setSalvandoPix(true);
    await supabase.from("afiliados").update({ chave_pix: pix.trim() }).eq("id", afiliado.id);
    setSalvandoPix(false);
  }

  if (carregando) return <div className="ap-pagina"><p>Carregando…</p></div>;

  if (!afiliado) {
    return (
      <div className="ap-pagina">
        <Card>
          <h1>Programa de indicação</h1>
          <p>
            O programa é por convite. Se você quer indicar a Precificação 3D e receber
            comissão por venda, fale com a gente — a liberação é feita conta a conta.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="ap-pagina ap-afiliado">
      <header className="ap-pagina__topo">
        <h1>Suas indicações</h1>
        <p>
          {afiliado.ativo
            ? `Você recebe ${reais(afiliado.comissao_centavos)} por venda aprovada.`
            : "Seu cadastro de afiliado está pausado no momento."}
        </p>
      </header>

      <div className="ap-afiliado__numeros">
        <Card>
          <span>Vendas</span>
          <strong>{vendas}</strong>
        </Card>
        <Card>
          <span>A receber</span>
          <strong>{reais(aPagar)}</strong>
        </Card>
        <Card>
          <span>Já recebido</span>
          <strong>{reais(pago)}</strong>
        </Card>
      </div>

      <Card>
        <h2>Seu link</h2>
        <p className="ap-afiliado__dica">
          Ele abre o tutorial: quem clica já precifica uma peça sem criar conta. A
          indicação fica ligada a você por 30 dias, mesmo que a compra venha depois.
        </p>
        <div className="ap-afiliado__link">
          <code>{link}</code>
          <Button variant="secondary" onClick={copiar}>
            {copiado ? "Copiado!" : "Copiar"}
          </Button>
        </div>
        <p className="ap-afiliado__codigo">
          Código: <strong>{afiliado.codigo}</strong>
        </p>
      </Card>

      <Card>
        <h2>Onde receber</h2>
        <p className="ap-afiliado__dica">
          O repasse é feito por Pix. Sem a chave preenchida não há como te pagar.
        </p>
        <div className="ap-afiliado__pix">
          <Input
            id="afiliado-pix" label="Sua chave Pix"
            value={pix}
            onChange={(e) => setPix(e.target.value)}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
          />
          <Button onClick={salvarPix} disabled={salvandoPix}>
            {salvandoPix ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2>Histórico</h2>
        {comissoes.length === 0 ? (
          <p>Nenhuma venda ainda. Compartilhe seu link.</p>
        ) : (
          <table className="ap-tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Valor</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {comissoes.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.criado_em).toLocaleDateString("pt-BR")}</td>
                  <td>{reais(c.valor_centavos)}</td>
                  <td>
                    {c.status === "pago"
                      ? `Pago em ${new Date(c.pago_em).toLocaleDateString("pt-BR")}`
                      : c.status === "a_pagar"
                      ? "A receber"
                      : "Cancelada"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
