-- =====================================================================
-- Precificação 3D — schema do Cloudflare D1 (SQLite)
--
-- Tradução do schema final do Supabase (migrações 0001 a 0026), sem as
-- tabelas de cobrança, beta e afiliados. O que o Postgres fazia sozinho:
--
--  • `auth.users` virou `usuarios`, preenchido pelo login com o Google.
--  • O RLS (`user_id = auth.uid()`) virou o filtro obrigatório da rota
--    /api/dados, que só monta SQL com o user_id da sessão.
--  • As colunas `generated always ... stored` continuam geradas, como
--    colunas VIRTUAL do SQLite: o app lê `custo_por_grama` e companhia
--    direto da linha, igual antes.
--  • O trigger `semear_conta` virou código no callback do login.
--
-- Datas em texto ISO-8601; ids em texto (UUID gerado pelo servidor).
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- contas
CREATE TABLE IF NOT EXISTS usuarios (
  id          TEXT PRIMARY KEY,
  google_sub  TEXT NOT NULL UNIQUE,  -- o "sub" do Google: id estável da conta
  email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nome        TEXT,
  foto_url    TEXT,
  admin       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ultimo_login TEXT
);

-- O cookie guarda o token; aqui fica só o hash SHA-256 dele. Vazar esta
-- tabela não dá acesso a nenhuma sessão.
CREATE TABLE IF NOT EXISTS sessoes (
  id_hash     TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em   TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS sessoes_user_idx ON sessoes(user_id);

-- ---------------------------------------------------------------- cadastros
CREATE TABLE IF NOT EXISTS configuracoes (
  user_id               TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  tarifa_kwh            REAL NOT NULL DEFAULT 0.95,
  concessionaria        TEXT,
  markup_atacado_padrao REAL NOT NULL DEFAULT 2.0,
  markup_varejo_padrao  REAL NOT NULL DEFAULT 3.0,
  qtd_atacado_padrao    REAL NOT NULL DEFAULT 10,
  atualizado_em         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS impressoras (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  marca               TEXT,
  tempo_retorno_meses REAL NOT NULL DEFAULT 10,
  valor_maquina       REAL NOT NULL DEFAULT 0,
  hrs_dia             REAL NOT NULL DEFAULT 20,
  dias_mes            REAL NOT NULL DEFAULT 25,
  potencia_kw         REAL NOT NULL DEFAULT 0.5,
  nivel_uso           TEXT NOT NULL DEFAULT 'Medio'
                      CHECK (nivel_uso IN ('Basico','Medio','Profissional','Intenso')),
  percent_falhas      REAL NOT NULL DEFAULT 0.05,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  nivel_desgaste REAL GENERATED ALWAYS AS (
    CASE nivel_uso WHEN 'Basico' THEN 0.10 WHEN 'Medio' THEN 0.20
                   WHEN 'Profissional' THEN 0.30 ELSE 0.45 END) VIRTUAL,
  uso_estimado_anual_hrs REAL GENERATED ALWAYS AS (tempo_retorno_meses * hrs_dia * dias_mes) VIRTUAL,
  hr_ano REAL GENERATED ALWAYS AS (hrs_dia * dias_mes * 12) VIRTUAL,
  valor_adicionar_hr REAL GENERATED ALWAYS AS (
    COALESCE(valor_maquina * 1.0 / NULLIF(tempo_retorno_meses * hrs_dia * dias_mes, 0), 0)) VIRTUAL
);
CREATE UNIQUE INDEX IF NOT EXISTS impressoras_user_nome ON impressoras(user_id, nome COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS filamentos (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome                   TEXT NOT NULL,
  marca                  TEXT,
  descricao              TEXT,
  peso_carretel_kg       REAL NOT NULL DEFAULT 1,
  comprimento_carretel_m REAL NOT NULL DEFAULT 335,
  custo_brl              REAL NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  custo_por_grama REAL GENERATED ALWAYS AS (
    COALESCE(custo_brl * 1.0 / NULLIF(peso_carretel_kg * 1000, 0), 0)) VIRTUAL
);
CREATE UNIQUE INDEX IF NOT EXISTS filamentos_user_nome ON filamentos(user_id, nome COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS marketplaces (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  preco_fixo    REAL NOT NULL DEFAULT 0,
  taxa_percent  REAL NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS marketplaces_user_nome ON marketplaces(user_id, nome COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS insumos (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  marca       TEXT,
  descricao   TEXT,
  tipo        TEXT NOT NULL DEFAULT 'Unidade'
              CHECK (tipo IN ('Unidade','Peso','Volume','Comprimento')),
  valor_pago  REAL NOT NULL DEFAULT 0,
  qtd_pecas   REAL NOT NULL DEFAULT 1,
  unidade     TEXT NOT NULL DEFAULT 'un',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  custo_unitario REAL GENERATED ALWAYS AS (
    COALESCE(valor_pago * 1.0 / NULLIF(qtd_pecas, 0), 0)) VIRTUAL
);
CREATE UNIQUE INDEX IF NOT EXISTS insumos_user_nome ON insumos(user_id, nome COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS maos_obra (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  categoria   TEXT NOT NULL DEFAULT 'Producao'
              CHECK (categoria IN ('Producao','Acabamento','Modelagem')),
  descricao   TEXT,
  custo_hora  REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  custo_minuto REAL GENERATED ALWAYS AS (COALESCE(custo_hora / 60.0, 0)) VIRTUAL
);
CREATE UNIQUE INDEX IF NOT EXISTS maos_obra_user_nome ON maos_obra(user_id, nome COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS bens_depreciacao (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  bem              TEXT NOT NULL,
  valor_aquisicao  REAL NOT NULL DEFAULT 0,
  vida_util_meses  REAL NOT NULL DEFAULT 12,
  taxa_anual       REAL NOT NULL DEFAULT 0.10,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  vida_util_anos REAL GENERATED ALWAYS AS (vida_util_meses / 12.0) VIRTUAL,
  depreciacao_mensal REAL GENERATED ALWAYS AS (
    COALESCE(valor_aquisicao * 1.0 / NULLIF(vida_util_meses, 0), 0)) VIRTUAL
);
CREATE INDEX IF NOT EXISTS bens_depreciacao_user_idx ON bens_depreciacao(user_id);

-- ---------------------------------------------------------------- produtos
CREATE TABLE IF NOT EXISTS produtos (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome                     TEXT NOT NULL,
  descricao                TEXT,
  imagem_url               TEXT,
  hrs_trabalhadas          REAL NOT NULL DEFAULT 1,
  custo_hora               REAL NOT NULL DEFAULT 0,
  markup_atacado           REAL NOT NULL DEFAULT 2.0,
  markup_varejo            REAL NOT NULL DEFAULT 3.0,
  preco_final_atacado      REAL NOT NULL DEFAULT 0,
  preco_final_varejo       REAL NOT NULL DEFAULT 0,
  usar_preco               TEXT NOT NULL DEFAULT 'Sugerido' CHECK (usar_preco IN ('Sugerido','Final')),
  marketplace_id           TEXT REFERENCES marketplaces(id) ON DELETE SET NULL,
  impostos_percent         REAL NOT NULL DEFAULT 0,
  qtd_atacado              REAL NOT NULL DEFAULT 100,
  desconto_atacado         REAL NOT NULL DEFAULT 0,
  ajuste_custo_atacado     REAL NOT NULL DEFAULT 0,
  ajuste_custo_atacado_pct REAL NOT NULL DEFAULT 0,
  qtd_varejo               REAL NOT NULL DEFAULT 100,
  desconto_varejo          REAL NOT NULL DEFAULT 0,
  ajuste_custo_varejo      REAL NOT NULL DEFAULT 0,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS produtos_user_nome ON produtos(user_id, nome COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS pecas (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  produto_id             TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  numero                 INTEGER NOT NULL DEFAULT 1,
  nome                   TEXT NOT NULL,
  impressora_id          TEXT REFERENCES impressoras(id) ON DELETE RESTRICT,
  filamento_id           TEXT REFERENCES filamentos(id) ON DELETE RESTRICT,
  comprimento_m          REAL NOT NULL DEFAULT 0,
  tempo_impressao_horas  REAL NOT NULL DEFAULT 0,
  peso_gr                REAL NOT NULL DEFAULT 0,
  tarifa_kwh             REAL NOT NULL DEFAULT 0.95,
  percent_acabamento     REAL NOT NULL DEFAULT 0.05,
  unidades_por_impressao INTEGER NOT NULL DEFAULT 1 CHECK (unidades_por_impressao >= 1),
  created_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS pecas_user_idx ON pecas(user_id);
CREATE INDEX IF NOT EXISTS pecas_produto_idx ON pecas(produto_id);

CREATE TABLE IF NOT EXISTS custos_adicionais (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  produto_id  TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  insumo_id   TEXT REFERENCES insumos(id) ON DELETE RESTRICT,
  nome        TEXT,
  valor       REAL NOT NULL DEFAULT 0,
  quantidade  REAL NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS custos_adicionais_user_idx ON custos_adicionais(user_id);
CREATE INDEX IF NOT EXISTS custos_adicionais_produto_idx ON custos_adicionais(produto_id);

CREATE TABLE IF NOT EXISTS produto_trabalhos (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  produto_id   TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  mao_obra_id  TEXT REFERENCES maos_obra(id) ON DELETE RESTRICT,
  minutos      REAL NOT NULL DEFAULT 0,
  unidades     INTEGER NOT NULL DEFAULT 1 CHECK (unidades >= 1),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS produto_trabalhos_user_idx ON produto_trabalhos(user_id);
CREATE INDEX IF NOT EXISTS produto_trabalhos_produto_idx ON produto_trabalhos(produto_id);

CREATE TABLE IF NOT EXISTS faixas_atacado (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  produto_id  TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  qtd_min     REAL NOT NULL DEFAULT 1,
  qtd_max     REAL NOT NULL DEFAULT 0,
  markup      REAL NOT NULL DEFAULT 2.0,
  preco_final REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS faixas_atacado_user_idx ON faixas_atacado(user_id);
CREATE INDEX IF NOT EXISTS faixas_atacado_produto_idx ON faixas_atacado(produto_id, qtd_min);

CREATE TABLE IF NOT EXISTS concorrentes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  produto_id  TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  link        TEXT,
  preco       REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS concorrentes_user_idx ON concorrentes(user_id);
CREATE INDEX IF NOT EXISTS concorrentes_produto_idx ON concorrentes(produto_id);

-- ---------------------------------------------------------------- gestão
CREATE TABLE IF NOT EXISTS gastos (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  data        TEXT NOT NULL DEFAULT (date('now')),
  categoria   TEXT NOT NULL DEFAULT 'Outros'
              CHECK (categoria IN ('Filamento','Energia','Manutencao','Pecas','Insumos',
                                   'Equipamento','Marketing','Taxas','Outros')),
  descricao   TEXT,
  valor       REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS gastos_user_idx ON gastos(user_id, data DESC);

CREATE TABLE IF NOT EXISTS vendas (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  data            TEXT NOT NULL DEFAULT (date('now')),
  produto_id      TEXT REFERENCES produtos(id) ON DELETE SET NULL,
  descricao       TEXT,
  cliente         TEXT,
  quantidade      REAL NOT NULL DEFAULT 1,
  preco_unitario  REAL NOT NULL DEFAULT 0,
  custo_unitario  REAL NOT NULL DEFAULT 0,
  taxas           REAL NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  receita     REAL GENERATED ALWAYS AS (quantidade * preco_unitario) VIRTUAL,
  custo_total REAL GENERATED ALWAYS AS (quantidade * custo_unitario) VIRTUAL,
  lucro       REAL GENERATED ALWAYS AS (quantidade * preco_unitario - quantidade * custo_unitario - taxas) VIRTUAL
);
CREATE INDEX IF NOT EXISTS vendas_user_idx ON vendas(user_id, data DESC);
CREATE INDEX IF NOT EXISTS vendas_produto_idx ON vendas(produto_id);

-- ---------------------------------------------------------------- anúncios
-- A vitrine de produtos com link de afiliado. Quem escreve aqui é a rota
-- POST /api/anuncios, chamada pela tarefa automática que garimpa produtos;
-- `origem_id` é a chave estável do produto na loja de origem, e é por ela
-- que um produto já cadastrado é atualizado em vez de duplicado.
CREATE TABLE IF NOT EXISTS anuncios (
  id              TEXT PRIMARY KEY,
  origem_id       TEXT NOT NULL UNIQUE,
  loja            TEXT NOT NULL,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  categoria       TEXT NOT NULL DEFAULT 'outros',
  imagem_url      TEXT,
  link_afiliado   TEXT NOT NULL,
  preco           REAL,
  preco_original  REAL,
  avaliacao       REAL,
  num_avaliacoes  INTEGER,
  selo            TEXT,
  pontuacao       REAL NOT NULL DEFAULT 0,
  ativo           INTEGER NOT NULL DEFAULT 1,
  expira_em       TEXT,
  impressoes      INTEGER NOT NULL DEFAULT 0,
  cliques         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS anuncios_vitrine_idx ON anuncios(ativo, categoria, pontuacao DESC);
