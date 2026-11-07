"use client";
import React from "react";
import Link from "next/link";
import { Vitrine } from "@/components/Vitrine";
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
        do app (com 4 produtos) e o catálogo completo fica em <strong>Achados</strong>. Compare
        os estilos A, B e C e escolha um para o rodapé.
      </p>

      <section className="ap-previa__opcao">
        <div className="ap-previa__rotulo">
          <strong>A · Grade</strong>
          <span>Cartões com imagem grande. Mostra mais produtos por vez e é o mais familiar de loja.</span>
        </div>
        <Vitrine itens={quatro} variante="grade" verTodos />
      </section>

      <section className="ap-previa__opcao">
        <div className="ap-previa__rotulo">
          <strong>B · Lista</strong>
          <span>Linhas compactas. Ocupa menos altura e combina com o visual de planilha do app.</span>
        </div>
        <Vitrine itens={quatro} variante="lista" verTodos />
      </section>

      <section className="ap-previa__opcao">
        <div className="ap-previa__rotulo">
          <strong>C · Destaque</strong>
          <span>Uma oferta grande e as outras num carrossel. Chama mais atenção para a melhor oferta.</span>
        </div>
        <Vitrine itens={ANUNCIOS_EXEMPLO.slice(0, 6)} variante="destaque" verTodos />
      </section>

      <section className="ap-previa__opcao">
        <div className="ap-previa__rotulo">
          <strong>Catálogo · Achados 3D</strong>
          <span>A página completa, com filtros por loja, categoria, cupom e ordenação. Os filtros funcionam.</span>
        </div>
        <Catalogo exemplo={ANUNCIOS_EXEMPLO} />
      </section>
    </div>
  );
}
