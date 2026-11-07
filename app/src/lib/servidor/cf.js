import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * As ligações do Worker (D1, variáveis e segredos).
 *
 * No Cloudflare tudo chega pelo `env` do Worker, não pelo `process.env` de
 * um servidor Node. O OpenNext expõe esse `env` com getCloudflareContext;
 * em `next dev` o mesmo objeto vem do wrangler (initOpenNextCloudflareForDev
 * no next.config), com um D1 local em .wrangler/.
 */
export async function cf() {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

export async function db() {
  const env = await cf();
  if (!env.DB) {
    throw new Error("Falta a ligação D1 `DB` no wrangler.jsonc.");
  }
  return env.DB;
}

/** Lê uma variável/segredo: primeiro do Worker, depois do process.env (build/local). */
export async function variavel(nome) {
  const env = await cf();
  return env[nome] ?? process.env[nome];
}
