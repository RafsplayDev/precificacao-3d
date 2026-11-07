"use client";
import React from "react";
import { PASSOS } from "@/lib/tutorial";
import { iniciarTutorial } from "@/components/Tutorial";

/**
 * A porta do tutorial.
 *
 * O primeiro login de uma conta nova cai aqui, e o endereço também serve
 * para divulgar ("veja o preço da sua peça saindo"): sem sessão, o
 * middleware manda para o login com `proximo=/tutorial` e a pessoa volta
 * para cá logo depois de entrar com o Google.
 *
 * A página não desenha nada: liga o tutorial (localStorage) e sai da
 * frente, indo para a tela do primeiro passo.
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
