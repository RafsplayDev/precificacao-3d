#!/usr/bin/env node
/**
 * Exporta os dados do Supabase para um .sql que o D1 importa.
 *
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/exportar-supabase.mjs > migracao-dados.sql
 *
 *   npx wrangler d1 execute precifica-3d --remote --file migracao-dados.sql
 *
 * O que acontece com as contas: cada usuário do Supabase vira uma linha em
 * `usuarios` com o MESMO id e o mesmo e-mail, sem google_sub. No primeiro
 * "Entrar com Google" com esse e-mail, o login adota a conta e a pessoa
 * encontra tudo o que já tinha. Contas sem e-mail são puladas.
 *
 * Só lê (GET). Tabelas de cobrança, beta e afiliados não são exportadas.
 * O arquivo é idempotente (INSERT OR IGNORE): rodar duas vezes não duplica.
 */

const URL_SB = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_SB || !CHAVE) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const H = { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` };

/** Colunas que existem no D1 (as geradas ficam de fora: o D1 recalcula). */
const TABELAS = {
  impressoras: ["id", "user_id", "nome", "marca", "tempo_retorno_meses", "valor_maquina", "hrs_dia", "dias_mes", "potencia_kw", "nivel_uso", "percent_falhas", "created_at"],
  filamentos: ["id", "user_id", "nome", "marca", "descricao", "peso_carretel_kg", "comprimento_carretel_m", "custo_brl", "created_at"],
  marketplaces: ["id", "user_id", "nome", "preco_fixo", "taxa_percent", "created_at"],
  insumos: ["id", "user_id", "nome", "marca", "descricao", "tipo", "valor_pago", "qtd_pecas", "unidade", "created_at"],
  maos_obra: ["id", "user_id", "nome", "categoria", "descricao", "custo_hora", "created_at"],
  bens_depreciacao: ["id", "user_id", "bem", "valor_aquisicao", "vida_util_meses", "taxa_anual", "created_at"],
  produtos: ["id", "user_id", "nome", "descricao", "imagem_url", "hrs_trabalhadas", "custo_hora", "markup_atacado", "markup_varejo", "preco_final_atacado", "preco_final_varejo", "usar_preco", "marketplace_id", "impostos_percent", "qtd_atacado", "desconto_atacado", "ajuste_custo_atacado", "ajuste_custo_atacado_pct", "qtd_varejo", "desconto_varejo", "ajuste_custo_varejo", "created_at", "updated_at"],
  pecas: ["id", "user_id", "produto_id", "numero", "nome", "impressora_id", "filamento_id", "comprimento_m", "tempo_impressao_horas", "peso_gr", "tarifa_kwh", "percent_acabamento", "unidades_por_impressao", "created_at"],
  custos_adicionais: ["id", "user_id", "produto_id", "insumo_id", "nome", "valor", "quantidade", "created_at"],
  produto_trabalhos: ["id", "user_id", "produto_id", "mao_obra_id", "minutos", "unidades", "created_at"],
  faixas_atacado: ["id", "user_id", "produto_id", "qtd_min", "qtd_max", "markup", "preco_final", "created_at"],
  concorrentes: ["id", "user_id", "produto_id", "nome", "link", "preco", "created_at"],
  gastos: ["id", "user_id", "data", "categoria", "descricao", "valor", "created_at"],
  vendas: ["id", "user_id", "data", "produto_id", "descricao", "cliente", "quantidade", "preco_unitario", "custo_unitario", "taxas", "created_at"],
};
const CONFIG = ["user_id", "tarifa_kwh", "concessionaria", "markup_atacado_padrao", "markup_varejo_padrao", "qtd_atacado_padrao", "atualizado_em"];

async function tudo(tabela) {
  const linhas = [];
  for (let de = 0; ; de += 1000) {
    const r = await fetch(`${URL_SB}/rest/v1/${tabela}?select=*`, {
      headers: { ...H, Range: `${de}-${de + 999}`, "Range-Unit": "items" },
    });
    if (!r.ok) throw new Error(`${tabela}: ${r.status} ${await r.text()}`);
    const pagina = await r.json();
    linhas.push(...pagina);
    if (pagina.length < 1000) return linhas;
  }
}

async function usuarios() {
  const todos = [];
  for (let pagina = 1; ; pagina++) {
    const r = await fetch(`${URL_SB}/auth/v1/admin/users?page=${pagina}&per_page=1000`, { headers: H });
    if (!r.ok) throw new Error(`auth.users: ${r.status} ${await r.text()}`);
    const { users } = await r.json();
    todos.push(...users);
    if (users.length < 1000) return todos;
  }
}

function lit(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function insert(tabela, colunas, linha) {
  return `INSERT OR IGNORE INTO ${tabela} (${colunas.join(", ")}) VALUES (${colunas.map((c) => lit(linha[c])).join(", ")});`;
}

const saida = ["-- Gerado por scripts/exportar-supabase.mjs em " + new Date().toISOString(), "PRAGMA defer_foreign_keys = true;"];

const users = (await usuarios()).filter((u) => u.email);
const ids = new Set(users.map((u) => u.id));
let perfis = [];
try { perfis = await tudo("perfis"); } catch { /* tabela opcional */ }
const nomeDe = Object.fromEntries(perfis.map((p) => [p.id, p.nome]));

saida.push("", "-- usuarios");
for (const u of users) {
  saida.push(insert("usuarios", ["id", "email", "nome", "created_at"], {
    id: u.id,
    email: u.email.toLowerCase(),
    nome: nomeDe[u.id] || u.user_metadata?.nome || u.user_metadata?.full_name || null,
    created_at: u.created_at,
  }));
}

saida.push("", "-- configuracoes");
for (const c of await tudo("configuracoes")) {
  if (ids.has(c.user_id)) saida.push(insert("configuracoes", CONFIG, c));
}

const contagem = {};
for (const [tabela, colunas] of Object.entries(TABELAS)) {
  const linhas = (await tudo(tabela)).filter((l) => ids.has(l.user_id));
  contagem[tabela] = linhas.length;
  saida.push("", `-- ${tabela} (${linhas.length})`);
  for (const l of linhas) saida.push(insert(tabela, colunas, l));
}

process.stdout.write(saida.join("\n") + "\n");
console.error(`Usuários: ${users.length}`, contagem);
