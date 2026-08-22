# Drop Color — Design System

Drop Color é uma marca brasileira de impressão 3D. Três frentes de negócio:

1. **Loja** — produtos impressos e personalizados, vendidos direto para o cliente (cor do filamento, tamanho, acabamento escolhidos no pedido).
2. **Clube de assinatura** — modelos autorais, projetados pela própria marca, liberados por mês para quem tem impressora e quer imprimir em casa.
3. **Modelos personalizáveis** — arquivos parametrizáveis (STL/3MF) entregues junto do clube.

Tom da marca: **moderno, minimalista, técnico sem ser frio**. A identidade nasce de um ícone único: uma gota de linha contínua com um filamento contornando a base.

## Fontes deste sistema

- `uploads/ÍCONE MINIMALISTA.png` — o único material de marca fornecido (ícone minimalista, traço preto, fundo transparente, 1717×1856). Copiado para `assets/logo-icon.png` + variantes recoloridas (branco e magenta) geradas programaticamente a partir do mesmo arquivo.
- Descrição verbal do negócio fornecida pelo fundador (resumida acima).
- **Nenhum** codebase, Figma, deck ou arquivo de fonte foi fornecido. Tipografia, paleta e inventário de componentes foram definidos aqui a partir do briefing — não são extrações de um produto existente.

## Content fundamentals

Copy é **português do Brasil**, na segunda pessoa direta (**"você"**), com a marca falando em primeira pessoa do plural quando é operação (**"a gente imprime e envia"**) e em primeira do singular quando é autoria (**"modelos projetados por mim"**). Essa é a assinatura da voz: o produto é industrial, o autor é uma pessoa.

- **Casing:** sentence case em tudo — títulos, botões, labels. Só o mono uppercase (eyebrows, badges) usa caixa alta, sempre curto: `CLUBE`, `NOVO`, `PLA`.
- **Frases curtas.** Máximo duas linhas por parágrafo em UI. Sem adjetivo de marketing empilhado ("incrível", "revolucionário").
- **Concretude acima de promessa.** Prefira o número: "3 dias úteis", "0.2 mm de camada", "8 modelos novos por mês" — não "entrega rápida", "alta qualidade".
- **Especificação é conteúdo**, não letra miúda: material, tamanho e prazo aparecem em mono junto do preço.
- **Sem emoji.** Nunca em UI, nunca em copy de produto. Estado e tom são resolvidos com cor e ícone.
- **Sem gíria de e-commerce** ("aproveite!", "corre que acaba"). Escassez, quando existe, é fato: `ÚLTIMAS 3`.
- **CTA = verbo + objeto:** "Personalizar", "Baixar STL", "Montar meu kit", "Assinar o clube". Nunca "Clique aqui", nunca "Saiba mais" sozinho.
- **Erros dizem o que fazer:** "CEP incompleto" > "Erro de validação". "Pagamento recusado — tente outro cartão."
- **Preço** sempre `R$ 89` (mono, sem centavos quando redondo).

## Visual foundations

**Cor.** Duas camadas. (1) **Ink** — a escala neutra quase-preta que carrega 90% da interface, herdada direto do traço preto do logo; superfícies em `--paper` (#F6F7F9) e branco. (2) **Filament spectrum** — sete cores saturadas (magenta, coral, laranja, âmbar, menta, ciano, violeta) que representam literalmente o filamento. O espectro **nunca** vira fundo de seção: aparece em swatches, badges, barras de toast, estados ativos. Magenta (#FF2D6F) é a cor de ação; no máximo **um** botão magenta por tela. Máximo de dois fundos por página: `--paper` e `--ink-950`.

**Tipografia.** Display **Outfit** (medium 500, tracking negativo −0.01 a −0.022em; escolha do fundador a partir do lockup do logo) para títulos; corpo **DM Sans** 15px/1.6; **JetBrains Mono** para preço, especificação, formatos de arquivo e eyebrows (uppercase, 0.16em de tracking). Medida de texto máxima 640px.

**Espaço e layout.** Base 4px; 8/16/24/48 fazem quase tudo. Conteúdo centralizado em 1200px, gutter 24px (48 em telas grandes). Header fixo com blur; nada mais é fixo. Grid de produtos de 3 ou 4 colunas, gap 24px.

**Fundos.** Sem gradientes decorativos, sem mesh, sem imagem de stock genérica. A única textura é o **print-bed grid**: linhas de 24px a 6% de ink (`.dc-bedgrid`) — a referência é a mesa da impressora. Em seções ink, a versão inversa a 7% de branco. Media de produto sem foto usa esse grid como placeholder, com legenda em mono.

**Imagem.** Fotos de produto em fundo neutro claro, luz difusa, sombra curta — objeto colorido, cenário sem cor. Sem grão, sem filtro quente, sem b&w. Renders de modelo do clube em cinza claro sobre o bed grid. **Nenhuma imagem de produto foi fornecida** — placeholders no sistema.

**Raio.** Controles são **pílula** (`--radius-pill`); cards 18px; inputs 8px (a única exceção deliberada ao arredondamento total); badges 4px. Nada de raio misto no mesmo componente.

**Cards.** Branco, borda hairline de 1px (`--ink-100`), sem sombra por padrão. `raised` (shadow-sm, sem borda) só para painéis flutuantes. Card interativo sobe 2px no hover e ganha shadow-md, 220ms. Nunca sombra dentro de sombra. Nunca card com borda colorida só na esquerda.

**Sombra.** Sistema de 4 níveis, todos de baixo contraste, ink a 6–12%. Sem sombra interna decorativa. `--shadow-accent` (glow magenta a 24%) existe só sob o botão accent.

**Borda e divisória.** Hairline `--ink-100` para divisões internas; `--ink-150` em inputs; `--ink-950` para ênfase (input em foco, tag selecionada). Foco visível é sempre anel magenta a 28% (`--ring-focus`), 3px, nunca outline do browser.

**Animação.** Curta e funcional. 140ms para cor/hover, 220ms para entrada e toggle, 400ms para dialog. Easing padrão `cubic-bezier(.2,.8,.2,1)`; entradas usam `--ease-out`. Dialog e toast entram com fade + 8px de subida. **Sem bounce, sem spring, sem parallax, sem scroll-reveal.**

**Hover.** Botão ink escurece um passo (`ink-900 → ink-700`); secundário troca a borda para ink; ghost ganha fundo `--surface-sunken`; card sobe 2px; swatch cresce 8%. **Nunca** opacidade como hover.

**Press.** `transform: scale(.97)` em 80ms — o mesmo em todo controle clicável.

**Transparência e blur.** Só em duas situações: scrim de dialog (ink a 50% + blur 3px) e overlay de modelo bloqueado (ink a 55% + blur 2px). Header sticky pode usar branco a 80% + blur 8px. Em mais nada.

**Estados desabilitados:** opacidade 40% + pointer-events none. Sem cinza customizado.

## Iconography

- **Lucide** é o set oficial, via CDN: `https://unpkg.com/lucide@0.474.0/dist/umd/lucide.js`. Nenhum ícone foi fornecido com a marca — **esta é uma substituição sinalizada**: Lucide foi escolhido porque é traço aberto, terminações arredondadas e peso uniforme, exatamente a lógica do logo (linha contínua, sem preenchimento).
- Acesso **exclusivamente** pelo componente `Icon` (`<Icon name="shopping-bag" />`). Nunca escrever `<svg>` à mão, nunca colar path.
- Peso de traço da marca: **1.75** em 18–22px; 2 abaixo de 16px. Tamanhos usados: 13, 16, 18, 22.
- Ícones herdam `currentColor` — nunca ícone colorido isolado, exceto o check verde/menta em listas de plano.
- **Emoji: nunca.** **Caracteres unicode como ícone (→, ✓, ×): nunca** — existe ícone Lucide para todos.
- Logo: `assets/logo-icon.png` (ink), `logo-icon-white.png`, `logo-icon-magenta.png`. Sem wordmark vetorial fornecido — o nome é composto em Outfit medium (500), tracking −0.02em, ao lado do ícone.

### Intentional additions

O briefing não trouxe biblioteca de componentes, então o conjunto padrão foi autorado. Além dele, quatro componentes específicos do negócio:

- **FilamentSwatches** — escolher a cor do filamento é a decisão central da loja; merece primitivo próprio.
- **ProductCard** — tile de catálogo com mini-configurador de cor.
- **ModelCard** — tile de modelo do clube, com gate de plano (`locked`).
- **PlanCard** — tier de assinatura.
- **Icon** — wrapper do Lucide, para que nenhum SVG seja escrito à mão.

## Index

| Arquivo | O que é |
| --- | --- |
| `styles.css` | ponto de entrada — só `@import`s |
| `tokens/` | `colors`, `typography`, `spacing`, `radii`, `elevation`, `motion`, `fonts`, `base` |
| `components/components.css` | classes `.dc-*` usadas pelos componentes |
| `components/core/` | Button, IconButton, Badge, Tag, Card, Icon |
| `components/forms/` | Input, Select, Checkbox, Radio, Switch |
| `components/navigation/` | Tabs |
| `components/feedback/` | Dialog, Toast, Tooltip |
| `components/commerce/` | FilamentSwatches (+ `FILAMENTS`), ProductCard, ModelCard, PlanCard |
| `guidelines/` | 17 cards de fundação (Colors, Type, Spacing, Brand) |
| `ui_kits/loja/` | UI kit da vitrine (desktop): home, produto, sacola, confirmação |
| `ui_kits/loja-mobile/` | UI kit da vitrine em 390px: tab bar, barra fixa de compra, bottom sheets |
| `ui_kits/clube/` | UI kit do clube: login, biblioteca, modelo, planos, conta, downloads |
| `assets/lucide-compat.js` | normaliza o formato de ícone entre builds do Lucide (carregar após o lucide.js) |
| `assets/` | logo em ink, branco e magenta |
| `thumbnail.html` | tile do sistema |
| `SKILL.md` | wrapper para uso como Agent Skill |

## Aberto / a confirmar

- Nenhum arquivo de fonte foi fornecido — Outfit, DM Sans e JetBrains Mono são substituições via Google Fonts.
- Nenhuma foto de produto ou render de modelo foi fornecida — todos os media slots são placeholders com o bed grid.
- A paleta de filamento é uma proposta: precisa ser conferida contra as cores que a Drop Color realmente estoca.
