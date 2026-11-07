-- =====================================================================
-- Anúncios: só Shopee e Mercado Livre, cupons e link pendente
--
-- • `loja` passa a ser um código fixo ('shopee' | 'mercado-livre').
-- • `url_produto`: o link comum do produto. Na Shopee o servidor o
--   converte em link de afiliado sozinho (Open API); no Mercado Livre,
--   que não tem API de afiliados, o produto fica aguardando você colar
--   o link no /admin.
-- • `link_afiliado` deixa de ser obrigatório: sem ele o anúncio fica
--   guardado, mas não aparece na vitrine.
-- • `cupom_*`: cupom de desconto exibido junto do produto.
--
-- O SQLite não remove NOT NULL com ALTER, então a tabela é recriada.
-- =====================================================================

CREATE TABLE anuncios_novo (
  id              TEXT PRIMARY KEY,
  origem_id       TEXT NOT NULL UNIQUE,
  loja            TEXT NOT NULL CHECK (loja IN ('shopee','mercado-livre')),
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  categoria       TEXT NOT NULL DEFAULT 'outros',
  imagem_url      TEXT,
  url_produto     TEXT,
  link_afiliado   TEXT,
  preco           REAL,
  preco_original  REAL,
  avaliacao       REAL,
  num_avaliacoes  INTEGER,
  vendas          INTEGER,
  comissao_pct    REAL,
  selo            TEXT,
  cupom_codigo    TEXT,
  cupom_descricao TEXT,
  cupom_validade  TEXT,
  pontuacao       REAL NOT NULL DEFAULT 0,
  ativo           INTEGER NOT NULL DEFAULT 1,
  expira_em       TEXT,
  impressoes      INTEGER NOT NULL DEFAULT 0,
  cliques         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Só o que é de uma das duas lojas sobrevive à troca.
INSERT INTO anuncios_novo (id, origem_id, loja, titulo, descricao, categoria, imagem_url,
  link_afiliado, preco, preco_original, avaliacao, num_avaliacoes, selo, pontuacao, ativo,
  expira_em, impressoes, cliques, created_at, atualizado_em)
SELECT id, origem_id,
       CASE WHEN lower(loja) LIKE '%shopee%' THEN 'shopee' ELSE 'mercado-livre' END,
       titulo, descricao, categoria, imagem_url, link_afiliado, preco, preco_original,
       avaliacao, num_avaliacoes, selo, pontuacao, ativo, expira_em, impressoes, cliques,
       created_at, atualizado_em
  FROM anuncios
 WHERE lower(loja) LIKE '%shopee%' OR lower(loja) LIKE '%mercado%';

DROP TABLE anuncios;
ALTER TABLE anuncios_novo RENAME TO anuncios;
CREATE INDEX IF NOT EXISTS anuncios_vitrine_idx ON anuncios(ativo, categoria, pontuacao DESC);
CREATE INDEX IF NOT EXISTS anuncios_loja_idx ON anuncios(loja, ativo);
