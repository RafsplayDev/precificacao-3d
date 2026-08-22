"use client";
import React from "react";
import { Button, Card, Input } from "@/design-system";
import { supabase } from "@/lib/supabaseClient";
import { reais } from "@/lib/produto";

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

export default function AdminPage() {
  const [ehAdmin, setEhAdmin] = React.useState(null);
  const [afiliados, setAfiliados] = React.useState([]);
  const [vendas, setVendas] = React.useState([]);
  const [msg, setMsg] = React.useState(null);
  const [erro, setErro] = React.useState(null);
  const [emailAfiliado, setEmailAfiliado] = React.useState("");
  const [emailCortesia, setEmailCortesia] = React.useState("");
  const [ocupado, setOcupado] = React.useState(false);

  const recarregar = React.useCallback(async () => {
    const [{ data: af }, { data: pg }] = await Promise.all([
      supabase.from("vw_afiliados_resumo").select("*").order("a_pagar_centavos", { ascending: false }),
      supabase
        .from("pagamentos")
        .select("id, email, valor_centavos, status, metodo, criado_em")
        .order("criado_em", { ascending: false })
        .limit(50),
    ]);
    setAfiliados(af || []);
    setVendas(pg || []);
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
        <h2>Últimas compras</h2>
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
            {vendas.map((v) => (
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
