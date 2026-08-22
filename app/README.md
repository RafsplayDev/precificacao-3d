# Precificação 3D — Drop Color

Aplicação web que substitui a planilha *Calculadora da Fórmula da Precificação 3D — FDM V2.5*.
Next.js 14 (App Router) + Supabase, com o **Drop Color Design System** aplicado sem alteração.

---

## 1. Rodar o banco

O projeto Supabase informado (`agzqfgkmkuvxxjximyxf`) não está na conta ligada ao meu conector,
então as tabelas não foram criadas por mim — os arquivos abaixo fazem isso em dois cliques.

No painel do Supabase → **SQL Editor** → cole e rode, nesta ordem:

1. `supabase/migrations/0001_schema.sql` — tabelas, colunas calculadas, views e RLS
2. `supabase/migrations/0002_seed.sql` — impressoras, filamentos, marketplaces, bens e o Produto A

Conferência: `select nome, custos_totais from public.vw_produtos_custos;`
deve devolver **24.36248313** para o Produto A — o mesmo número da célula `C10` da planilha.

> **RLS:** as políticas liberam leitura e escrita para a chave publishable (`anon`).
> Serve para uso interno. Se o painel for para a internet aberta, troque por políticas
> com `auth.uid()` e ponha login na frente.

## 2. Rodar o app

```bash
npm install
npm run dev
```

As chaves já estão em `.env.local`.

---

## Estrutura

```
src/
  design-system/        ← bundle Drop Color, isolado e sem edição
    tokens/*.css        cores, tipografia, espaço, raio, sombra, motion
    components/         Button, Card, Input, Select, Tabs, Badge, Toast…
    styles.css          entrada única que importa todos os tokens
    index.js            barrel "use client" — a única coisa que adicionei
  lib/
    calc.js             as fórmulas da planilha em JS (validadas dígito a dígito)
    useDados.js         leitura/escrita no Supabase
    format.js           R$, %, número no padrão pt-BR
    supabaseClient.js
  components/
    AppShell.jsx        header, navegação, toasts
    TabelaEditavel.jsx  tabela que grava célula a célula
  app/
    page.jsx            calculadora
    produtos/           peças e custos adicionais
    cadastros/          impressoras, filamentos, marketplaces, depreciação
    concorrentes/       seu preço contra o mercado
supabase/migrations/    o SQL
```

O design system fica intocado: nenhum arquivo dentro de `src/design-system/` foi editado.
Todo CSS do app usa prefixo `.ap-` e só consome tokens (`var(--ink-950)`, `var(--space-6)`…),
sem redefinir nenhum.

---

## O modelo de custo

Sete linhas de custo por peça, exatamente como nas colunas AC:AI da aba *Listas*:

| Linha | Fórmula |
|---|---|
| Custo material | custo do carretel ÷ (peso do carretel em g) × peso da peça |
| Custo energia | horas × potência (kW) × tarifa kWh |
| Custo manutenção | (valor da máquina × desgaste ÷ horas/ano) × horas |
| Custo de falhas | custo material × % falhas da impressora |
| Custo de acabamento | custo material × % acabamento |
| Retorno do investimento | (valor da máquina ÷ uso estimado) × horas |
| Custo de depreciação | uso estimado anual ÷ depreciação fiscal mensal total |

Desgaste por nível de uso: básico 10%, médio 20%, profissional 30%, intenso 45%.

**Custos totais** = produção + (horas trabalhadas × custo/hora) + custos adicionais
**Preço sugerido** = custos totais × markup
**Preço no marketplace** = (preço base + taxa fixa) ÷ (1 − comissão)

As mesmas contas existem em dois lugares, de propósito: nas views do Postgres
(`vw_pecas_custos`, `vw_produtos_custos`, `vw_produtos_precos`), para quem consultar o banco
direto, e em `src/lib/calc.js`, para o simulador responder enquanto você digita.

### Uma observação sobre a fórmula original

O *custo de depreciação* da planilha divide horas por reais (`uso estimado anual ÷ depreciação
mensal`), o que não fecha dimensionalmente — o resultado não é R$, apesar de entrar na soma
como se fosse. Mantive idêntico para o número bater com o que você já usa. Se um dia quiser
corrigir, o ajuste é só na view `vw_pecas_custos` e na função `custosPeca`.

---

## Tabelas

| Tabela | Origem na planilha |
|---|---|
| `impressoras` | Listas · Tabela_impressoras |
| `filamentos` | Listas · Tabela_filamentos |
| `marketplaces` | Listas · Tabela_mktplace |
| `bens_depreciacao` | Listas · bloco de depreciação fiscal (intervalo `Depreciação`) |
| `produtos` | aba Produto · markup, hora, preço final, simulador |
| `pecas` | Listas · Tabela_produtos (uma linha por peça) |
| `custos_adicionais` | aba Produto · B25:C34 |
| `concorrentes` | aba Produtos & Concorrentes |

`impressoras`, `filamentos` e `bens_depreciacao` têm colunas `GENERATED ALWAYS` — desgaste,
uso estimado, R$/hora, R$/grama e depreciação mensal saem prontas do banco.
