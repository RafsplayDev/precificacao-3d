# Vitrine de afiliados — como abastecer automaticamente

O Precifica mostra uma vitrine de produtos do ramo 3D (filamentos, bicos, mesas,
secadores…) com seus links de afiliado: no rodapé de cada tela do app e na tela de
login. A vitrine é a estrutura pronta: a tarefa automática só envia os dados de
cada produto aprovado, e o app valida, grava, sorteia, conta impressões e cliques.

## Endpoint de carga

```
POST https://SEU-DOMINIO/api/anuncios
Authorization: Bearer <ANUNCIOS_TOKEN>
Content-Type: application/json
```

```json
{
  "desativar_ausentes": false,
  "produtos": [
    {
      "origem_id": "mercadolivre:MLB123456789",
      "loja": "Mercado Livre",
      "titulo": "Filamento PLA Silk 1kg 1,75mm — Arco-íris",
      "descricao": "Brilho acetinado, boa adesão na mesa.",
      "categoria": "filamentos",
      "imagem_url": "https://http2.mlstatic.com/....jpg",
      "link_afiliado": "https://mercadolivre.com/sec/xxxxx",
      "preco": 119.9,
      "preco_original": 149.9,
      "avaliacao": 4.8,
      "num_avaliacoes": 1520,
      "selo": "-20%",
      "pontuacao": 8.5,
      "expira_em": "2026-12-31T23:59:59Z"
    }
  ]
}
```

| Campo | Obrigatório | Regra |
|---|---|---|
| `origem_id` | sim | Chave estável do produto na loja (ex.: `amazon:B0ABC123`). Reenviar o mesmo id **atualiza**, não duplica. |
| `loja` | sim | Nome exibido (Amazon, Mercado Livre, Shopee, AliExpress…). |
| `titulo` | sim | Até 160 caracteres. |
| `link_afiliado` | sim | URL `https://` com sua tag de afiliado. |
| `categoria` | não | Uma de: `filamentos`, `impressoras`, `pecas-reposicao`, `bicos-hotend`, `mesas-superficies`, `ferramentas`, `acabamento`, `resinas`, `secadores-armazenamento`, `eletronica`, `upgrades`, `outros`. Outro valor vira `outros`. |
| `imagem_url` | não | `https://`. Sem imagem aparece um marcador "3D". |
| `preco`, `preco_original` | não | Número em reais. Com `preco_original` maior, o preço antigo aparece riscado. |
| `avaliacao`, `num_avaliacoes` | não | Nota de 0 a 5 e quantidade de avaliações. |
| `selo` | não | Etiqueta curta (até 30 caracteres), ex.: `-20%`, `Mais vendido`. |
| `pontuacao` | não | Prioridade de 0 a 10 dada pela tarefa. Pesa no sorteio da vitrine. |
| `ativo` | não | `false` tira da vitrine sem apagar. |
| `expira_em` | não | Data ISO. Depois dela o anúncio some sozinho (bom para promoções). |

- Até 200 produtos por chamada.
- Numa atualização, só mudam os campos enviados. Mandar só `preco` não apaga a imagem.
- `desativar_ausentes: true` desativa todo anúncio ativo que **não** veio no lote. Use
  quando a tarefa enviar a vitrine completa a cada rodada.
- Resposta: `{ "gravados": 12, "desativados": 3, "erros": ["xyz: link_afiliado precisa ser uma URL https"] }`.

## Ler o desempenho (para a tarefa otimizar)

```
GET https://SEU-DOMINIO/api/anuncios?todos=1
Authorization: Bearer <ANUNCIOS_TOKEN>
```

Devolve todos os anúncios com `impressoes`, `cliques`, `ativo`, `pontuacao` e
`atualizado_em`. CTR = cliques ÷ impressões.

Para ligar/desligar ou ajustar um só: `PATCH /api/anuncios/<id>` com `{ "ativo": false }`
ou `{ "pontuacao": 3 }`. Para remover: `DELETE /api/anuncios/<id>`.

## Como a vitrine escolhe

A cada exibição são sorteados até 4 anúncios ativos e não vencidos. O peso de cada um é:

```
(pontuacao + 1) × (1 + 20 × (cliques + 1) / (impressoes + 100)) × acaso(0,35–1,35)
```

Ou seja: a nota da tarefa conta, o que é clicado de verdade sobe sozinho, e o acaso
garante que produto novo também apareça. Todo clique passa por `/api/anuncios/<id>/ir`,
que conta o clique e redireciona para o `link_afiliado`. Os links levam
`rel="sponsored nofollow"` e o selo "Patrocinado" fica visível, como exigem as regras de
publicidade (CONAR) e dos programas de afiliados.

## Prompt sugerido para a tarefa agendada do Claude

> Você abastece a vitrine de afiliados do Precifica 3D (calculadora de preço para quem
> vende impressão 3D FDM no Brasil).
>
> 1. Leia o desempenho atual: `GET {SITE}/api/anuncios?todos=1` com
>    `Authorization: Bearer {ANUNCIOS_TOKEN}`.
> 2. Busque produtos do ramo de impressão 3D nas lojas onde tenho programa de afiliado
>    ({LISTA_DE_LOJAS}), com foco em: filamentos PLA/PETG/TPU, bicos e hotends, mesas PEI,
>    secadores de filamento, ferramentas de acabamento, peças de reposição e upgrades.
> 3. Aprove só o que passar em **todos** os critérios: vendido no Brasil, em estoque, nota
>    ≥ 4,3 com ≥ 50 avaliações, preço competitivo e loja/vendedor confiável. Gere o link com
>    minha tag de afiliado ({TAGS}).
> 4. Dê `pontuacao` de 0 a 10 (relevância para quem imprime em 3D × custo-benefício ×
>    desconto). Mantenha de 12 a 40 produtos ativos, variando as categorias.
> 5. Desative (`ativo: false`) os que estão sem estoque, subiram de preço ou têm CTR muito
>    abaixo da média depois de 500 impressões.
> 6. Envie tudo num `POST {SITE}/api/anuncios` (formato acima), usando um `origem_id`
>    estável por produto. Promoções levam `expira_em`.
> 7. Termine com um resumo: quantos gravados, desativados, erros e o top 5 por CTR.
