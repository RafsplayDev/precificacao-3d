/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;

// Em `next dev`, expõe as ligações do wrangler.jsonc (o D1 local em
// .wrangler/) para getCloudflareContext — o mesmo `env` que o Worker
// recebe em produção.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
