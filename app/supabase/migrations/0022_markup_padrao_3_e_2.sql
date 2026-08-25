-- =====================================================================
-- Markup padrão passa a 3,0 no varejo e 2,0 no atacado
--
-- O que muda de verdade é o ponto de partida: quem chega hoje, e quem
-- cria produto ou faixa nova, começa em 3 e 2 em vez de 2 e 1,5. Markup
-- que já foi escolhido é escolha da pessoa e não se toca — o bloco que
-- reescreve linha existente está separado no fim, comentado, para ser
-- rodado só se você quiser mesmo mexer no que já está lá.
-- =====================================================================

-- 1. O padrão do negócio (vale para produto novo).
alter table public.configuracoes
  alter column markup_varejo_padrao  set default 3.0,
  alter column markup_atacado_padrao set default 2.0;

-- 2. O padrão da própria linha de produto, para quando o insert não
--    manda markup nenhum.
alter table public.produtos
  alter column markup_varejo  set default 3.0,
  alter column markup_atacado set default 2.0;

-- 3. Faixa de atacado nova nasce no mesmo lugar que o atacado padrão.
alter table public.faixas_atacado
  alter column markup set default 2.0;


-- ---------------------------------------------------------------------
-- OPCIONAL — só rode se quiser puxar para 3 e 2 quem nunca mexeu no
-- markup. A conta é: "está exatamente no valor antigo de fábrica, então
-- provavelmente ninguém escolheu isso". É um chute razoável, mas é um
-- chute: quem deliberadamente deixou 2,0 no varejo vai ver o preço subir
-- sem ter pedido. Se tiver dúvida, não rode — o item 1 já resolve para
-- todo mundo que chegar de agora em diante.
-- ---------------------------------------------------------------------
-- update public.configuracoes
--    set markup_varejo_padrao = 3.0
--  where markup_varejo_padrao = 2.0;
--
-- update public.configuracoes
--    set markup_atacado_padrao = 2.0
--  where markup_atacado_padrao = 1.5;
