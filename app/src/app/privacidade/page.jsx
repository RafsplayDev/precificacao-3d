import { PaginaLegal, CONTATO } from "@/components/PaginaLegal";

export const metadata = { title: "Política de Privacidade — Precificação 3D" };

export default function Privacidade() {
  return (
    <PaginaLegal titulo="Política de Privacidade" atualizado="7 de novembro de 2026">
      <p>
        A Precificação 3D, da Drop Color, é uma calculadora gratuita de custo e preço de venda
        para impressão 3D. Esta página explica quais dados guardamos, por quê e como você pode
        pedir que sejam apagados, em conformidade com a Lei Geral de Proteção de Dados
        (Lei nº 13.709/2018).
      </p>

      <h2>O que coletamos</h2>
      <ul>
        <li>
          <strong>Dados da sua conta Google</strong>, quando você entra: nome, e-mail, foto de
          perfil e o identificador da conta. Não temos acesso à sua senha, aos seus e-mails nem
          a nenhum outro dado do Google.
        </li>
        <li>
          <strong>O que você cadastra no app</strong>: impressoras, filamentos, insumos, produtos,
          peças, preços, concorrentes e configurações.
        </li>
        <li>
          <strong>Cliques e exibições nos anúncios</strong> da vitrine, contados de forma agregada
          por anúncio, sem ligação com quem clicou.
        </li>
      </ul>

      <h2>Para que usamos</h2>
      <p>
        Só para o app funcionar: identificar você no login, guardar seus cadastros e calcular
        seus preços. Os números de cliques e exibições servem para escolher quais produtos
        mostrar na vitrine. Não vendemos, alugamos nem compartilhamos seus dados com terceiros
        para fins de marketing.
      </p>

      <h2>Cookies</h2>
      <p>
        Usamos um cookie de sessão para manter você conectado, e um cookie temporário durante
        o login com o Google. O navegador também guarda o progresso do tutorial. Não usamos
        cookies de rastreamento de terceiros.
      </p>

      <h2>Anúncios e links de afiliado</h2>
      <p>
        O app é gratuito porque exibe produtos do ramo 3D com links de afiliado, marcados como
        &quot;Patrocinado&quot;. Se você comprar por um desses links, podemos receber uma comissão
        da loja, sem custo extra para você. Ao clicar, você sai do app e passa a valer a
        política de privacidade da loja (Amazon, Mercado Livre, Shopee etc.).
      </p>

      <h2>Onde os dados ficam</h2>
      <p>
        O app e o banco de dados rodam na Cloudflare (Cloudflare Workers e D1), que pode
        armazenar os dados em servidores fora do Brasil. O login é feito pelo Google.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir a qualquer momento uma cópia dos seus dados, a correção deles ou a
        exclusão da sua conta e de tudo o que cadastrou. Basta escrever para{" "}
        <a href={`mailto:${CONTATO}`}>{CONTATO}</a> a partir do e-mail da sua conta.
        Respondemos em até 15 dias.
      </p>

      <h2>Contato</h2>
      <p>
        Dúvidas sobre esta política: <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.
      </p>
    </PaginaLegal>
  );
}
