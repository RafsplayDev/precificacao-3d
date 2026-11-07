"use client";

/**
 * Navegação de página inteira depois de trocar de sessão (sair): o
 * middleware roda de novo já sem o cookie e manda para o login.
 */
export function irPara(destino) {
  window.location.assign(caminhoInterno(destino));
}

/**
 * Só aceita caminho do próprio site. O `proximo` vem da query string, que
 * qualquer um monta; "//host" também é URL externa para o navegador.
 */
export function caminhoInterno(destino, padrao = "/") {
  if (typeof destino !== "string") return padrao;
  if (!destino.startsWith("/") || destino.startsWith("//")) return padrao;
  return destino;
}
