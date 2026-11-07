-- O preço final com o cupom aplicado: o terceiro preço do card
-- (riscado, atual e com cupom). A tarefa calcula a partir da regra do
-- cupom (porcentagem, valor fixo, valor mínimo) e manda junto.
ALTER TABLE anuncios ADD COLUMN preco_cupom REAL;
