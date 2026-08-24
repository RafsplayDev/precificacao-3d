"use client";

/**
 * Em qual dos dois modos a pessoa está.
 *
 * O middleware carimba o cookie `dc_modo` a cada request: "ativa" para quem
 * tem licença, "teste" para quem entrou sem pagar. Ler o cookie é síncrono,
 * e isso importa — se o modo chegasse por uma consulta ao Supabase, a
 * primeira renderização de toda tela apontaria para o banco errado e a
 * pessoa veria os dados piscarem antes de trocar.
 */
export function modoAcesso() {
  if (typeof document === "undefined") return "ativa";
  const achado = document.cookie
    .split("; ")
    .find((c) => c.startsWith("dc_modo="));
  return achado?.slice("dc_modo=".length) === "teste" ? "teste" : "ativa";
}

export const ehTeste = () => modoAcesso() === "teste";
