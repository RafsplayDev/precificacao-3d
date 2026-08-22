"use client";
import React from "react";
import { Button, IconButton, Icon, Dialog, Input, Select } from "@/design-system";
import { salvarLinha, inserirLinha, removerLinha, tratarMensagemErro } from "@/lib/useDados";
import { useToast } from "@/components/AppShell";
import { toNum, moneyPrecise, num, mascaraMoeda, moedaParaNumero, numeroParaMoeda } from "@/lib/format";

/**
 * Tabela editável ligada direto a uma tabela do Supabase.
 * Cada célula grava no blur; colunas `calc` são só leitura (vêm do banco).
 *
 * colunas: { key, label, tipo: "texto"|"numero"|"moeda"|"percent"|"minutos"|"select"|"calc", options?, formato? }
 *   - moeda usa máscara de caixa de banco: os dígitos entram pelos centavos.
 *   - minutos digita em minutos e grava em horas (a coluna do banco continua em horas).
 *   - select aceita `vazio` para oferecer a opção "nenhum" (grava null) e `options`
 *     pode ser função da linha, quando as opções dependem de outro campo.
 *   - `colunasFormulario` troca os campos do formulário de inclusão; com
 *     `formatarEntrada`/`lerEntrada` a coluna pode ser digitada numa unidade
 *     diferente da que vai para o banco (ex.: desconto virando markup).
 *   - `rotulo(linha)` troca o nome do campo no formulário, `oculto(linha)` some com
 *     ele, e `aoMudar(valor, linha)` devolve outros campos para gravar junto
 *     (ex.: mudar o tipo de medida troca a unidade).
 *   - calc aceita `valor(linha)` quando o número não vem pronto do banco.
 *   - a largura de cada coluna vem do maior texto que ela tem hoje (valores ou
 *     rótulo), com teto; passando disso a tabela rola na horizontal.
 */
export function TabelaEditavel({ tabela, colunas, linhas, novoRegistro, recarregar, aplicar, remover, vazio, semRemover = false, rotulo = "linha", abrirRef, semBotao = false, semTabela = false, colunasFormulario }) {
  const toast = useToast();
  const [salvando, setSalvando] = React.useState(null);
  const [itemParaExcluir, setItemParaExcluir] = React.useState(null);
  const [excluindo, setExcluindo] = React.useState(false);

  // Mede cada coluna pelo conteúdo real das linhas — não pelo nome dela.
  const larguras = React.useMemo(
    () => Object.fromEntries(colunas.map((c) => [c.key, medirColuna(c, linhas)])),
    [colunas, linhas]
  );

  async function gravar(linha, coluna, valorBruto) {
    const valor = coluna.lerEntrada
      ? coluna.lerEntrada(valorBruto)
      : coluna.tipo === "numero" ? toNum(valorBruto)
      : coluna.tipo === "moeda" ? moedaParaNumero(valorBruto)
      : coluna.tipo === "percent" ? toNum(valorBruto) / 100
      : coluna.tipo === "minutos" ? toNum(valorBruto) / 60
      : valorBruto === "" ? null : valorBruto;

    const atual = linha[coluna.key];
    const igual = coluna.tipo === "texto" ? String(atual ?? "") === String(valor ?? "") : toNum(atual) === valor;
    if (igual) return;

    const extras = coluna.aoMudar ? coluna.aoMudar(valor, linha) : null;

    setSalvando(linha.id);
    try {
      const salvo = await salvarLinha(tabela, linha.id, { [coluna.key]: valor, ...extras });
      // troca só a linha alterada; a página não pisca nem recarrega o banco todo
      if (aplicar) aplicar(tabela, salvo); else await recarregar();
    } catch (e) {
      toast({ tone: "danger", title: "Não foi possível salvar", message: tratarMensagemErro(e, tabela) });
    } finally {
      setSalvando(null);
    }
  }

  const [novo, setNovo] = React.useState(null); // rascunho do formulário de inclusão
  const [criando, setCriando] = React.useState(false);

  /** O botão de adicionar abre um formulário; a linha só nasce preenchida.
   *  `abrirRef` deixa uma tela de fora acionar o mesmo formulário. */
  const camposDoForm = colunasFormulario || colunas;

  function abrirFormulario() {
    const base = novoRegistro(linhas);
    setNovo({
      base,
      campos: Object.fromEntries(
        camposDoForm.filter((c) => c.tipo !== "calc").map((c) => [c.key, paraTexto(base[c.key], c)])
      ),
    });
  }

  if (abrirRef) abrirRef.current = abrirFormulario;

  async function adicionar() {
    setCriando(true);
    try {
      const campos = { ...novo.base };
      for (const col of camposDoForm) {
        if (col.tipo === "calc") continue;
        campos[col.key] = paraBanco(novo.campos[col.key], col);
      }
      const criado = await inserirLinha(tabela, campos);
      if (aplicar) aplicar(tabela, criado); else await recarregar();
      setNovo(null);
    } catch (e) {
      toast({ tone: "danger", title: "Não foi possível criar", message: tratarMensagemErro(e, tabela) });
    } finally {
      setCriando(false);
    }
  }

  async function confirmarExclusao() {
    if (!itemParaExcluir) return;
    setExcluindo(true);
    try {
      await removerLinha(tabela, itemParaExcluir.id);
      if (remover) remover(tabela, itemParaExcluir.id); else await recarregar();
      toast({ title: "Registro removido" });
      setItemParaExcluir(null);
    } catch (e) {
      toast({ tone: "danger", title: "Não foi possível remover", message: tratarMensagemErro(e, tabela) });
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div>
      {!semTabela && (
      <div className="ap-tablewrap">
        <table className="ap-table">
          <thead>
            <tr>
              {colunas.map((col) => (
                <th
                  key={col.key}
                  className={col.tipo === "calc" ? "ap-th--calc" : undefined}
                  style={larguraCol(col, larguras[col.key])}
                >
                  {col.label}
                </th>
              ))}
              {!semRemover && <th style={{ width: 44 }} />}
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={colunas.length + (semRemover ? 0 : 1)} style={{ color: "var(--text-muted)", padding: "var(--space-6) var(--space-3)" }}>
                  {vazio || "Nada cadastrado ainda."}
                </td>
              </tr>
            )}
            {linhas.map((linha) => (
              <tr key={linha.id} style={{ opacity: salvando === linha.id ? 0.5 : 1 }}>
                {colunas.map((col) => (
                  <td
                    key={col.key}
                    className={col.tipo === "calc" ? "ap-td--num ap-td--calc" : undefined}
                    title={col.tipo === "calc" ? "Calculado a partir dos outros campos" : undefined}
                    style={larguraCol(col, larguras[col.key])}
                  >
                    <Celula linha={linha} coluna={col} onCommit={(v) => gravar(linha, col, v)} />
                  </td>
                ))}
                {!semRemover && <td>
                  <IconButton
                    variant="ghost" size="sm" aria-label={`Remover ${linha.nome || linha.bem || "registro"}`}
                    onClick={() => setItemParaExcluir(linha)}
                  >
                    <Icon name="trash-2" size={16} />
                  </IconButton>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {novoRegistro && !semBotao && (
        <div style={{ marginTop: "var(--space-4)" }}>
          <Button variant="secondary" size="sm" icon={<Icon name="plus" size={16} />} onClick={abrirFormulario}>
            Adicionar {rotulo}
          </Button>
        </div>
      )}

      {novo && (
        <Dialog
          open={true}
          width={camposDoForm.length > 4 ? 680 : undefined}
          title={`Adicionar ${rotulo}`}
          description="Preencha os campos e a linha entra na lista."
          onClose={() => !criando && setNovo(null)}
          footer={
            <>
              <Button variant="secondary" size="sm" disabled={criando} onClick={() => setNovo(null)}>
                Cancelar
              </Button>
              <Button variant="accent" size="sm" disabled={criando} onClick={adicionar}>
                {criando ? "Adicionando..." : "Adicionar"}
              </Button>
            </>
          }
        >
          <div className="ap-form">
            {camposVisiveis(camposDoForm, { ...novo.base, ...novo.campos }).map((col, i) => (
              <CampoFormulario
                key={col.key}
                coluna={col}
                autoFocus={i === 0}
                linha={{ ...novo.base, ...novo.campos }}
                valor={novo.campos[col.key]}
                onChange={(v) =>
                  setNovo((n) => {
                    const campos = { ...n.campos, [col.key]: v };
                    const extras = col.aoMudar ? col.aoMudar(paraBanco(v, col), campos) : null;
                    for (const [k, val] of Object.entries(extras || {})) {
                      const alvo = camposDoForm.find((c) => c.key === k);
                      if (alvo) campos[k] = paraTexto(val, alvo);
                    }
                    return { ...n, campos };
                  })
                }
                onEnter={() => !criando && adicionar()}
              />
            ))}
          </div>
        </Dialog>
      )}

      {itemParaExcluir && (
        <Dialog
          open={true}
          title="Confirmar exclusão"
          description={`Tem certeza que deseja remover "${itemParaExcluir.nome || itemParaExcluir.bem || "este registro"}"? Esta ação não pode ser desfeita.`}
          onClose={() => !excluindo && setItemParaExcluir(null)}
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={excluindo}
                onClick={() => setItemParaExcluir(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="accent"
                size="sm"
                disabled={excluindo}
                onClick={confirmarExclusao}
              >
                {excluindo ? "Removendo..." : "Excluir"}
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}

function Celula({ linha, coluna, onCommit }) {
  const bruto = linha[coluna.key];

  if (coluna.tipo === "calc") {
    const cru = coluna.valor ? coluna.valor(linha) : bruto;
    if (coluna.formato === "texto") return <span className="ap-calc">{cru ?? "—"}</span>;
    const v = toNum(cru);
    return (
      <span className="ap-calc ap-calc--num">
        {coluna.formato === "moeda" ? moneyPrecise(v) : coluna.formato === "percent" ? `${num(v * 100)}%` : num(v)}
      </span>
    );
  }

  if (coluna.tipo === "select") {
    return (
      <select
        key={String(bruto ?? "")}
        className="ap-cell"
        defaultValue={bruto ?? ""}
        onChange={(e) => onCommit(e.target.value)}
      >
        {coluna.vazio && <option value="">{coluna.vazio}</option>}
        {opcoesDe(coluna, linha).map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    );
  }

  if (coluna.tipo === "moeda") {
    return <CelulaMoeda valor={bruto} onCommit={onCommit} />;
  }

  const valorInicial = coluna.formatarEntrada
    ? coluna.formatarEntrada(bruto)
    : coluna.tipo === "percent" ? String(toNum(bruto) * 100)
    : coluna.tipo === "minutos" ? String(Math.round(toNum(bruto) * 60 * 100) / 100)
    : coluna.tipo === "numero" ? String(toNum(bruto))
    : String(bruto ?? "");

  return (
    <input
      key={valorInicial}
      /* quem manda na largura é a coluna; o input não pode inflar a tabela. */
      size={2}
      className={`ap-cell ${coluna.tipo === "texto" ? "" : "ap-cell--num"}`}
      defaultValue={valorInicial}
      inputMode={coluna.tipo === "texto" ? undefined : "decimal"}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

/** Campo de dinheiro: digitou 1 vira 0,01; digitou 12 vira 0,12; 1234 vira 12,34. */
function CelulaMoeda({ valor, onCommit }) {
  const [texto, setTexto] = React.useState(() => numeroParaMoeda(valor));
  const [focado, setFocado] = React.useState(false);
  React.useEffect(() => { if (!focado) setTexto(numeroParaMoeda(valor)); }, [valor, focado]);

  return (
    <input
      size={2}
      className="ap-cell ap-cell--num"
      inputMode="numeric"
      value={texto}
      onFocus={() => setFocado(true)}
      onChange={(e) => setTexto(mascaraMoeda(e.target.value))}
      onBlur={(e) => { setFocado(false); onCommit(e.target.value); }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

/** Campos do formulário, já sem os calculados e os que a própria linha esconde. */
function camposVisiveis(colunas, linha) {
  return colunas.filter((c) => c.tipo !== "calc" && !(c.oculto && c.oculto(linha)));
}

/** As opções de um select podem depender da linha (unidade depende do tipo, etc.). */
function opcoesDe(col, linha) {
  return (typeof col.options === "function" ? col.options(linha) : col.options) || [];
}

/** O texto que a coluna realmente mostra numa linha — é ele que dita a largura. */
function textoDaCelula(linha, col) {
  const bruto = linha[col.key];
  if (col.formatarEntrada) return String(col.formatarEntrada(bruto));
  if (col.tipo === "select") {
    const achado = opcoesDe(col, linha).find((o) => (o.value ?? o) === bruto);
    return String(achado ? achado.label ?? achado : "");
  }
  if (col.tipo === "calc") {
    if (col.formato === "texto") return String((col.valor ? col.valor(linha) : bruto) ?? "");
    const v = toNum(col.valor ? col.valor(linha) : bruto);
    return col.formato === "moeda" ? moneyPrecise(v) : col.formato === "percent" ? `${num(v * 100)}%` : num(v);
  }
  if (col.tipo === "moeda") return numeroParaMoeda(bruto);
  if (col.tipo === "percent") return String(toNum(bruto) * 100);
  if (col.tipo === "minutos") return String(Math.round(toNum(bruto) * 60 * 100) / 100);
  if (col.tipo === "numero") return String(toNum(bruto));
  return String(bruto ?? "");
}

/**
 * Largura em `ch` a partir do maior conteúdo da coluna, com piso e teto.
 * O rótulo entra no cálculo com um acréscimo, porque vai em caixa alta e espaçado.
 */
function medirColuna(col, linhas = []) {
  const maiorValor = linhas.reduce((max, l) => Math.max(max, textoDaCelula(l, col).length), 0);
  const rotulo = String(col.label || "").length * 1.25;
  const teto = col.tipo === "texto" || col.tipo === "select" ? 32 : 16;
  const ch = Math.min(Math.max(maiorValor + 4, rotulo + 2, 6), teto);
  return `${Math.ceil(ch)}ch`;
}

/** A coluna `estica` fica com a sobra da linha, mas nunca abaixo do que mediu. */
function larguraCol(col, largura) {
  return col.estica
    ? { width: "auto", minWidth: largura }
    : { width: largura, minWidth: largura, whiteSpace: "nowrap" };
}

/* ---------- conversões entre o texto do formulário e o valor do banco ---------- */

function paraTexto(valor, coluna) {
  if (coluna.formatarEntrada) return coluna.formatarEntrada(valor);
  if (coluna.tipo === "moeda") return numeroParaMoeda(valor);
  if (coluna.tipo === "percent") return String(toNum(valor) * 100);
  if (coluna.tipo === "minutos") return String(Math.round(toNum(valor) * 60 * 100) / 100);
  if (coluna.tipo === "numero") return String(toNum(valor));
  return valor == null ? "" : String(valor);
}

function paraBanco(texto, coluna) {
  if (coluna.lerEntrada) return coluna.lerEntrada(texto);
  if (coluna.tipo === "moeda") return moedaParaNumero(texto);
  if (coluna.tipo === "numero") return toNum(texto);
  if (coluna.tipo === "percent") return toNum(texto) / 100;
  if (coluna.tipo === "minutos") return toNum(texto) / 60;
  return texto === "" ? null : texto;
}

function CampoFormulario({ coluna, linha, valor, onChange, onEnter, autoFocus }) {
  const rotulo = coluna.rotulo ? coluna.rotulo(linha) : coluna.label;

  if (coluna.tipo === "select") {
    return (
      <Select
        label={rotulo}
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value)}
        options={[
          ...(coluna.vazio ? [{ value: "", label: coluna.vazio }] : []),
          ...opcoesDe(coluna, linha).map((o) => ({ value: o.value ?? o, label: o.label ?? o })),
        ]}
      />
    );
  }

  const dinheiro = coluna.tipo === "moeda";

  return (
    <Input
      label={rotulo}
      autoFocus={autoFocus}
      value={valor ?? ""}
      prefix={dinheiro ? "R$" : undefined}
      inputMode={coluna.tipo === "texto" ? undefined : dinheiro ? "numeric" : "decimal"}
      onChange={(e) => onChange(dinheiro ? mascaraMoeda(e.target.value) : e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") onEnter(); }}
    />
  );
}
