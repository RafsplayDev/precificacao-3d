"use client";

/**
 * Navegação depois de uma troca de sessão (entrar, sair, licença liberada).
 *
 * O router do Next faz navegação no cliente: a árvore de rotas já em cache
 * é reaproveitada e o middleware não roda de novo de forma confiável. Logo
 * depois de um login isso dá em dois problemas — o `router.refresh()` em
 * voo cancela o `router.push()` seguinte (a pessoa clica em Entrar, o login
 * dá certo e a tela simplesmente não muda), e mesmo quando a navegação
 * acontece o servidor pode responder com o estado anterior ao cookie novo.
 *
 * Uma navegação de página inteira resolve os dois: o cookie de sessão que o
 * Supabase acabou de gravar vai junto no request, o middleware roda do
 * zero e decide entre painel e /assinar com dados atuais.
 */
export function irPara(destino) {
  window.location.assign(caminhoInterno(destino));
}

/**
 * Só aceita caminho do próprio site.
 *
 * O `proximo` vem da query string, que qualquer um monta: sem esta checagem
 * um link como /entrar?proximo=https://golpe.exemplo levaria a pessoa para
 * fora logo após o login, com a confiança de quem acabou de digitar a senha.
 * "//host" também é URL externa para o navegador, por isso a segunda barra
 * é barrada junto.
 */
export function caminhoInterno(destino, padrao = "/") {
  if (typeof destino !== "string") return padrao;
  if (!destino.startsWith("/") || destino.startsWith("//")) return padrao;
  return destino;
}
