"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@/design-system";
import { supabase } from "@/lib/supabaseClient";

function traduzirErro(e) {
  const m = String(e?.message || e || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Já existe uma conta com este e-mail. Escolha 'Entrar'.";
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  return e?.message || "Não foi possível concluir. Tente novamente.";
}

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const proximo = params.get("proximo") || "/";

  const [modo, setModo] = React.useState(params.get("modo") === "criar" ? "criar" : "entrar");
  const [nome, setNome] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [erro, setErro] = React.useState(null);
  const [aviso, setAviso] = React.useState(null);
  const [enviando, setEnviando] = React.useState(false);

  const criando = modo === "criar";

  async function enviar(ev) {
    ev.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      if (criando) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { nome: nome.trim() } },
        });
        if (error) throw error;

        // Com confirmação de e-mail ligada no Supabase, o signUp não devolve
        // sessão: a pessoa só entra depois de clicar no link. Sem sessão não
        // adianta redirecionar — cairia de volta aqui.
        if (!data.session) {
          setAviso(
            "Conta criada. Enviamos um link de confirmação para " +
              email.trim() +
              ". Confirme e volte para entrar."
          );
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });
        if (error) throw error;
      }
      // refresh antes do push: o middleware precisa reler a licença com o
      // cookie de sessão recém-criado, senão manda para /assinar por engano.
      router.refresh();
      router.push(proximo);
    } catch (e) {
      setErro(traduzirErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="ap-auth">
      <Card>
        <div className="ap-auth__cabeca">
          <h1>{criando ? "Criar conta" : "Entrar"}</h1>
          <p>
            {criando
              ? "Leva um minuto. Depois é só liberar o acesso."
              : "Bem-vindo de volta à sua calculadora."}
          </p>
        </div>

        <form onSubmit={enviar} className="ap-auth__form">
          {criando && (
            <Input
              id="cadastro-nome" label="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              required
            />
          )}
          <Input
            id="auth-email" label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            id="auth-senha" label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={criando ? "new-password" : "current-password"}
            hint={criando ? "Mínimo de 6 caracteres." : undefined}
            minLength={6}
            required
          />

          {erro && <p className="ap-auth__erro">{erro}</p>}
          {aviso && <p className="ap-auth__aviso">{aviso}</p>}

          <Button type="submit" block disabled={enviando}>
            {enviando ? "Aguarde…" : criando ? "Criar minha conta" : "Entrar"}
          </Button>
        </form>

        <div className="ap-auth__troca">
          {criando ? (
            <>
              Já tem conta?{" "}
              <button type="button" onClick={() => { setModo("entrar"); setErro(null); }}>
                Entrar
              </button>
            </>
          ) : (
            <>
              Ainda não tem acesso?{" "}
              <button type="button" onClick={() => { setModo("criar"); setErro(null); }}>
                Criar conta
              </button>
            </>
          )}
        </div>

        <p className="ap-auth__rodape">
          <Link href="/vendas">Conhecer a Precificação 3D</Link>
        </p>
      </Card>
    </div>
  );
}

export default function EntrarPage() {
  // useSearchParams exige Suspense para a página não virar dinâmica inteira.
  return (
    <Suspense fallback={null}>
      <Formulario />
    </Suspense>
  );
}
