# Migração: Supabase + Vercel → Cloudflare (Workers + D1)

Tudo roda na conta Cloudflare **dropcolorec@gmail.com**: o app (telas + API) é um
Worker gerado pelo OpenNext, e o banco é um D1. A ordem importa.

## 1. Entrar na conta certa

```bash
cd app
npm install
npx wrangler login          # faça login com dropcolorec@gmail.com
npx wrangler whoami         # confira o e-mail e anote o Account ID
```

## 2. Criar o banco D1

```bash
npx wrangler d1 create precifica-3d --location enam
```

Copie o `database_id` impresso para `wrangler.jsonc` (campo `d1_databases[0].database_id`)
e aplique o schema:

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

## 6. Trazer os dados do Supabase

No Supabase: **Project Settings → API**, copie a URL e a `service_role`. Então:

```bash
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
npm run --silent exportar-supabase > migracao-dados.sql

npx wrangler d1 execute precifica-3d --remote --file migracao-dados.sql
```

- Cada conta do Supabase vira um usuário com o **mesmo e-mail**. No primeiro
  "Entrar com Google" com esse e-mail, a conta é adotada e a pessoa encontra tudo o
  que já tinha. Quem usava outro e-mail no Supabase precisa entrar com um Google
  desse mesmo e-mail.
- Tabelas de cobrança, lista beta e afiliados **não** são migradas.
- O arquivo é idempotente: rodar de novo não duplica nada.
- `migracao-dados.sql` tem dados pessoais e está no `.gitignore`. Apague depois.

Conferência:

```bash
npx wrangler d1 execute precifica-3d --remote --command "select count(*) from usuarios; select count(*) from produtos;"
```

## 7. Desligar o que ficou para trás

Depois de testar em produção:

1. **Vercel**: remova o projeto (ou o domínio dele) para não haver dois sites no ar.
2. **Mercado Pago**: desative o webhook `/api/mp/webhook` (a rota não existe mais) e
   revogue o Access Token da aplicação.
3. **Supabase**: guarde um backup (Database → Backups, ou `pg_dump`) e pause/remova o projeto.

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
