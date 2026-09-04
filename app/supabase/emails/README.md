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

## 1. Verificar o domínio no Resend

O envio sai de um **subdomínio dedicado**, `mail.dropcolor.com.br`, e não do
domínio raiz. Assim a reputação de envio fica isolada: se um dia um transacional
for marcado como spam em volume, o estrago não contamina `dropcolor.com.br` nem
o site em `precifica.dropcolor.com.br`.

No Resend, em **Domains → Add domain**:

| Campo | Valor |
|---|---|
| Name | `mail.dropcolor.com.br` |
| Region (em *Advanced options*) | South America (sa-east-1) |

Ele devolve uma lista de **DNS Records** — um `MX` e dois `TXT` (SPF e DKIM).
Copie os valores da tela dele, não daqui: a chave DKIM é única por domínio e o
host do MX muda com a região.

### Publicar no Registro.br

O DNS de `dropcolor.com.br` está no Registro.br (é onde `precifica` aponta para
a Vercel). Vá em **Painel → dropcolor.com.br → DNS → Editar Zona** e
**acrescente** os registros. Não mexa no `precifica` que já está lá: envio e
site são registros independentes na mesma zona, e o site não sai do ar por
causa disso.

A pegadinha: o Registro.br completa o domínio sozinho. Se o Resend mostra
`send.mail.dropcolor.com.br`, você digita no campo de nome apenas:

```
send.mail
```

Colar o nome inteiro cria `send.mail.dropcolor.com.br.dropcolor.com.br`, e a
verificação nunca fecha. Vale para os três registros.

Salve a zona, volte no Resend e clique em **Verify**. A propagação do
Registro.br costuma levar de minutos a algumas horas — enquanto não estiver
**Verified**, não siga para o passo 2.

### DMARC (opcional, mas barato)

Um `TXT` a mais, este no domínio raiz — nome `_dmarc`, valor:

```
v=DMARC1; p=none; rua=mailto:seu@email.com
```

Com `p=none` ele não bloqueia nada; só pede relatórios de quem está mandando
e-mail em nome do seu domínio. Serve para você enxergar problemas antes de eles
virarem entrega falhada.

### Credenciais SMTP

Com o domínio verificado: **API keys → Create API Key** (permissão de envio).
Guarde a chave, ela só aparece uma vez. As credenciais SMTP ficam em
*Settings → SMTP*.

## 2. Ligar o SMTP no Supabase

Painel do projeto → **Authentication → Emails → SMTP Settings** → ligue
*Enable Custom SMTP* e preencha:

| Campo | Valor |
|---|---|
| Sender email | `nao-responda@mail.dropcolor.com.br` |
| Sender name | `DropColor` |
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | a API key do passo 1 |

O remetente **tem que estar no subdomínio verificado**. `nao-responda@dropcolor.com.br`
(sem o `mail.`) é recusado, porque foi `mail.dropcolor.com.br` que você verificou.

> Esse endereço só envia — não existe caixa de entrada nele. Quem responder
> não chega a lugar nenhum, o que para transacional é o esperado. Se um dia
> quiser um `contato@dropcolor.com.br` de verdade, é outro serviço (Zoho,
> Google Workspace), com `MX` no domínio raiz, e não conflita com este aqui.

Salve e mande um e-mail de teste (crie uma conta em `/entrar` com um endereço
seu). Se não chegar, olhe os dois lados: **Authentication → Logs** no Supabase
mostra erro de autenticação SMTP, e **Logs** no Resend mostra o que ele aceitou
e o que aconteceu com a entrega.

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
  ela precisa estar em `https://precifica.dropcolor.com.br`, e não no localhost
  do desenvolvimento — o mesmo valor de `NEXT_PUBLIC_URL_SITE` na Vercel.
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

- [ ] `mail.dropcolor.com.br` **Verified** no Resend (MX, SPF e DKIM verdes).
- [ ] `precifica.dropcolor.com.br` ainda no ar (a zona do Registro.br só ganhou
      registros novos).
- [ ] E-mail de teste chegou na **caixa de entrada**, não no spam.
- [ ] Remetente aparece como o seu domínio.
- [ ] O botão leva para o site em produção e a conta entra confirmada.
- [ ] *Site URL* = `https://precifica.dropcolor.com.br`, e
      `https://precifica.dropcolor.com.br/auth/callback` listada em *Redirect URLs*.
