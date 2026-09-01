"use client";
import React from "react";
import { Button, Card, Input, Switch } from "@/design-system";
import { supabase } from "@/lib/supabaseClient";
import { reais } from "@/lib/produto";
import {
  VAGAS,
  PRECO_FUNDADOR_CENTAVOS,
  resumoDasRespostas,
  situacaoDaVaga,
} from "@/lib/beta";

async function chamar(url, metodo, corpo) {
  const r = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados?.erro || "Falhou.");
  return dados;
}

/** 3490 → "34,90", para o campo aceitar o formato que se digita. */
function moeda(centavos) {
  if (centavos == null || centavos === "") return "";
  return (Number(centavos) / 100).toFixed(2).replace(".", ",");
}

/**
 * ISO do banco → valor de <input type="datetime-local">.
 *
 * O input não aceita fuso nem segundos, e exige hora LOCAL. Passar o ISO
 * cru deixa o campo em branco sem avisar, e a promoção parece ter perdido
 * as datas que na verdade continuam gravadas.
 */
function paraCampoData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

const PRECOS_VAZIO = {
  preco: "",
  comissao: "",
  promo_ativa: false,
  promo_preco: "",
  promo_rotulo: "",
  promo_inicio: "",
  promo_fim: "",
};

export default function AdminPage() {
  const [ehAdmin, setEhAdmin] = React.useState(null);
  const [afiliados, setAfiliados] = React.useState([]);
  const [vendas, setVendas] = React.useState([]);
  const [betas, setBetas] = React.useState([]);
  const [betaAberto, setBetaAberto] = React.useState(null);
  const [msg, setMsg] = React.useState(null);
  const [erro, setErro] = React.useState(null);
  const [emailAfiliado, setEmailAfiliado] = React.useState("");
  const [emailCortesia, setEmailCortesia] = React.useState("");
  const [ocupado, setOcupado] = React.useState(false);
  const [mostrarTudo, setMostrarTudo] = React.useState(false);
  const [precos, setPrecos] = React.useState(PRECOS_VAZIO);
  const [precosCarregados, setPrecosCarregados] = React.useState(false);

  const recarregar = React.useCallback(async () => {
    const [{ data: af }, { data: pg }, { data: bt }] = await Promise.all([
      supabase.from("vw_afiliados_resumo").select("*").order("a_pagar_centavos", { ascending: false }),
      supabase
        .from("pagamentos")
        .select("id, email, valor_centavos, status, metodo, criado_em")
        .order("criado_em", { ascending: false })
        .limit(50),
      // A tabela crua, e não a vista de contagem: aqui o admin precisa do
      // contato de cada pessoa. O RLS da migração 0024 já só devolve estas
      // linhas para quem é admin.
      supabase
        .from("beta_candidatos")
        .select("*")
        .order("criado_em", { ascending: false }),
    ]);
    setAfiliados(af || []);
    setVendas(pg || []);
    setBetas(bt || []);

    const r = await fetch("/api/admin/precos");
    if (r.ok) {
      const { precificacao: c } = await r.json();
      setPrecos({
        preco: moeda(c?.preco_centavos),
        comissao: moeda(c?.comissao_centavos),
        promo_ativa: !!c?.promo_ativa,
        promo_preco: moeda(c?.promo_preco_centavos),
        promo_rotulo: c?.promo_rotulo || "",
        promo_inicio: paraCampoData(c?.promo_inicio),
        promo_fim: paraCampoData(c?.promo_fim),
      });
      setPrecosCarregados(true);
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // A política de `admins` só devolve a própria linha, então uma linha
      // aqui já significa "sou admin".
      const { data } = await supabase.from("admins").select("user_id").maybeSingle();
      setEhAdmin(!!data && data.user_id === user?.id);
      if (data) await recarregar();
    })();
  }, [recarregar]);

  async function acao(fn) {
    setErro(null);
    setMsg(null);
    setOcupado(true);
    try {
      const texto = await fn();
      setMsg(texto);
      await recarregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  if (ehAdmin === null) return <div className="ap-pagina"><p>Carregando…</p></div>;

  if (!ehAdmin) {
    return (
      <div className="ap-pagina">
        <Card>
          <h1>Área restrita</h1>
          <p>Esta página é do administrador do sistema.</p>
        </Card>
      </div>
    );
  }

  const totalAPagar = afiliados.reduce((s, a) => s + Number(a.a_pagar_centavos || 0), 0);
  const aprovadas = vendas.filter((v) => v.status === "aprovado");

  // ------------------------------------------------------------------
  // O que a lista mostra por padrão
  //
  // Toda pessoa que abre o checkout e desiste deixa uma linha `pendente`
  // para sempre, e cada tentativa recusada deixa uma `cancelado`. São
  // muito mais numerosas que as vendas, e afogam justamente o que se quer
  // ver ao abrir esta tela. Ficam a um clique de distância, para quando a
  // pergunta for outra — investigar uma compra que travou, por exemplo.
  //
  // Pendentes recentes continuam à vista: uma compra de minutos atrás
  // ainda pode fechar, e é a que alguém pode estar esperando agora.
  // ------------------------------------------------------------------
  // ------------------------------------------------------------------
  // Beta fechado
  //
  // A contagem de vagas é a mesma regra da página pública: ocupa vaga quem
  // foi aprovado e ou já pagou, ou ainda está dentro da reserva. Refazê-la
  // aqui a partir das linhas cruas evita uma segunda consulta só para exibir
  // um número que já está na mão.
  // ------------------------------------------------------------------
  const situacoes = betas.map((b) => ({ ...b, situacao: situacaoDaVaga(b) }));
  const ocupadas = situacoes.filter(
    (b) => b.situacao.chave === "pago" || b.situacao.chave === "reservada"
  ).length;
  const pagos = situacoes.filter((b) => b.situacao.chave === "pago").length;
  const vencidas = situacoes.filter((b) => b.situacao.chave === "vencida").length;

  const UMA_HORA = 60 * 60 * 1000;
  const visiveis = mostrarTudo
    ? vendas
    : vendas.filter((v) => {
        if (v.status === "aprovado" || v.status === "estornado") return true;
        if (v.status !== "pendente") return false;
        return Date.now() - new Date(v.criado_em).getTime() < UMA_HORA;
      });
  const ocultas = vendas.length - visiveis.length;

  return (
    <div className="ap-pagina ap-admin">
      <header className="ap-pagina__topo">
        <h1>Administração</h1>
      </header>

      <div className="ap-afiliado__numeros">
        <Card>
          <span>Vendas aprovadas</span>
          <strong>{aprovadas.length}</strong>
        </Card>
        <Card>
          <span>Faturamento bruto</span>
          <strong>{reais(aprovadas.reduce((s, v) => s + v.valor_centavos, 0))}</strong>
        </Card>
        <Card>
          <span>Comissões a repassar</span>
          <strong>{reais(totalAPagar)}</strong>
        </Card>
      </div>

      {msg && <p className="ap-auth__aviso">{msg}</p>}
      {erro && <p className="ap-auth__erro">{erro}</p>}

      <Card>
        <h2>Preço e promoções</h2>
        <p className="ap-afiliado__dica">
          Vale na hora, sem publicar de novo: a página de vendas, a tela de liberar
          acesso e a cobrança no Mercado Pago passam a usar o valor salvo aqui.
        </p>

        {!precosCarregados ? (
          <p>Carregando a precificação…</p>
        ) : (
          <>
            <div className="ap-admin__precos">
              <Input
                id="preco-normal"
                label="Preço de tabela"
                inputMode="decimal"
                prefix="R$"
                value={precos.preco}
                onChange={(e) => setPrecos((p) => ({ ...p, preco: e.target.value }))}
              />
              <Input
                id="preco-comissao"
                label="Comissão do afiliado"
                inputMode="decimal"
                prefix="R$"
                hint="Vale para afiliados novos; quem já é afiliado mantém a dele."
                value={precos.comissao}
                onChange={(e) => setPrecos((p) => ({ ...p, comissao: e.target.value }))}
              />
            </div>

            <div className="ap-admin__promo-topo">
              <Switch
                label="Promoção ligada"
                checked={precos.promo_ativa}
                onChange={(v) => setPrecos((p) => ({ ...p, promo_ativa: v }))}
              />
              {precos.promo_ativa && (
                <span className="ap-admin__promo-resumo">
                  Aparece como <s>{precos.preco || "—"}</s>{" "}
                  <strong>R$ {precos.promo_preco || "—"}</strong>
                </span>
              )}
            </div>

            {precos.promo_ativa && (
              <div className="ap-admin__precos">
                <Input
                  id="promo-preco"
                  label="Preço promocional"
                  inputMode="decimal"
                  prefix="R$"
                  value={precos.promo_preco}
                  onChange={(e) => setPrecos((p) => ({ ...p, promo_preco: e.target.value }))}
                />
                <Input
                  id="promo-rotulo"
                  label="Selo da oferta"
                  placeholder="Black Friday"
                  hint="Substitui o “Acesso vitalício” enquanto a promoção durar."
                  value={precos.promo_rotulo}
                  onChange={(e) => setPrecos((p) => ({ ...p, promo_rotulo: e.target.value }))}
                />
                <Input
                  id="promo-inicio"
                  label="Começa em"
                  type="datetime-local"
                  hint="Em branco: já vale."
                  value={precos.promo_inicio}
                  onChange={(e) => setPrecos((p) => ({ ...p, promo_inicio: e.target.value }))}
                />
                <Input
                  id="promo-fim"
                  label="Termina em"
                  type="datetime-local"
                  hint="Em branco: até você desligar."
                  value={precos.promo_fim}
                  onChange={(e) => setPrecos((p) => ({ ...p, promo_fim: e.target.value }))}
                />
              </div>
            )}

            <Button
              disabled={ocupado}
              onClick={() =>
                acao(async () => {
                  await chamar("/api/admin/precos", "PATCH", precos);
                  return "Precificação salva.";
                })
              }
            >
              Salvar precificação
            </Button>
          </>
        )}
      </Card>

      <Card>
        <div className="ap-admin__cabeca-lista">
          <h2>Beta fechado — lote de fundador</h2>
          <span className="ap-admin__beta-resumo">
            {ocupadas} de {VAGAS} vagas · {pagos} pago(s) · preço de fundador{" "}
            {reais(PRECO_FUNDADOR_CENTAVOS)}
          </span>
        </div>

        {betas.length === 0 ? (
          <p>Nenhuma candidatura ainda.</p>
        ) : (
          <>
            <p className="ap-afiliado__dica">
              {situacoes.length} candidatura(s).{" "}
              {vencidas > 0 && (
                <>
                  {vencidas} reserva(s) vencida(s) — essas pessoas passaram no filtro,
                  não pagaram a tempo e devolveram a vaga ao lote.
                </>
              )}
            </p>
            <table className="ap-tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Pessoa</th>
                  <th>WhatsApp</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {situacoes.map((b) => (
                  <React.Fragment key={b.id}>
                    <tr>
                      <td>{new Date(b.criado_em).toLocaleDateString("pt-BR")}</td>
                      <td>
                        {b.nome}
                        <br />
                        <small>{b.email}</small>
                      </td>
                      <td>{b.whatsapp}</td>
                      <td>
                        <span className={`ap-admin__vaga ap-admin__vaga--${b.situacao.chave}`}>
                          {b.situacao.rotulo}
                        </span>
                        {b.situacao.ate && b.situacao.chave === "reservada" && (
                          <>
                            <br />
                            <small>até {b.situacao.ate.toLocaleString("pt-BR")}</small>
                          </>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setBetaAberto((v) => (v === b.id ? null : b.id))}
                        >
                          {betaAberto === b.id ? "Fechar" : "Ver respostas"}
                        </button>
                      </td>
                    </tr>
                    {betaAberto === b.id && (
                      <tr className="ap-admin__beta-detalhe">
                        <td colSpan={5}>
                          <dl>
                            {resumoDasRespostas(b.respostas).map((r) => (
                              <div key={r.id}>
                                <dt>{r.curto}</dt>
                                {/* A resposta que barrou fica marcada: é o que
                                    explica, de relance, por que a pessoa não
                                    entrou no lote. */}
                                <dd className={r.passa === false ? "barrou" : undefined}>
                                  {r.rotulo}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>

      <Card>
        <h2>Convidar afiliado</h2>
        <p className="ap-afiliado__dica">
          A pessoa precisa já ter criado a conta. O código de indicação é gerado na hora.
        </p>
        <div className="ap-afiliado__pix">
          <Input
            id="admin-afiliado-email" label="E-mail da pessoa"
            type="email"
            value={emailAfiliado}
            onChange={(e) => setEmailAfiliado(e.target.value)}
          />
          <Button
            disabled={ocupado}
            onClick={() =>
              acao(async () => {
                const r = await chamar("/api/admin/afiliados", "POST", { email: emailAfiliado });
                setEmailAfiliado("");
                return `Afiliado criado. Código: ${r.afiliado.codigo}`;
              })
            }
          >
            Convidar
          </Button>
        </div>
      </Card>

      <Card>
        <h2>Liberar acesso manualmente</h2>
        <p className="ap-afiliado__dica">
          Cortesia ou conserto de compra travada. Fica marcado como cortesia, fora da
          contagem de vendas.
        </p>
        <div className="ap-afiliado__pix">
          <Input
            id="admin-cortesia-email" label="E-mail da conta"
            type="email"
            value={emailCortesia}
            onChange={(e) => setEmailCortesia(e.target.value)}
          />
          <Button
            disabled={ocupado}
            onClick={() =>
              acao(async () => {
                await chamar("/api/admin/licencas", "PATCH", {
                  email: emailCortesia,
                  acao: "liberar",
                });
                setEmailCortesia("");
                return "Acesso liberado.";
              })
            }
          >
            Liberar
          </Button>
        </div>
      </Card>

      <Card>
        <h2>Afiliados e repasses</h2>
        {afiliados.length === 0 ? (
          <p>Nenhum afiliado ainda.</p>
        ) : (
          <table className="ap-tabela">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Código</th>
                <th>Vendas</th>
                <th>Chave Pix</th>
                <th>A pagar</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {afiliados.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.nome || "—"}
                    <br />
                    <small>{a.email}</small>
                  </td>
                  <td><code>{a.codigo}</code></td>
                  <td>{a.vendas}</td>
                  <td>{a.chave_pix || <em>não informada</em>}</td>
                  <td>{reais(a.a_pagar_centavos)}</td>
                  <td>
                    {Number(a.a_pagar_centavos) > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={ocupado}
                        onClick={() =>
                          acao(async () => {
                            const r = await chamar("/api/admin/comissoes", "PATCH", {
                              afiliado_id: a.id,
                              acao: "pagar",
                            });
                            return `${r.atualizadas} comissão(ões) marcada(s) como paga(s).`;
                          })
                        }
                      >
                        Marcar como pago
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <div className="ap-admin__cabeca-lista">
          <h2>Últimas compras</h2>
          {(ocultas > 0 || mostrarTudo) && (
            <button type="button" onClick={() => setMostrarTudo((v) => !v)}>
              {mostrarTudo
                ? "Mostrar só o que importa"
                : `Ver tudo (${ocultas} ocultas)`}
            </button>
          )}
        </div>
        <table className="ap-tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>E-mail</th>
              <th>Valor</th>
              <th>Forma</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((v) => (
              <tr key={v.id}>
                <td>{new Date(v.criado_em).toLocaleString("pt-BR")}</td>
                <td>{v.email}</td>
                <td>{reais(v.valor_centavos)}</td>
                <td>{v.metodo || "—"}</td>
                <td>{v.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
