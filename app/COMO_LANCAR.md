# Como colocar no ar

Ordem importa. Cada passo depende do anterior.

---

## 1. Banco de dados

No SQL Editor do Supabase, rode **na ordem**:

1. `supabase/migrations/0018_multi_tenant.sql`
2. `supabase/migrations/0020_produto.sql`

A partir da 0018 cada linha do banco pertence a uma conta, e **os dados que já
existiam ficam invisíveis** — inclusive para você. Eles não foram apagados; só
estão sem dono. O passo 3 devolve eles.

## 2. Sua conta

Suba o app (`npm run dev`), vá em `/entrar`, escolha **Criar conta** e cadastre-se
com o seu e-mail.

> Se o Supabase estiver com confirmação de e-mail ligada (Authentication >
> Providers > Email), você recebe um link antes de conseguir entrar. Para vender
> de verdade, configure um SMTP próprio em Authentication > Emails — o servidor
> de teste do Supabase tem limite baixo e cai em spam.

## 3. Adotar seus dados antigos

Abra `supabase/migrations/0019_adotar_dados.sql`, troque
`TROQUE@PELO.SEU.EMAIL` pelo e-mail que você acabou de cadastrar, e rode.

Ele devolve todas as impressoras, filamentos, produtos e peças para a sua conta,
e depois torna o `user_id` obrigatório.

## 4. Virar admin e liberar seu próprio acesso

No SQL Editor:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'SEU@EMAIL.COM';

update public.licencas
   set status = 'ativa', origem = 'cortesia', ativada_em = now()
 where user_id = (select id from auth.users where email = 'SEU@EMAIL.COM');
```

Sem isso você cai no paywall na sua própria calculadora.

## 5. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. A `SUPABASE_SERVICE_ROLE_KEY`
está em Project Settings > API > `service_role`. **Ela ignora o RLS**: só no
servidor, nunca com prefixo `NEXT_PUBLIC_`.

## 6. Deploy na Vercel

Importe o repositório, e em Settings > Environment Variables coloque **todas** as
variáveis do `.env.local`. Depois preencha `NEXT_PUBLIC_URL_SITE` com o domínio
final.

## 7. Mercado Pago

1. Painel do Mercado Pago > **Suas integrações** > crie uma aplicação
   (modelo: *Pagamentos online* > *CheckoutPro*).
2. Em **Credenciais de produção**, copie o *Access Token* para `MP_ACCESS_TOKEN`.
3. Em **Webhooks**, cadastre a URL:
   `https://seudominio.com.br/api/mp/webhook`
   marcando o evento **Pagamentos**.
4. O painel mostra uma **assinatura secreta**. Copie para `MP_WEBHOOK_SECRET`.

Sem o `MP_WEBHOOK_SECRET` o webhook recusa tudo, por segurança: é ele que
impede alguém de mandar um "pagamento aprovado" falso e liberar acesso de graça.

### Testando antes de lançar

Use as **credenciais de teste** e crie um usuário de teste no painel do Mercado
Pago para simular a compra. Em ambiente local o webhook não chega no
`localhost` — exponha com um túnel:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

e use a URL do túnel em `NEXT_PUBLIC_URL_SITE` e no cadastro do webhook.

## 8. Afiliados

1. A pessoa cria a conta normalmente e compra (ou você libera por cortesia).
2. Em `/admin`, use **Convidar afiliado** com o e-mail dela.
3. O código é gerado na hora. Ela vê o próprio link em `/afiliado` e preenche a
   chave Pix ali.

Quando uma venda indicada é aprovada, a comissão nasce como **a receber**. Você
faz o Pix pelo seu banco e clica em **Marcar como pago** no `/admin`.

---

## Como o dinheiro se comporta

| Situação | O que acontece |
|---|---|
| Pagamento aprovado | Licença fica ativa; se houve indicação, comissão vira "a receber" |
| Pagamento pendente (Pix não pago) | Nada muda; a licença continua pendente |
| Estorno / chargeback | Licença é cancelada e a comissão daquela venda é cancelada junto |
| Webhook repetido | Ignorado — `pagamentos.mp_payment_id` e `comissoes.pagamento_id` são únicos |
| Pessoa usa o próprio link | A indicação é descartada no checkout |

### Contas por venda (aproximado)

| | Pix (~0,99%) | Cartão (~4,98%) |
|---|---|---|
| Preço | R$ 34,90 | R$ 34,90 |
| Taxa Mercado Pago | −R$ 0,35 | −R$ 1,74 |
| Comissão do afiliado | −R$ 14,90 | −R$ 14,90 |
| **Você recebe** | **R$ 19,65** | **R$ 18,26** |

Sem afiliado, some R$ 14,90 em cada coluna. Confirme as taxas no seu painel —
elas variam por conta e por prazo de liberação.
