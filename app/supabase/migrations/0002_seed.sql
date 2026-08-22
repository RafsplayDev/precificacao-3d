-- =====================================================================
-- Dados iniciais — exatamente os que estão na planilha
-- Rode depois de 0001_schema.sql
-- =====================================================================

insert into public.impressoras
  (nome, marca, tempo_retorno_meses, valor_maquina, hrs_dia, dias_mes, potencia_kw, nivel_uso, percent_falhas)
values
  ('BambuLab A1', 'BambuLab', 10, 5500, 20, 25, 0.5, 'Profissional', 0.05),
  ('Creality Hi',  'Creality', 10, 3000, 15, 25, 0.4, 'Medio',        0.07),
  ('P2S',          'BambuLab', 10, 8500, 10, 25, 0.5, 'Intenso',      0.07)
on conflict (nome) do nothing;

insert into public.filamentos
  (nome, marca, descricao, peso_carretel_kg, comprimento_carretel_m, custo_brl)
values
  ('PLA ESUN',           'ESUN',         'ESUN',           1, 335, 170),
  ('PLA 3DX NATURAL',    '3DX NATURAL',  '3DX NATURAL',    1, 335, 150),
  ('PLA 3DLAB',          '3D LAB',       'PLA 3D LAB',     1, 335,  90),
  ('PLA Macarrom Verde', '3DFILA',       'PLA verde fosco',1, 335, 110),
  ('PLA VOOLT MATTE',    'VOOLT',        'BLUE 1',         1, 335, 120)
on conflict (nome) do nothing;

insert into public.marketplaces (nome, preco_fixo, taxa_percent)
values
  ('NENHUM',                   0,    0),
  ('Shopee - Frete Gratis',    0,    0.14),
  ('Shopee - Standard',        4,    0.16),
  ('Mercado Livre',            6.25, 0.115),
  ('INFINITY PAY CREDITO 3X',  0,    0.1249)
on conflict (nome) do nothing;

insert into public.bens_depreciacao (bem, valor_aquisicao, vida_util_meses, taxa_anual)
select * from (values
  ('Máquinas e Equipamentos', 12000::numeric, 24::numeric, 0.10::numeric),
  ('Veículo',                 80000,          60,          0.20),
  ('Móveis',                   7000,         120,          0.10),
  ('Computadores',            10000,          60,          0.20)
) as v(bem, valor_aquisicao, vida_util_meses, taxa_anual)
where not exists (select 1 from public.bens_depreciacao);

-- Produto A — o exemplo da planilha
insert into public.produtos
  (nome, descricao, hrs_trabalhadas, custo_hora, markup_atacado, markup_varejo,
   preco_final_atacado, preco_final_varejo, usar_preco, marketplace_id, impostos_percent,
   qtd_atacado, desconto_atacado, ajuste_custo_atacado,
   qtd_varejo,  desconto_varejo,  ajuste_custo_varejo)
select 'Produto A', 'Exemplo importado da planilha', 1, 0.5, 1.5, 2.0,
       37.5, 130, 'Sugerido', m.id, 0,
       100, 0.07, 10,
       100, 0.05, 2
from public.marketplaces m where m.nome = 'Shopee - Standard'
on conflict (nome) do nothing;

insert into public.pecas
  (produto_id, numero, nome, impressora_id, filamento_id,
   comprimento_m, tempo_impressao_horas, peso_gr, tarifa_kwh, percent_acabamento)
select p.id, 1, 'CORPO', i.id, f.id, 31, (9600.0/3600.0), 100, 0.95, 0.05
from public.produtos p, public.impressoras i, public.filamentos f
where p.nome = 'Produto A' and i.nome = 'BambuLab A1' and f.nome = 'PLA 3DX NATURAL'
  and not exists (select 1 from public.pecas x where x.produto_id = p.id);

-- Porta Joias — o produto da aba "Produtos & Concorrentes"
insert into public.produtos
  (nome, descricao, hrs_trabalhadas, custo_hora, markup_atacado, markup_varejo,
   preco_final_atacado, preco_final_varejo, usar_preco, impostos_percent)
values ('Porta Joias', 'Verde Matcha', 1, 0.5, 1.5, 2.0, 39.90, 59.90, 'Final', 0)
on conflict (nome) do nothing;

insert into public.concorrentes (produto_id, nome, link, preco)
select p.id, v.nome, v.link, v.preco
from public.produtos p,
     (values ('Concorrente 1', 'Link ou Descrição', 49.90::numeric),
             ('Concorrente 2', 'Link ou Descrição', 38.50),
             ('Concorrente 3', 'Link ou Descrição', 64.20)
     ) as v(nome, link, preco)
where p.nome = 'Porta Joias'
  and not exists (select 1 from public.concorrentes c where c.produto_id = p.id);

-- Conferência rápida: custos_totais do Produto A deve dar 24.36248313
-- select nome, custos_totais from public.vw_produtos_custos;
