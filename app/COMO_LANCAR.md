# Como colocar no ar

Ordem importa. Cada passo depende do anterior.

---

## 1. Banco de dados

No SQL Editor do Supabase, rode **na ordem**:

1. `supabase/migrations/0018_multi_tenant.sql`
2. `supabase/migrations/0020_produto.sql`
3. `supabase/migrations/0023_gestao.sql` — as tabelas de gastos e vendas da tela de Gestão

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

A integração inteira roda no servidor: o navegador nunca vê credencial nenhuma.
Só duas variáveis importam, e cada uma tem uma versão para teste e outra para
produção — confundir as duas é a causa da maioria dos problemas.

| Variável | Onde fica no painel |
|---|---|
| `MP_ACCESS_TOKEN` | **Credenciais de teste** ou **de produção** > *Access Token* |
| `MP_WEBHOOK_SECRET` | **Webhooks** > *Configurar notificações* > aba do modo > *Assinatura secreta* |

*Public Key*, *Client ID* e *Client Secret* aparecem nas mesmas telas e **não são
usados** aqui. Servem para outros tipos de integração.

### Cadastrando o webhook

1. **Suas integrações** > sua aplicação > **Webhooks** > *Configurar notificações*.
2. Escolha a aba do modo: **Modo de teste** enquanto valida, **Modo de produção**
   ao lançar. São dois cadastros independentes, com assinaturas diferentes.
3. URL, com o caminho completo e **sem barra no final**:
   `https://seudominio.com.br/api/mp/webhook`
4. Marque o evento **Pagamentos (legacy)** — é o que envia o aviso no formato
   que este código lê. "Order (Mercado Pago)" é a API nova, com outro formato.
5. Salve. A **assinatura secreta** aparece então; copie para `MP_WEBHOOK_SECRET`.

Gerar uma assinatura nova invalida a anterior na hora. Toda vez que fizer isso,
atualize a variável e refaça o deploy no mesmo movimento — senão o webhook passa
a recusar tudo e o sintoma não diz o motivo.

### Testando antes de lançar

Não existe URL de teste: o ambiente é definido pelas **credenciais**, não pelo
endereço. O mesmo site vira teste ou produção conforme o `MP_ACCESS_TOKEN`.

Você precisa de **duas contas** distintas — o Mercado Pago proíbe pagar para si
mesmo, e todo o resto do teste depende disso. A conta da aplicação vende; crie
uma segunda em **Contas de teste** para comprar. Faça o login dela numa janela
onde você não esteja logado com a sua conta real.

Cartão de teste aprovado (o titular **APRO** é o que força a aprovação):

```
5031 4332 1540 6351   11/30   CVV 123   CPF 12345678909   APRO
```

O botão **Simular notificação**, na tela de webhooks, dispara um aviso assinado
sem gastar saldo. Com um id inventado (`123456`) o resultado esperado é a
assinatura passar e a consulta falhar — é o teste certo para validar só a
assinatura.

Para testar no `localhost`, exponha com um túnel, já que o webhook não alcança a
sua máquina:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

e use a URL do túnel em `NEXT_PUBLIC_URL_SITE` e no cadastro do webhook.

### Quando algo falha

Os erros aparecem nos *Runtime Logs* da Vercel, e cada mensagem aponta para uma
causa diferente:

| No log ou na tela | O que é |
|---|---|
| `falta MP_ACCESS_TOKEN` | Variável ausente, ou fora do ambiente *Production* |
| `At least one policy returned UNAUTHORIZED` | Token inválido: trocado pelo Client Secret, ou de produção sem a aplicação ativada |
| `sem assinatura válida, confirmando na API` | Normal — veja a seção abaixo |
| `falha ao consultar o pagamento` com status 404 | O id não é de um pagamento; o aviso é ignorado |
| Resposta **307** no painel do Mercado Pago | URL do webhook errada — faltou o caminho, ou sobrou barra no fim |
| Botão **Pagar** cinza no checkout | Pagador é a mesma conta que vende |

### Sobre a assinatura do webhook

O webhook aceita o aviso por um de dois caminhos. O preferido é a assinatura
HMAC. Quando ela não fecha, o aviso passa a valer só como um palpite de id, e
quem decide é a API do Mercado Pago, consultada com o `MP_ACCESS_TOKEN`.

Isso existe porque os avisos reais chegaram com assinatura que não fechava com
nenhuma das chaves do painel, enquanto o simulador passava — e sem esse segundo
caminho o cliente pagava e não recebia o acesso.

Nada do corpo da requisição é aproveitado: nem o status, nem o valor, nem a
referência. Só o id, e como pergunta. Para tirar proveito disso alguém teria que
acertar o id de um pagamento que já é seu e que o Mercado Pago já confirma como
aprovado — caso em que liberar o acesso é o certo a fazer.

`MP_WEBHOOK_SECRET_2` é opcional e aceita uma segunda chave, útil para descobrir
qual dos dois modos assina os avisos: o log diz qual delas fechou.

### Virando a chave para produção

1. `MP_ACCESS_TOKEN` = o token de **Credenciais de produção** (a aplicação
   precisa estar ativada: setor e site preenchidos no painel).
2. Cadastre o webhook na aba **Modo de produção** e ponha a assinatura de lá em
   `MP_WEBHOOK_SECRET`.
3. `NEXT_PUBLIC_URL_SITE` = o domínio final, sem barra no fim.
4. **Redeploy** — variável nova só entra em build novo.
5. Marque as três como *Sensitive* na Vercel: `MP_ACCESS_TOKEN`,
   `MP_WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY`.

Trocar o token e esquecer a assinatura é o erro mais comum da virada, e o
sintoma é o webhook recusando tudo enquanto as vendas acontecem normalmente —
ou seja, gente pagando e não recebendo. Faça os dois juntos.

Para testar depois do lançamento sem cobrar de ninguém, crie um segundo projeto
na Vercel apontando para o mesmo repositório, com as credenciais de teste. Duas
URLs estáveis, dois webhooks, e o site que vende fica intocado.

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
