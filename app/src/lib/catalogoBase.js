/**
 * Base das sugestões de cadastro: as impressoras, materiais e marcas mais
 * comuns no Brasil. É o ponto de partida — a lista se autoalimenta com o
 * que as pessoas cadastram (ver /api/sugestoes), e o que é muito usado
 * sobe para o topo.
 *
 * `potencia_kw` é a potência MÉDIA aproximada imprimindo PLA (bico e mesa
 * aquecidos), não a da fonte. Serve para a pessoa não começar do zero; o
 * valor certo é o medido na tomada, e o campo continua editável.
 */
export const IMPRESSORAS_BASE = [
  { marca: "Bambu Lab", modelo: "A1 mini", potencia_kw: 0.08 },
  { marca: "Bambu Lab", modelo: "A1", potencia_kw: 0.1 },
  { marca: "Bambu Lab", modelo: "P1S", potencia_kw: 0.13 },
  { marca: "Bambu Lab", modelo: "P1P", potencia_kw: 0.12 },
  { marca: "Bambu Lab", modelo: "X1 Carbon", potencia_kw: 0.15 },
  { marca: "Creality", modelo: "Ender 3 V3 SE", potencia_kw: 0.11 },
  { marca: "Creality", modelo: "Ender 3 V3 KE", potencia_kw: 0.12 },
  { marca: "Creality", modelo: "Ender 3 V2", potencia_kw: 0.12 },
  { marca: "Creality", modelo: "Ender 3 S1", potencia_kw: 0.13 },
  { marca: "Creality", modelo: "K1C", potencia_kw: 0.15 },
  { marca: "Creality", modelo: "K1", potencia_kw: 0.15 },
  { marca: "Creality", modelo: "K1 Max", potencia_kw: 0.2 },
  { marca: "Creality", modelo: "CR-10 SE", potencia_kw: 0.15 },
  { marca: "Elegoo", modelo: "Neptune 4 Pro", potencia_kw: 0.13 },
  { marca: "Elegoo", modelo: "Neptune 4", potencia_kw: 0.12 },
  { marca: "Anycubic", modelo: "Kobra 3", potencia_kw: 0.13 },
  { marca: "Anycubic", modelo: "Kobra 2", potencia_kw: 0.12 },
  { marca: "Prusa", modelo: "MK4", potencia_kw: 0.09 },
  { marca: "Prusa", modelo: "MK3S+", potencia_kw: 0.08 },
  { marca: "Prusa", modelo: "MINI+", potencia_kw: 0.06 },
  { marca: "Sovol", modelo: "SV06", potencia_kw: 0.1 },
  { marca: "Flashforge", modelo: "Adventurer 5M", potencia_kw: 0.1 },
  { marca: "Flashforge", modelo: "Adventurer 5M Pro", potencia_kw: 0.11 },
];

/**
 * Materiais e a densidade (g/cm³): dela sai o comprimento do carretel de
 * 1 kg em 1,75 mm, que ninguém sabe de cabeça.
 */
export const MATERIAIS = [
  { nome: "PLA", densidade: 1.24 },
  { nome: "PLA+", densidade: 1.24 },
  { nome: "PLA Silk", densidade: 1.24 },
  { nome: "PETG", densidade: 1.27 },
  { nome: "ABS", densidade: 1.04 },
  { nome: "ASA", densidade: 1.07 },
  { nome: "TPU", densidade: 1.21 },
  { nome: "Nylon", densidade: 1.14 },
];

export const CORES = ["Branco", "Preto", "Cinza", "Vermelho", "Azul", "Verde", "Amarelo", "Laranja", "Transparente"];

export const MARCAS_FILAMENTO = [
  "3D Fila", "Voolt", "Masterprint", "GTMax3D", "F3D", "Cliever", "3DX", "Sunlu", "eSun",
  "Creality", "Bambu Lab", "Polymaker", "Elegoo", "Anycubic",
];

/** Metros de filamento 1,75 mm num carretel de `kg` quilos. */
export function metrosDoCarretel(densidade, kg = 1) {
  const area = Math.PI * 0.0875 ** 2; // cm²
  return Math.round((kg * 1000) / (densidade * area) / 100);
}

/** Qual material o nome descreve ("PETG Branco" → PETG; "PLA Silk Azul" → PLA Silk). */
export function materialDe(texto) {
  const t = ` ${String(texto || "").toLowerCase()} `;
  const ordem = ["pla silk", "pla+", "petg", "pla", "abs", "asa", "tpu", "nylon"];
  const achado = ordem.find((m) => (m === "pla+" ? t.includes("pla+") || t.includes("pla plus") : new RegExp(`[^a-z]${m.replace("+", "\\+")}[^a-z]`).test(t)));
  return MATERIAIS.find((m) => m.nome.toLowerCase() === achado) || null;
}
