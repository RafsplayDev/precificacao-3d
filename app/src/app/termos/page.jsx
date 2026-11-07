import { PaginaLegal, CONTATO } from "@/components/PaginaLegal";

export const metadata = { title: "Termos de Uso — Precificação 3D" };

export default function Termos() {
  return (
    <PaginaLegal titulo="Termos de Uso" atualizado="7 de novembro de 2026">
      <p>
        Ao usar a Precificação 3D, da Drop Color, você concorda com estes termos.
      </p>

      <h2>O serviço</h2>
      <p>
        A Precificação 3D é uma calculadora gratuita que estima o custo e sugere preços de venda
        para peças impressas em 3D, a partir dos dados que você informa. O acesso é feito com
        uma conta Google.
      </p>

      <h2>Os resultados são estimativas</h2>
      <p>
        Os valores calculados dependem dos dados cadastrados e das fórmulas do app. Eles servem
        de apoio à sua decisão de preço e não substituem a orientação de um contador ou
        consultor. A Drop Color não se responsabiliza por prejuízos decorrentes de preços
        definidos com base no app.
      </p>

      <h2>Sua conta</h2>
      <p>
        Você é responsável pelo que cadastra e pelo uso da sua conta. Não use o app para fins
        ilegais nem tente acessar dados de outras pessoas ou prejudicar o funcionamento do
        serviço. Podemos suspender contas que façam isso.
      </p>

      <h2>Anúncios</h2>
      <p>
        O app exibe produtos com links de afiliado, marcados como &quot;Patrocinado&quot;. A compra
        acontece na loja de destino, que é a responsável pelo produto, pelo preço, pela entrega
        e pelo atendimento. Preços e disponibilidade podem mudar sem aviso.
      </p>

      <h2>Disponibilidade e mudanças</h2>
      <p>
        O serviço é oferecido como está. Podemos alterar funcionalidades, estes termos ou
        encerrar o serviço; mudanças relevantes serão avisadas no app. Você pode parar de usar
        e pedir a exclusão dos seus dados a qualquer momento (veja a Política de Privacidade).
      </p>

      <h2>Contato</h2>
      <p>
        <a href={`mailto:${CONTATO}`}>{CONTATO}</a>
      </p>
    </PaginaLegal>
  );
}
