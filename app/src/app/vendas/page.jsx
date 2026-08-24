import Link from "next/link";
import { reais } from "@/lib/produto";
import { lerPreco } from "@/lib/precos";

export const metadata = {
  title: "Precificação 3D — pare de chutar o preço das suas peças",
  description:
    "Calculadora de custo e preço de venda para impressão 3D FDM. Material, energia, desgaste, falhas, mão de obra e taxas de marketplace. Acesso vitalício.",
};

const DORES = [
  {
    titulo: "O filamento não é o custo",
    texto:
      "Peça de 40 g não custa o preço de 40 g de PLA. Tem energia, desgaste da máquina, a falha que foi para o lixo, o acabamento e as horas que você passou lixando.",
  },
  {
    titulo: "O marketplace come o lucro",
    texto:
      "Você calcula R$ 30, anuncia R$ 30, e recebe R$ 24. A taxa entra no cálculo aqui, para o preço já sair com ela embutida.",
  },
  {
    titulo: "Atacado no chute vira prejuízo",
    texto:
      "Dez peças por um preço, cinquenta por outro. Cada faixa com o próprio markup, e o preço sugerido saindo pronto.",
  },
];

const INCLUI = [
  "Custo real por peça, item por item",
  "Cadastro de impressoras com desgaste, falhas e retorno do investimento",
  "Filamentos com custo por grama calculado",
  "Mão de obra por tipo de trabalho",
  "Insumos e custos adicionais por produto",
  "Faixas de atacado com markup próprio",
  "Taxas de marketplace embutidas no preço final",
  "Comparação com concorrentes",
];

// A vitrine é pública e o preço muda pelo painel, então ela não pode ser
// congelada no build: uma promoção ligada às 20h precisa aparecer às 20h.
export const dynamic = "force-dynamic";

export default async function VendasPage() {
  const preco = await lerPreco();
  return (
    <div className="ap-vendas">
      <section className="ap-vendas__hero">
        <span className="ap-paywall__selo">Acesso vitalício</span>
        <h1>Pare de chutar o preço das suas peças.</h1>
        <p>
          A Precificação 3D calcula quanto sua peça custa de verdade — e por quanto você
          precisa vender para lucrar. Sem planilha quebrada, sem achismo.
        </p>
        <div className="ap-vendas__cta">
          {/* O primeiro botão não pede e-mail: o tutorial acontece antes da
              conta, com a impressora e o filamento de quem está lendo. Pedir
              cadastro aqui era cobrar confiança de quem ainda não viu um
              preço sair. */}
          <Link href="/tutorial" className="dc-btn dc-btn--primary dc-btn--lg">
            Testar agora, sem cadastro
          </Link>
          <span>
            {preco.em_promocao && (
              <s className="ap-vendas__de">{reais(preco.cheio_centavos)}</s>
            )}{" "}
            {reais(preco.vigente_centavos)} uma vez só · sem mensalidade
          </span>
        </div>
      </section>

      <section className="ap-vendas__blocos">
        {DORES.map((d) => (
          <article key={d.titulo}>
            <h2>{d.titulo}</h2>
            <p>{d.texto}</p>
          </article>
        ))}
      </section>

      <section className="ap-vendas__inclui">
        <h2>O que vem junto</h2>
        <ul>
          {INCLUI.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </section>

      <section className="ap-vendas__fecho">
        {preco.em_promocao && (
          <span className="ap-paywall__selo">
            {preco.promo_rotulo || "Oferta por tempo limitado"}
          </span>
        )}
        <h2>
          {preco.em_promocao && <s className="ap-vendas__de">{reais(preco.cheio_centavos)}</s>}
          {reais(preco.vigente_centavos)}, uma vez.
        </h2>
        <p>
          Não é assinatura. Você paga uma vez e o acesso é seu. Pix ou cartão, pelo
          Mercado Pago.
        </p>
        <Link href="/tutorial" className="dc-btn dc-btn--primary dc-btn--lg">
          Testar agora, sem cadastro
        </Link>
        <p className="ap-vendas__entrar">
          Prefere já criar a conta? <Link href="/entrar?modo=criar">Criar conta</Link>
        </p>
        <p className="ap-vendas__entrar">
          Já comprou? <Link href="/entrar">Entrar</Link>
        </p>
      </section>
    </div>
  );
}
