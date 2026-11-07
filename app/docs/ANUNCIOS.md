# Vitrine de afiliados — Shopee e Mercado Livre

O Precifica mostra uma vitrine de produtos do ramo 3D com seus links de afiliado,
no rodapé das telas do app e na tela de login. Só **Shopee** e **Mercado Livre** são
aceitos. Cada produto pode ter um **cupom**, exibido junto e copiado com um toque.

A tarefa automática só manda os dados de cada produto. O app valida, gera o link de
afiliado quando dá, grava, sorteia, conta impressões e cliques.

## Como o link de afiliado é obtido

| Loja | Automático? | Como |
|---|---|---|
| **Shopee** | **Sim** | Pela Open API do Shopee Afiliados. A tarefa pode buscar produtos já com o link de afiliado (`POST /api/anuncios/shopee`) ou mandar só o `url_produto`, que o servidor converte. Precisa dos segredos `SHOPEE_APP_ID` e `SHOPEE_APP_SECRET`. |
| **Mercado Livre** | **Não** | O programa de afiliados do Mercado Livre não tem API pública. A tarefa manda o `url_produto`, o produto fica **aguardando link** e você cola o link gerado na barra de afiliados (ou no Gerador de links) em `/admin`. Leva segundos por produto. Depois de colado, o link é preservado mesmo quando a tarefa reenvia o produto. |

Ferramentas de terceiros que geram links do Mercado Livre usando a sessão/cookies da
sua conta existem, mas não são oficiais e podem violar os termos do programa — por
isso não foram usadas.

### Ativar a Open API da Shopee

1. Em https://affiliate.shopee.com.br, entre na sua conta de afiliado e procure a área
   **Open API** (em geral no menu da conta). Peça o acesso, se ainda não tiver.
2. Copie o **AppId** e o **Secret**.
3. Cadastre no Worker (no Windows, use `echo VALOR| npx wrangler secret put NOME`):
   ```bash
   npx wrangler secret put SHOPEE_APP_ID
   npx wrangler secret put SHOPEE_APP_SECRET
   ```

## Buscar produtos da Shopee (pelo site)

```
POST https://precifica.dropcolor.com.br/api/anuncios/shopee
Authorization: Bearer <ANUNCIOS_TOKEN>
{ "termo": "filamento pla", "ordem": 2, "pagina": 1, "limite": 20 }
```

`ordem`: 1 relevância · 2 mais vendidos · 3 maior preço · 4 menor preço · 5 maior comissão.
Cada produto volta pronto para o `POST /api/anuncios`, com `link_afiliado`, `preco`,
`comissao_pct`, `vendas`, `avaliacao` e `desconto_pct`.

## Gravar produtos

```
POST https://precifica.dropcolor.com.br/api/anuncios
Authorization: Bearer <ANUNCIOS_TOKEN>
Content-Type: application/json
```

```json
{
  "desativar_ausentes": false,
  "produtos": [
    {
      "origem_id": "shopee:22912345678",
      "loja": "shopee",
      "titulo": "Filamento PLA Silk 1kg 1,75mm — Arco-íris",
      "categoria": "filamentos",
      "imagem_url": "https://down-br.img.susercontent.com/....jpg",
      "url_produto": "https://shopee.com.br/produto-i.123.456",
      "link_afiliado": "https://s.shopee.com.br/xxxxx",
      "preco": 89.9,
      "preco_original": 119.9,
      "avaliacao": 4.8,
      "num_avaliacoes": 1520,
      "vendas": 8000,
      "comissao_pct": 8,
      "selo": "-25%",
      "cupom_codigo": "FILAMENTO10",
      "cupom_descricao": "10% off em compras acima de R$ 80",
      "cupom_validade": "2026-11-30T23:59:59-03:00",
      "pontuacao": 8.5
    },
    {
      "origem_id": "mercadolivre:MLB3456789012",
      "loja": "mercado-livre",
      "titulo": "Secador de filamento com controle de umidade",
      "categoria": "secadores-armazenamento",
      "url_produto": "https://produto.mercadolivre.com.br/MLB-3456789012-...",
      "preco": 199
    }
  ]
}
```

| Campo | Obrigatório | Regra |
|---|---|---|
| `origem_id` | sim | Chave estável do produto (ex.: `shopee:<itemId>`, `mercadolivre:MLB…`). Reenviar o mesmo id **atualiza**, não duplica. |
| `loja` | sim | `shopee` ou `mercado-livre`. Qualquer outra é recusada. |
| `titulo` | um dos dois* | Até 160 caracteres. *Obrigatório `titulo` ou `titulo_original`. Com `atributos`, o site monta o título sozinho. |
| `link_afiliado` / `url_produto` | um dos dois | `https://` e do domínio da própria loja (Shopee: `shopee.com.br`, `s.shopee.com.br`, `shp.ee`; Mercado Livre: `mercadolivre.com.br`, `meli.la`). Link de outro site é recusado. |
| `titulo_original` | recomendado | O título **exatamente** como o vendedor escreveu. É com ele que o site confere os atributos. |
| `atributos` | recomendado | O que a tarefa identificou no anúncio (ver abaixo). Com eles, o site monta o título padronizado. |
| `categoria` | não | `filamentos`, `impressoras`, `pecas-reposicao`, `bicos-hotend`, `mesas-superficies`, `ferramentas`, `acabamento`, `resinas`, `secadores-armazenamento`, `eletronica`, `upgrades`, `outros`. |
| `imagem_url` | não | `https://`. |
| `preco`, `preco_original` | não | Reais. Com `preco_original` maior, o antigo aparece riscado. |
| `avaliacao`, `num_avaliacoes`, `vendas`, `comissao_pct` | não | Usados no painel e para a tarefa decidir; só nota e avaliações aparecem na vitrine. |
| `chamada` | não | Frase curta (até 70 caracteres), direta e com bom humor, como nos grupos de promoção: "Bico entupiu? Troca e segue o baile". **Sem emoji** (o site remove). Aparece em caixa alta acima do produto. |
| `condicao_preco` | não | Condição do preço, até 20 caracteres: "no Pix", "cada", "o kit". |
| `observacao` | não | Uma vantagem extra que não é cupom, até 70 caracteres: "De 1 a 3 unidades com 20% OFF". Sem emoji. |
| `selo` | não | Etiqueta curta, ex.: `-25%`, `Frete grátis`. |
| `cupom_codigo` | não | Código do cupom (até 40 caracteres, vira maiúsculo). |
| `cupom_descricao` | não | O que o cupom dá, ex.: `R$ 20 off acima de R$ 150`. |
| `cupom_validade` | não | Data ISO. Vencido, o cupom some sozinho (o produto continua). |
| `pontuacao` | não | 0 a 10. Pesa no sorteio da vitrine. |
| `ativo` | não | `false` tira da vitrine sem apagar. |
| `expira_em` | não | Data ISO. Depois dela o anúncio inteiro some (bom para ofertas relâmpago). |

- Até 200 produtos por chamada.
- Numa atualização só mudam os campos enviados.
- `desativar_ausentes: true` desativa todo anúncio ativo que **não** veio no lote.
- Resposta: `{ "gravados": 12, "desativados": 3, "pendentes_link": [...], "erros": [...] }`.
  `pendentes_link` lista os que estão sem link de afiliado (os do Mercado Livre até você
  colar o link no `/admin`).

## Ler o desempenho

```
GET https://precifica.dropcolor.com.br/api/anuncios?todos=1
Authorization: Bearer <ANUNCIOS_TOKEN>
```

Devolve todos os anúncios com `impressoes`, `cliques`, `ativo`, `link_afiliado`,
`cupom_*`, e `shopee_api` (se a Open API está configurada). CTR = cliques ÷ impressões.

`PATCH /api/anuncios/<id>` com `{ "ativo": false }`, `{ "pontuacao": 3 }` ou
`{ "cupom_codigo": null }` ajusta um anúncio; `DELETE /api/anuncios/<id>` remove.

## Títulos padronizados

O título exibido não é o do vendedor: o site monta um título no mesmo formato para todo
produto do mesmo tipo, a partir dos `atributos` que a tarefa manda. A imagem continua sendo
a capa do anúncio real (`imagem_url`).

| Categoria | Atributos | Título montado |
|---|---|---|
| `filamentos` | `material`*, `marca`*, `cor`, `acabamento` (silk, fosco, velvet), `peso_kg`, `diametro_mm` | Filamento PETG Masterprint Branco · 1 kg · 1,75 mm |
| `bicos-hotend` | `diametro_mm`*, `quantidade`, `material`, `marca`, `padrao` (mk8, v6, volcano), `compatibilidade` | Kit 10 Bicos de Latão 0,4 mm · MK8 · Ender 3, CR-10 |
| `mesas-superficies` | `tipo`* (PEI, vidro…), `acabamento`, `marca`, `tamanho_mm` ("235x235"), `magnetica`, `dupla_face` | Mesa PEI Texturizada 235 × 235 mm · Magnética · Dupla face |
| `secadores-armazenamento` | `marca`, `modelo` | Secador de Filamento Sunlu S2 |
| `impressoras` | `marca`*, `modelo`* | Impressora 3D Bambu Lab A1 |

\* mínimos para padronizar. Outras categorias usam o `titulo` enviado.

**Trava contra erro:** marca, material, cor, acabamento e modelo precisam aparecer no
`titulo_original` (o site entende sinônimos: "white" = branco, "PLA Plus" = PLA+,
"Voolt3D" = Voolt, "seda" = silk). Se algum não aparecer, o site mantém o título original
e devolve um aviso em `avisos` — sinal de que a tarefa identificou algo errado.

## Medalhas (ouro, prata e bronze)

Calculadas pelo site, **nunca pela tarefa**, só com o histórico próprio de preços:
cada vez que a tarefa envia um produto com `preco`, o preço do dia é guardado em
`precos_historico` (um por dia).

- **Aquecimento:** o produto só concorre depois de 14 dias desde o primeiro registro e
  com preço visto em pelo menos 4 dias diferentes. Antes disso, `medalha.aquecendo`
  diz quantos dias faltam.
- **Referência:** menor preço e média dos 30 dias anteriores a hoje.
- **Ouro:** no menor preço já visto e 15% ou mais abaixo da média.
- **Prata:** 10% ou mais abaixo da média. **Bronze:** 5% ou mais.
- Nota abaixo de 4 não ganha medalha.

As regras ficam em `src/lib/servidor/medalhas.js` (`REGRAS`). Para a medalha funcionar,
a tarefa precisa **reenviar o preço atual dos produtos ativos em toda rodada**, mesmo dos
que não mudaram.

## Como a vitrine escolhe

Entram só anúncios ativos, com link de afiliado e não vencidos. O peso de cada um é:

```
(pontuacao + 1) × (1 + 20 × (cliques + 1) / (impressoes + 100)) × acaso(0,35–1,35)
```

O clique passa por `/api/anuncios/<id>/ir`, que conta e redireciona para o link de
afiliado. O selo "Patrocinado" e o `rel="sponsored"` identificam a publicidade.

## Prompt sugerido para a tarefa agendada do Claude

> Você abastece a vitrine de afiliados do Precifica 3D, uma calculadora de preço para quem
> vende impressão 3D FDM no Brasil. Site: https://precifica.dropcolor.com.br. Token:
> `{ANUNCIOS_TOKEN}`, sempre no cabeçalho `Authorization: Bearer`. Só Shopee e Mercado Livre.
>
> 1. **Leia o estado atual:** `GET /api/anuncios?todos=1`. Anote CTR, o que está sem link
>    (`link_afiliado` nulo) e cupons vencidos.
> 2. **Shopee:** busque com `POST /api/anuncios/shopee` (`ordem` 2 e 5) os termos: filamento
>    PLA, PETG, TPU, bico hotend, mesa PEI, secador de filamento, espátula impressora 3D, kit
>    acabamento, cola mesa impressora 3D. Os resultados já trazem `link_afiliado`.
> 3. **Mercado Livre:** pesquise os mesmos termos em mercadolivre.com.br e pegue o link comum
>    do produto (`url_produto`). Prefira lojas oficiais e Mercado Líder. O link de afiliado eu
>    colo depois no /admin.
> 4. **Cupons:** procure cupons válidos aplicáveis a esses produtos (página de cupons da loja,
>    cupons da loja do vendedor, cupons de categoria). Só inclua cupom com código, regra e
>    validade confirmados; nunca invente código.
> 5. **Aprove só** o que passar em todos os critérios: vendido no Brasil, em estoque, nota
>    ≥ 4,5 com ≥ 100 avaliações (ou ≥ 500 vendas), vendedor confiável, preço competitivo.
>    Dê `pontuacao` de 0 a 10 (relevância para quem imprime em 3D × custo-benefício ×
>    desconto × comissão). Mantenha 20 a 40 produtos ativos, misturando as duas lojas e
>    as categorias, com no máximo 5 produtos do Mercado Livre novos por rodada (cada um
>    exige que eu cole o link à mão).
> 6. **Desative** (`ativo: false`) o que estiver sem estoque, mais caro, com nota menor ou
>    com CTR bem abaixo da média depois de 500 impressões. Remova cupons vencidos
>    (`cupom_codigo: null`).
> 7. **Título e imagem:** use a imagem de capa do anúncio (`imagem_url`). Mande o título do
>    vendedor em `titulo_original`, sem mudar nada, e os `atributos` do produto (material,
>    marca, cor, peso, diâmetro… ver a tabela de títulos padronizados). Só informe um
>    atributo se ele estiver no anúncio; na dúvida, deixe de fora. Se a resposta trouxer
>    `avisos`, revise o produto: algum atributo não bate com o anúncio.
> 8. **Chamada:** para cada produto, escreva uma `chamada` curta (até 70 caracteres),
>    direta e com bom humor, no estilo de grupo de promoções ("Peça soltando da mesa?
>    Acabou o drama"). **Nunca use emoji.** Preencha `condicao_preco` ("no Pix", "cada")
>    e `observacao` para vantagens que não são cupom ("De 1 a 3 unidades com 20% OFF").
>    Não invente medalha nem desconto: as medalhas o site calcula sozinho.
> 9. **Reenvie o preço atual de todos os produtos ativos**, mesmo os que não mudaram: é
>    isso que forma o histórico das medalhas.
> 10. **Envie** tudo num `POST /api/anuncios` com `origem_id` estável (`shopee:<itemId>`,
>    `mercadolivre:<MLB…>`). Ofertas relâmpago levam `expira_em`.
> 11. **Resuma:** gravados, desativados, erros, a lista `pendentes_link` (para eu gerar os
>    links do Mercado Livre) e o top 5 por CTR.

## Verificação periódica (a cada 3 horas)

Duas tarefas agendadas funcionam melhor que uma:

| Tarefa | Quando | O que faz |
|---|---|---|
| **Garimpo** (prompt acima) | 1 vez por dia, de manhã | Procura produtos novos, cupons e monta a vitrine |
| **Verificação** (prompt abaixo) | A cada 3 h, das 8h às 22h | Confere os produtos que já estão no ar |

Produto sem verificação há mais de **30 horas** sai da vitrine sozinho (`VALIDADE_HORAS`
em `src/lib/servidor/anuncios.js`), então a verificação precisa rodar pelo menos 1 vez por dia.

### Rotas

```
GET  /api/anuncios/verificar?limite=20      ← o lote a conferir (os mais antigos primeiro)
POST /api/anuncios/verificacoes             ← o resultado de cada um
GET  /api/anuncios/verificacoes?origem_id=… ← o histórico de verificações de um produto
```

```json
{ "verificacoes": [
  { "origem_id": "shopee:123", "disponivel": true, "estoque": 8, "preco": 84.9,
    "preco_original": 119.9, "cupom_valido": false,
    "observacao": "Estoque caiu de 30 para 8; cupom FILA10 expirou; preço igual." }
] }
```

- `disponivel: false` ou `estoque: 0` → sai da vitrine na hora e aparece em "Esgotaram nas
  últimas 24 horas".
- `cupom_valido: false` → o cupom some. Mandando `cupom_codigo` (+ descrição e validade), o
  cupom novo entra no lugar.
- `preco` → atualiza e entra no histórico das medalhas.
- `observacao` → aparece no `/admin` e fica no histórico.

### Prompt sugerido para a verificação

> Você confere os produtos da vitrine do Precifica 3D. Site: https://precifica.dropcolor.com.br.
> Token: `{ANUNCIOS_TOKEN}`, no cabeçalho `Authorization: Bearer`.
>
> 1. Pegue o lote: `GET /api/anuncios/verificar?limite=20`.
> 2. Para cada produto, abra o anúncio (`url_produto`, ou o `link_afiliado`) e confira:
>    - se ainda está à venda e a quantidade disponível (se a loja mostrar);
>    - o preço de agora e o preço "de" riscado;
>    - se o cupom salvo (`cupom_codigo`) ainda vale para esse produto; se achar um cupom
>      melhor, mande o novo (código, regra e validade confirmados — nunca invente).
> 3. Escreva uma `observacao` curta e objetiva do que mudou desde a última verificação
>    (`ultima_observacao`). Ex.: "Estoque caiu de 30 para 8; preço subiu R$ 5; cupom ok."
>    Se nada mudou: "Sem mudanças."
> 4. Na dúvida sobre disponibilidade (página não abriu, erro da loja), não marque como
>    indisponível: deixe `disponivel` de fora e diga na observação.
> 5. Envie tudo num `POST /api/anuncios/verificacoes`.
> 6. Resuma: quantos conferidos, quantos esgotaram, cupons que caíram e mudanças de preço
>    acima de 10%.
