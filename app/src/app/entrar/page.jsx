"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@/design-system";
import { supabase } from "@/lib/supabaseClient";
import { irPara, caminhoInterno } from "@/lib/navegar";
import { urlDoSite } from "@/lib/site";
import { tutorialVisto } from "@/components/Tutorial";

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
  const params = useSearchParams();
  const proximo = caminhoInterno(params.get("proximo"));

  const [modo, setModo] = React.useState(params.get("modo") === "criar" ? "criar" : "entrar");
  const [nome, setNome] = React.useState("");
  // O e-mail pode vir pronto na URL — é assim que a aplicação do beta manda
  // a pessoa para cá. O preço de fundador está amarrado ao e-mail com que ela
  // se candidatou; deixá-la redigitar de memória era o caminho mais curto
  // para uma conta com outro e-mail e a cobrança do preço cheio.
  const [email, setEmail] = React.useState(params.get("email") || "");
  const [senha, setSenha] = React.useState("");
  const [erro, setErro] = React.useState(
    params.get("confirmacao") === "falhou"
      ? "Este link de confirmação já foi usado ou venceu. Entre com seu e-mail e senha; " +
          "se ainda não deu, crie a conta de novo para receber outro link."
      : null
  );
  const [aviso, setAviso] = React.useState(null);
  const [enviando, setEnviando] = React.useState(false);

  const criando = modo === "criar";

  /**
   * Quem chegou aqui empurrado por uma tela do app fez o tutorial primeiro
   * e tem coisa digitada no navegador. Dizer que esse trabalho vai junto é
   * o que separa "criar conta" de "recomeçar do zero".
   */
  const vindoDoTeste = criando && proximo !== "/";

  /**
   * O rodapé é o convite de quem chegou aqui sem saber o que é o app. Só
   * pode ser lido no navegador (localStorage), então começa desligado e
   * aparece depois — o contrário faria o link piscar na tela de quem
   * acabou de sair do tutorial.
   */
  const [jaViuTutorial, setJaViuTutorial] = React.useState(true);
  React.useEffect(() => {
    setJaViuTutorial(tutorialVisto());
  }, []);
  const mostrarConvites = !(criando && jaViuTutorial);

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
          options: {
            data: { nome: nome.trim() },
            // Sem isto o link do e-mail usa a "Site URL" do painel do
            // Supabase — que aponta para o localhost do desenvolvimento e
            // deixa quem se cadastra em produção sem como confirmar a conta.
            emailRedirectTo: `${urlDoSite()}/auth/callback?proximo=${encodeURIComponent(proximo)}`,
          },
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
          setEnviando(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });
        if (error) throw error;
      }
      // Navegação de página inteira, e não router.push: o middleware precisa
      // rodar de novo já com o cookie de sessão recém-criado para liberar o
      // painel. Com o push, a rota vinha do cache do cliente e a tela ficava
      // parada na própria página de login.
      irPara(proximo);
      // Sem setEnviando(false) aqui: a saída é a troca de página, e reabilitar
      // o botão durante o carregamento só convidaria a um segundo envio.
    } catch (e) {
      setErro(traduzirErro(e));
      setEnviando(false);
    }
  }

  return (
    <div className="ap-auth">
      <Card>
        <div className="ap-auth__cabeca">
          <h1>{criando ? "Criar conta" : "Entrar"}</h1>
          <p>
            {!criando
              ? "Bem-vindo de volta à sua calculadora."
              : vindoDoTeste
                ? "Leva um minuto. O que você cadastrou no teste continua aí e vai junto para a sua conta."
                : "Leva um minuto. Depois é só liberar o acesso."}
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

        {mostrarConvites && (
        <p className="ap-auth__rodape">
          <Link href="/vendas">Conhecer a Precificação 3D</Link>
          {" · "}
          {/* A saída para quem caiu aqui sem querer criar conta ainda: o
              tutorial roda sem cadastro e mostra o preço de uma peça real. */}
          <Link href="/tutorial">Testar sem cadastro</Link>
        </p>
        )}
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
