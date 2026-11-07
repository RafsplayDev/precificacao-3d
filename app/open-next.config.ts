import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sem cache incremental (ISR): todas as telas que leem dados são dinâmicas
// e as estáticas não mudam entre deploys.
export default defineCloudflareConfig({});
