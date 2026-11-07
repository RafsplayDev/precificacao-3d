# Colocar no ar na Cloudflare (Workers + D1)

Tudo roda na conta Cloudflare **dropcolorec@gmail.com**: o app (telas + API) é um
Worker gerado pelo OpenNext, e o banco é um D1. O banco começa vazio — os dados do
Supabase não são trazidos; cada pessoa entra com o Google e cadastra do zero (o
tutorial guia esse primeiro cadastro). A ordem importa.

## 1. Entrar na conta certa

```bash
cd app
npm install
npx wrangler login          # faça login com dropcolorec@gmail.com
npx wrangler whoami         # confira o e-mail e anote o Account ID
```

## 2. Banco D1 (já feito)

O banco `precifica-3d` já existe na conta da Dropcolor e o id dele já está no
`wrangler.jsonc`. Para criar as tabelas (e depois a cada migração nova em `migrations/`):

```bash
npm run db:migrar
```

## 3. Criar o login com Google

No [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. **Tela de consentimento OAuth**: tipo *Externo*, nome "Precificação 3D", escopos
   `openid`, `email`, `profile` (não exigem verificação do Google). Publique o app
   (*Em produção*) para que qualquer conta Google possa entrar.
2. **Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
3. **URIs de redirecionamento autorizados**:
   - `https://SEU-DOMINIO/api/auth/google/callback`
   - `https://precifica-3d.<subdominio>.workers.dev/api/auth/google/callback` (enquanto não houver domínio)
   - `http://localhost:3000/api/auth/google/callback` (desenvolvimento)

## 4. Segredos do Worker

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
openssl rand -hex 32 | npx wrangler secret put ANUNCIOS_TOKEN   # guarde: é o token da tarefa de anúncios
```

Em `wrangler.jsonc > vars`:
- `NEXT_PUBLIC_URL_SITE`: o domínio final, sem barra no fim (vazio usa a origem da requisição).
- `ADMIN_EMAILS`: quem vê o painel `/admin` de anúncios (separados por vírgula).

## 5. Publicar

```bash
npm run deploy
```

O endereço `*.workers.dev` aparece no fim. Para usar o domínio próprio: painel da
Cloudflare → **Workers & Pages → precifica-3d → Settings → Domains & Routes → Add →
Custom domain**. O domínio precisa estar na mesma conta Cloudflare (se ele estiver
hoje na Vercel ou em outro registrador, adicione o site na Cloudflare e troque os
nameservers primeiro).

## 6. Desligar o que ficou para trás

Depois de testar em produção:

1. **Vercel**: remova o projeto (ou o domínio dele) para não haver dois sites no ar.
2. **Mercado Pago**: desative o webhook `/api/mp/webhook` (a rota não existe mais) e
   revogue o Access Token da aplicação.
3. **Supabase**: se quiser guardar o histórico, faça um backup (Database → Backups); depois pause ou remova o projeto.

## Custos

Workers e D1 têm cota gratuita generosa (100 mil requisições/dia no Workers Free;
5 GB e 5 milhões de leituras/dia no D1 Free). Para o volume do app hoje, deve sair de graça.
O plano Workers Paid (US$ 5/mês) só vira necessário se passar dessas cotas.

## Desenvolvimento local

```bash
cp .dev.vars.example .dev.vars
npm run db:migrar-local
npm run dev            # Next em modo dev, com o D1 local
npm run preview        # empacotado no runtime do Workers
```
