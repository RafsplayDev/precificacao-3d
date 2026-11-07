import "server-only";
import { variavel } from "./cf";

/**
 * Login com o Google (OAuth 2.0 / OpenID Connect, fluxo "authorization code"
 * com PKCE), sem biblioteca: são dois endereços e um JSON.
 *
 * O id_token chega direto do endpoint de token do Google, por TLS, na troca
 * do código feita pelo servidor; nesse caso a especificação do OpenID
 * dispensa conferir a assinatura (OIDC Core §3.1.3.7). Conferimos o que
 * importa: emissor, audiência (o nosso client_id), validade e e-mail
 * verificado.
 */
export const COOKIE_OAUTH = "dc_oauth";

export async function credenciais() {
  const id = await variavel("GOOGLE_CLIENT_ID");
  const segredo = await variavel("GOOGLE_CLIENT_SECRET");
  if (!id || !segredo) throw new Error("Faltam GOOGLE_CLIENT_ID e/ou GOOGLE_CLIENT_SECRET.");
  return { id, segredo };
}

/** A URL pública do site: NEXT_PUBLIC_URL_SITE, ou a origem da própria requisição. */
export async function origemDoSite(req) {
  const cfg = await variavel("NEXT_PUBLIC_URL_SITE");
  return (cfg || new URL(req.url).origin).replace(/\/$/, "");
}

export const urlRetorno = (origem) => `${origem}/api/auth/google/callback`;

function base64url(buf) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function aleatorio(bytes = 32) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return base64url(b);
}

export async function desafioPkce(verificador) {
  return base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificador)));
}

function lerJwt(jwt) {
  const meio = String(jwt).split(".")[1];
  if (!meio) throw new Error("id_token inválido.");
  const b64 = meio.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(meio.length / 4) * 4, "=");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Troca o código por identidade: { sub, email, nome, foto }. */
export async function trocarCodigo({ codigo, verificador, origem }) {
  const { id, segredo } = await credenciais();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: codigo,
      client_id: id,
      client_secret: segredo,
      redirect_uri: urlRetorno(origem),
      grant_type: "authorization_code",
      code_verifier: verificador,
    }),
  });
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok || !corpo.id_token) {
    throw new Error(`Google recusou o código: ${corpo.error_description || corpo.error || res.status}`);
  }

  const t = lerJwt(corpo.id_token);
  const agora = Math.floor(Date.now() / 1000);
  if (!["https://accounts.google.com", "accounts.google.com"].includes(t.iss)) throw new Error("Emissor inesperado.");
  if (t.aud !== id) throw new Error("id_token emitido para outro aplicativo.");
  if (!t.exp || t.exp < agora - 60) throw new Error("id_token vencido.");
  if (!t.email || t.email_verified === false) throw new Error("O e-mail desta conta Google não está verificado.");

  return { sub: String(t.sub), email: String(t.email).toLowerCase(), nome: t.name || null, foto: t.picture || null };
}
