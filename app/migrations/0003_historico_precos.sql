-- =====================================================================
-- Histórico de preços dos anúncios — a base das medalhas
--
-- Um preço por produto por dia (o último do dia vale). Toda vez que a
-- tarefa manda um produto com preço, o dia de hoje é registrado. Com o
-- tempo, isso diz qual é o preço "normal" de cada produto, e a medalha
-- compara o preço de agora com ele — sem depender do "de R$ X" que a
-- loja anuncia, que muitas vezes é inflado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS precos_historico (
  origem_id  TEXT NOT NULL,
  dia        TEXT NOT NULL,          -- AAAA-MM-DD (UTC)
  preco      REAL NOT NULL,
  PRIMARY KEY (origem_id, dia)
);

-- Os anúncios que já existem entram com o preço de hoje: o aquecimento
-- começa a contar agora.
INSERT OR IGNORE INTO precos_historico (origem_id, dia, preco)
SELECT origem_id, date('now'), preco FROM anuncios WHERE preco IS NOT NULL;

-- Chamada da oferta: uma frase curta e com bom humor, escrita pela tarefa
-- ("PRA VC APARECER MAIS BONITO NAS REUNIÕES"), e a condição do preço
-- ("no Pix", "à vista"), como nos grupos de promoção.
ALTER TABLE anuncios ADD COLUMN chamada TEXT;
ALTER TABLE anuncios ADD COLUMN condicao_preco TEXT;
-- Uma vantagem extra que não é cupom ("📦 De 1 a 3 unidades com 20% OFF").
ALTER TABLE anuncios ADD COLUMN observacao TEXT;
