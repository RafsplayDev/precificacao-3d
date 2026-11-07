"use client";
import React from "react";
import Link from "next/link";
import { Vitrine, Medalha, MEDALHAS, textoWhatsApp } from "@/components/Vitrine";
import { Catalogo } from "@/components/Catalogo";
import { ANUNCIOS_EXEMPLO } from "@/lib/anunciosExemplo";

/**
 * Prévia dos estilos da vitrine com produtos de EXEMPLO.
 *
 * Serve para escolher o visual antes de a tarefa publicar produtos de
 * verdade: os três estilos e o catálogo completo, lado a lado, com a mesma
 * lista. Os links aqui não levam a lugar nenhum.
 */
export default function PreviaVitrine() {
  const [permitido, setPermitido] = React.useState(null);
  React.useEffect(() => {
    fetch("/api/auth/eu", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPermitido(!!d.user?.admin))
      .catch(() => setPermitido(false));
  }, []);

  if (permitido === null) return null;
  if (!permitido) return <div className="ap-previa"><p>Esta prévia é só para admins.</p></div>;

  const quatro = ANUNCIOS_EXEMPLO.slice(0, 4);
  return (
    <div className="ap-previa">
      <Link href="/admin" className="ap-legal__voltar">← Anúncios</Link>
      <h1>Prévia da vitrine</h1>
      <p>
        Produtos de exemplo, com imagens ilustrativas. A vitrine aparece no rodapé das telas
        do app (com 4 produtos) e o catálogo completo fica em <strong>Achados</strong>. 
      </p>

      <section className="ap-previa__opcao">
        <div className="ap-previa__rotulo">
          <strong>Medalhas</strong>
          <span>
            Calculadas pelo histórico de preços do próprio site, depois de {14} dias de aquecimento.
            O motivo aparece embaixo do preço.
          </span>
        </div>
        <div className="ap-previa__medalhas">
          {["ouro", "prata", "bronze"].map((n) => (
            <div key={n} className="ap-previa__medalha">
              <Medalha nivel={n} tamanho={32} />
              <div>
                <strong>{MEDALHAS[n].nome} · {MEDALHAS[n].rotulo}</strong>
                <span>{{
                  ouro: "No menor preço dos últimos 30 dias e 15% ou mais abaixo da média.",
                  prata: "10% ou mais abaixo da média dos últimos 30 dias.",
                  bronze: "5% ou mais abaixo da média dos últimos 30 dias.",
                }[n]}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="ap-previa__whats">
          <strong>Texto do botão Compartilhar no WhatsApp</strong>
          <pre>{textoWhatsApp(ANUNCIOS_EXEMPLO[0], "https://precifica.dropcolor.com.br")}</pre>
        </div>
      </section>

      <section className="ap-previa__opcao">
        <div className="ap-previa__rotulo">
          <strong>Rodapé da calculadora</strong>
          <span>Cards neutros e compactos: é o que aparece embaixo das telas enquanto a pessoa usa o app.</span>
        </div>
        <Vitrine itens={quatro} variante="calculadora" verTodos />
      </section>

      <section className="ap-previa__opcao">
        <div className="ap-previa__rotulo">
          <strong>Cards da loja</strong>
          <span>O card completo da página Achados, com fundo colorido, chamada, motivo da medalha e cupom.</span>
        </div>
        <Vitrine itens={quatro} variante="loja" verTodos />
      </section>

      <section className="ap-previa__opcao">
        <div className="ap-previa__rotulo">
          <strong>Linha compacta</strong>
          <span>Usada na seção de filamentos e na oferta que aparece no cadastro de filamento.</span>
        </div>
        <Vitrine itens={quatro} variante="lista" verTodos />
      </section>

      <section className="ap-previa__opcao">
        <div className="ap-previa__rotulo">
          <strong>Banner de destaque</strong>
          <span>A melhor oferta no banner colorido e as outras num trilho ao lado.</span>
        </div>
        <Vitrine itens={ANUNCIOS_EXEMPLO.slice(0, 6)} variante="destaque" verTodos />
      </section>

      <section className="ap-previa__opcao">
        <div className="ap-previa__rotulo">
          <strong>Loja · Achados 3D</strong>
          <span>A página completa: destaque, categorias, ofertas do dia, medalhas, cupons, filamentos e a lista com filtros.</span>
        </div>
        <Catalogo exemplo={ANUNCIOS_EXEMPLO} />
      </section>
    </div>
  );
}
