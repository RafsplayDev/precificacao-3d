-- =====================================================================
-- Verificação periódica dos anúncios
--
-- A tarefa automática roda várias vezes por dia e confere cada produto:
-- se ainda está à venda, quanto tem em estoque, o preço de agora e se o
-- cupom continua valendo, deixando uma observação do que viu. Produto sem
-- verificação recente sai da vitrine sozinho (ver VALIDADE_HORAS em
-- src/lib/servidor/anuncios.js): é o que impede o catálogo de mostrar
-- oferta que já acabou.
-- =====================================================================

ALTER TABLE anuncios ADD COLUMN verificado_em TEXT;
ALTER TABLE anuncios ADD COLUMN estoque INTEGER;
ALTER TABLE anuncios ADD COLUMN ultima_observacao TEXT;
-- Quando a verificação viu o produto esgotado. O catálogo mostra, no fim,
-- o que esgotou nas últimas 24 h (em cinza, sem link).
ALTER TABLE anuncios ADD COLUMN esgotado_em TEXT;

-- O que já existe conta como verificado na última atualização.
UPDATE anuncios SET verificado_em = atualizado_em WHERE verificado_em IS NULL;

CREATE TABLE IF NOT EXISTS verificacoes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  origem_id   TEXT NOT NULL,
  em          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  disponivel  INTEGER,
  estoque     INTEGER,
  preco       REAL,
  cupom_ok    INTEGER,
  observacao  TEXT
);
CREATE INDEX IF NOT EXISTS verificacoes_origem_idx ON verificacoes(origem_id, em DESC);
CREATE INDEX IF NOT EXISTS anuncios_verificado_idx ON anuncios(verificado_em);
