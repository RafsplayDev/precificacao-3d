# E-mails de autenticação com remetente próprio

Por padrão quem manda o e-mail de confirmação é o Supabase, de
`noreply@mail.app.supabase.io`. Esse servidor existe só para desenvolvimento:
tem limite baixo (poucos e-mails por hora), o remetente não é seu e boa parte
das mensagens cai em spam — o que, num cadastro, significa gente que cria conta
e nunca consegue entrar.

Ligar um SMTP próprio troca o remetente pelo seu domínio e tira o limite. Não
mexe em nenhuma linha de código do app: o link continua caindo em
`/auth/callback`, que já sabe tratar tanto `?code=` quanto `token_hash`
(`src/app/auth/callback/route.js`).

---

## 1. Escolher um provedor e verificar o domínio

Qualquer serviço transacional serve: **Resend**, Postmark, Brevo, SendGrid,
Amazon SES. O Resend tem o cadastro mais rápido e um plano gratuito que dá
conta do começo.

No painel do provedor, adicione o seu domínio e publique no DNS os registros
que ele pedir — normalmente **SPF**, **DKIM** e às vezes **DMARC**. Espere ficar
"verificado" antes de seguir: sem isso o e-mail sai, mas cai em spam, que é
justamente o problema que estamos resolvendo.

> Se você ainda não tem domínio, dá para testar com o domínio de sandbox do
> provedor, mas só envia para o seu próprio e-mail. Para vender, precisa do
> domínio verificado.

Depois gere as credenciais SMTP (host, porta, usuário, senha). No Resend elas
ficam em *Settings → SMTP*, e a senha é a própria API key.

## 2. Ligar o SMTP no Supabase

Painel do projeto → **Authentication → Emails → SMTP Settings** → ligue
*Enable Custom SMTP* e preencha:

| Campo | O que pôr |
|---|---|
| Sender email | `nao-responda@seudominio.com.br` |
| Sender name | `DropColor` |
| Host | o host do provedor (ex.: `smtp.resend.com`) |
| Port | `587` |
| Username / Password | as credenciais SMTP do passo 1 |

Salve e mande um e-mail de teste (crie uma conta em `/entrar` com um endereço
seu). Se não chegar, veja **Authentication → Logs**: erro de autenticação SMTP
aparece ali com o motivo.

Ainda em *Authentication → Emails*, confira **Rate Limits**: o limite baixo
padrão continua valendo até você aumentá-lo, mesmo com SMTP próprio.

## 3. Trocar os textos pelos daqui

**Authentication → Emails → Templates**. Para cada template, ajuste o assunto
e cole o corpo correspondente:

| Template no painel | Arquivo | Assunto |
|---|---|---|
| Confirm signup | `confirmar-cadastro.html` | Confirme seu e-mail — DropColor |
| Reset Password | `redefinir-senha.html` | Redefinir sua senha — DropColor |

Cole **só o que vem depois do comentário `<!-- ... -->`** no topo do arquivo — o
painel já monta o `<html>`/`<body>` em volta.

Os arquivos aqui são a fonte da verdade: editou o e-mail no painel, traga a
mudança para cá também, senão na próxima vez ninguém sabe qual versão é a boa.

### Sobre as variáveis

- `{{ .ConfirmationURL }}` — o link pronto, já com o `proximo=` que o app
  mandou no `emailRedirectTo`. É o que os templates usam.
- `{{ .SiteURL }}` — a *Site URL* configurada em **Authentication → URL
  Configuration**. O logo do e-mail sai de lá (`{{ .SiteURL }}/brand/...`), então
  ela precisa apontar para o site em produção, não para o localhost.
- `{{ .TokenHash }}` — a alternativa descrita abaixo.

### Opcional: link que funciona em outro aparelho

O `{{ .ConfirmationURL }}` usa o fluxo PKCE: o link tem que ser aberto **no mesmo
navegador** que fez o cadastro, porque a outra metade do segredo ficou lá. Quem
se cadastra no computador e abre o e-mail no celular vê "link inválido".

Para eliminar isso, troque as duas ocorrências de `{{ .ConfirmationURL }}` no
template de cadastro por:

```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup
```

O `/auth/callback` já aceita esse formato. Só vale para os e-mails disparados
pelo app (que sempre mandam `emailRedirectTo`); um convite criado à mão pelo
painel do Supabase vem sem `RedirectTo` e o link sairia quebrado.

## 4. Conferir antes de considerar pronto

- [ ] Domínio verificado no provedor (SPF/DKIM verdes).
- [ ] E-mail de teste chegou na **caixa de entrada**, não no spam.
- [ ] Remetente aparece como o seu domínio.
- [ ] O botão leva para o site em produção e a conta entra confirmada.
- [ ] *Site URL* em produção, e a URL de callback listada em *Redirect URLs*.
