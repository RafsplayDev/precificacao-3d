"use client";
import React from "react";
import { PASSOS } from "@/lib/tutorial";
import { iniciarTutorial } from "@/components/Tutorial";

/**
 * A porta do tutorial.
 *
 * O tutorial precisava de um endereço só dele. Enquanto ele morava na raiz,
 * qualquer pessoa que abrisse o site caía no roteiro — inclusive quem já
 * tem conta e só queria entrar. E é este o link que o afiliado divulga: o
 * que ele promete é "veja o preço da sua peça saindo", não uma tela de
 * login.
 *
 * A página não desenha nada: ela liga o tutorial (localStorage + o cookie
 * que o middleware lê) e sai da frente, indo para a tela do primeiro passo.
 *
 * A ida é uma navegação de página inteira de propósito — o cookie recém
 * gravado precisa viajar no request para o middleware liberar /cadastros a
 * quem ainda não tem conta. Com `router.push` a rota viria do cache do
 * cliente e o middleware devolveria a pessoa para o login.
 */
export default function TutorialPage() {
  React.useEffect(() => {
    iniciarTutorial();
    window.location.replace(PASSOS[0]?.rota || "/");
  }, []);

  return (
    <div className="ap-auth">
      <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
        Preparando seu tutorial…
      </p>
    </div>
  );
}
