import "server-only";

/**
 * Títulos padronizados dos anúncios.
 *
 * O título do vendedor vem cheio de palavra para busca ("Filamento Petg
 * 1kg 1.75mm Impressora 3d Masterprint Original Promoção"). Aqui ele vira
 * sempre o mesmo formato para o mesmo tipo de produto:
 *
 *   Filamento PETG Masterprint Branco · 1 kg · 1,75 mm
 *   Kit 10 Bicos de Latão 0,4 mm · MK8
 *   Mesa PEI Texturizada 235 × 235 mm · Magnética
 *
 * O cuidado para não errar o produto: o título padronizado só é usado se a
 * marca, o material e a cor informados aparecerem no título original (com
 * sinônimos: "white" = branco, "pla plus" = PLA+…). Se algo não bater, o
 * título original fica e a tarefa recebe um aviso.
 */

const norm = (s) => ` ${String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9+,.]+/g, " ")} `;

const SINONIMOS = {
  // cores
  branco: ["branco", "branca", "white"], preto: ["preto", "preta", "black"],
  cinza: ["cinza", "grey", "gray", "prata", "silver"], vermelho: ["vermelho", "vermelha", "red"],
  azul: ["azul", "blue"], verde: ["verde", "green"], amarelo: ["amarelo", "amarela", "yellow"],
  laranja: ["laranja", "orange"], rosa: ["rosa", "pink"], roxo: ["roxo", "roxa", "lilas", "purple", "violeta"],
  marrom: ["marrom", "brown"], bege: ["bege", "skin", "pele"], dourado: ["dourado", "dourada", "gold", "ouro"],
  transparente: ["transparente", "translucido", "natural", "clear", "cristal"],
  // materiais
  "pla+": ["pla+", "pla plus", "pla pro", "pla mais"], pla: ["pla"], petg: ["petg", "pet g", "pet-g"],
  abs: ["abs"], asa: ["asa"], tpu: ["tpu", "flexivel", "flex"], nylon: ["nylon", "pa"],
  // marcas (como os vendedores costumam escrever)
  voolt: ["voolt", "voolt3d", "voolt 3d"], "3d fila": ["3d fila", "3dfila"], gtmax3d: ["gtmax3d", "gtmax 3d", "gtmax"],
  masterprint: ["masterprint", "master print"], "bambu lab": ["bambu lab", "bambulab", "bambu"],
  // acabamentos
  silk: ["silk", "seda"], fosco: ["fosco", "matte", "mate"], velvet: ["velvet", "aveludado"],
};

/** O valor (ou um sinônimo dele) aparece no texto? */
export function aparece(valor, texto) {
  if (!valor) return true;
  const t = norm(texto);
  const k = norm(valor).trim();
  const opcoes = SINONIMOS[k] || [k];
  // Palavra inteira ("asa" não casa com "casa"). Nomes longos, como marcas,
  // também casam sem espaços: "Master Print" = "Masterprint".
  const junto = t.replace(/ /g, "");
  return opcoes.some((o) => {
    const x = norm(o).trim();
    // "Marca3D" é como muita loja escreve a marca: vale também.
    return t.includes(` ${x} `) || t.includes(` ${x}3d `) ||
      (x.replace(/ /g, "").length >= 6 && junto.includes(x.replace(/ /g, "")));
  });
}

const cap = (s) => String(s || "").trim().replace(/\s+/g, " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const MATERIAL_ESCRITA = { "pla+": "PLA+", pla: "PLA", petg: "PETG", abs: "ABS", asa: "ASA", tpu: "TPU", nylon: "Nylon" };
const material = (m) => MATERIAL_ESCRITA[norm(m).trim()] || String(m || "").toUpperCase().trim();
const decimal = (n, casas = 2) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: casas });
const peso = (kg) => (kg == null ? null : kg < 1 ? `${Math.round(kg * 1000)} g` : `${decimal(kg)} kg`);
const mm = (d) => (d == null ? null : `${decimal(d)} mm`);
const juntar = (...partes) => partes.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
const comPontos = (principal, ...extras) => [principal, ...extras.filter(Boolean)].join(" · ");

/** Um modelo por categoria. Devolve null quando faltam os atributos mínimos. */
const MODELOS = {
  filamentos: (a) =>
    a.material && a.marca
      ? comPontos(
          juntar("Filamento", material(a.material), a.acabamento && cap(a.acabamento), cap(a.marca), a.cor && cap(a.cor)),
          peso(a.peso_kg),
          mm(a.diametro_mm)
        )
      : null,
  "bicos-hotend": (a) =>
    a.diametro_mm
      ? comPontos(
          juntar(a.quantidade > 1 ? `Kit ${a.quantidade} Bicos` : "Bico", a.material && `de ${cap(a.material)}`, mm(a.diametro_mm), a.marca && cap(a.marca)),
          a.padrao && a.padrao.toUpperCase(),
          a.compatibilidade
        )
      : null,
  "mesas-superficies": (a) =>
    a.tipo
      ? comPontos(
          juntar("Mesa", a.tipo.toUpperCase() === "PEI" ? "PEI" : cap(a.tipo), a.acabamento && cap(a.acabamento), a.marca && cap(a.marca), a.tamanho_mm && `${a.tamanho_mm.replace(/x/i, " × ")} mm`),
          a.magnetica ? "Magnética" : null,
          a.dupla_face ? "Dupla face" : null
        )
      : null,
  "secadores-armazenamento": (a) => (a.marca || a.modelo ? juntar("Secador de Filamento", cap(a.marca), a.modelo) : null),
  impressoras: (a) => (a.marca && a.modelo ? juntar("Impressora 3D", cap(a.marca), a.modelo) : null),
};

/** Os atributos que precisam aparecer no título original para o padronizado valer. */
const CONFERIR = ["marca", "material", "cor", "acabamento", "modelo"];

/**
 * { titulo, avisos } — o título a exibir. Sem atributos, ou se a conferência
 * falhar, é o título que veio (o da tarefa ou o original).
 */
export function tituloPadronizado({ categoria, atributos, titulo, titulo_original }) {
  const avisos = [];
  const base = titulo || titulo_original;
  if (!atributos || typeof atributos !== "object") return { titulo: base, avisos };
  const modelo = MODELOS[categoria];
  if (!modelo) return { titulo: base, avisos };

  if (titulo_original) {
    const faltam = CONFERIR.filter((k) => atributos[k] && !aparece(atributos[k], titulo_original));
    if (faltam.length) {
      avisos.push(`atributos que não aparecem no título original: ${faltam.map((k) => `${k}="${atributos[k]}"`).join(", ")} — mantido o título original`);
      return { titulo: titulo_original, avisos };
    }
  }
  const montado = modelo(atributos);
  if (!montado) {
    avisos.push("faltam atributos mínimos para padronizar o título");
    return { titulo: base, avisos };
  }
  return { titulo: montado.slice(0, 160), avisos };
}
