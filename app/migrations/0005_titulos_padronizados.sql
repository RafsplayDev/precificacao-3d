-- =====================================================================
-- Títulos padronizados
--
-- A tarefa manda o título que o vendedor escreveu (titulo_original) e os
-- atributos que identificou no anúncio (material, marca, cor, peso…). O
-- site monta o título exibido a partir dos atributos, com um modelo fixo
-- por categoria — e só usa esse título se os atributos principais
-- aparecerem mesmo no título original (src/lib/servidor/titulos.js).
-- =====================================================================
ALTER TABLE anuncios ADD COLUMN titulo_original TEXT;
ALTER TABLE anuncios ADD COLUMN atributos TEXT;  -- JSON
