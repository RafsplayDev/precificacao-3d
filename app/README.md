# Precificação 3D — Drop Color

Aplicação web que substitui a planilha *Calculadora da Fórmula da Precificação 3D — FDM V2.5*.
Next.js 15 (App Router) rodando no **Cloudflare Workers** (via OpenNext), banco **Cloudflare D1**,
login com **Google** e o **Drop Color Design System** aplicado sem alteração.

O app é **gratuito**. A renda vem da vitrine de produtos do ramo 3D com links de afiliado
(veja [`docs/ANUNCIOS.md`](docs/ANUNCIOS.md)). Não há plano pago, lista de espera nem
cobrança. Toda conta nova começa pelo tutorial guiado (`/tutorial`), que também pode ser
reaberto pela gaveta da conta.

- Colocar no ar: [`docs/MIGRACAO_CLOUDFLARE.md`](docs/MIGRACAO_CLOUDFLARE.md)
- Abastecer a vitrine automaticamente: [`docs/ANUNCIOS.md`](docs/ANUNCIOS.md)

## Rodar localmente

```bash
npm install
cp .dev.vars.example .dev.vars      # preencha GOOGLE_CLIENT_ID/SECRET e ANUNCIOS_TOKEN
npm run db:migrar-local             # cria o D1 local em .wrangler/
npm run dev                         # http://localhost:3000
```

`npm run preview` roda o app já empacotado no runtime do Workers (o mais próximo da produção).

## Estrutura

```
migrations/             ← schema do D1 (wrangler d1 migrations apply)
src/
  design-system/        ← bundle Drop Color, isolado e sem edição
  lib/
    calc.js             as fórmulas da planilha em JS (validadas dígito a dígito)
    tutorial.js         o roteiro do tutorial guiado
    useDados.js         leitura/escrita via /api/dados
    format.js           R$, %, número no padrão pt-BR
    servidor/           código que só roda no Worker
      cf.js             acesso ao env do Worker (D1, segredos)
      sessao.js         sessões em cookie httpOnly, guardadas (com hash) no D1
      google.js         login com Google (OAuth 2.0 + PKCE)
      tabelas.js        lista branca de tabelas/colunas (substitui o RLS)
      anuncios.js       validação e regras da vitrine de afiliados
  components/
    AppShell.jsx        header, navegação, toasts e vitrine no rodapé
    Vitrine.jsx         os anúncios de afiliado
    Tutorial.jsx        o tutorial guiado (recorte de luz + cartão)
    TabelaEditavel.jsx  tabela que grava célula a célula
  app/
    page.jsx            calculadora
    produtos/           peças e custos adicionais
    cadastros/          impressoras, filamentos, marketplaces, depreciação
    concorrentes/       seu preço contra o mercado
    entrar/             login com Google
    tutorial/           liga o tutorial e leva ao primeiro passo
    admin/              desempenho dos anúncios (só ADMIN_EMAILS)
    api/dados/          CRUD do usuário logado
    api/auth/           google, callback, sair, eu
    api/anuncios/       vitrine (GET), carga da tarefa (POST), clique (/:id/ir)
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

As contas rodam em `src/lib/calc.js`, para o simulador responder enquanto você digita.
As colunas derivadas dos cadastros (custo por grama, desgaste, R$/hora…) são colunas
geradas do próprio D1.

### Uma observação sobre a fórmula original

O *custo de depreciação* da planilha divide horas por reais (`uso estimado anual ÷ depreciação
mensal`), o que não fecha dimensionalmente — o resultado não é R$, apesar de entrar na soma
como se fosse. Mantive idêntico para o número bater com o que você já usa. Se um dia quiser
corrigir, o ajuste é na função `custosPeca`.

---

## Tabelas (D1)

| Tabela | Origem na planilha |
|---|---|
| `impressoras` | Listas · Tabela_impressoras |
| `filamentos` | Listas · Tabela_filamentos |
| `marketplaces` | Listas · Tabela_mktplace |
| `insumos`, `maos_obra` | custos adicionais e mão de obra por tipo |
| `bens_depreciacao` | Listas · bloco de depreciação fiscal |
| `produtos`, `pecas`, `custos_adicionais`, `produto_trabalhos`, `faixas_atacado` | aba Produto |
| `concorrentes` | aba Produtos & Concorrentes |
| `configuracoes` | tarifa de energia e markups padrão (uma linha por conta) |
| `gastos`, `vendas` | tela de Gestão (oculta no MVP) |
| `usuarios`, `sessoes` | contas Google e sessões |
| `anuncios` | vitrine de afiliados |

Toda linha de dado tem `user_id`; a API só lê e grava as linhas da sessão atual.
