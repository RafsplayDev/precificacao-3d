import "./globals.css";
import "./produto.css";
import { AppShell } from "@/components/AppShell";

export const metadata = {
  title: "Precificação 3D — Drop Color",
  description: "Calculadora de custo e preço de venda para impressão 3D FDM.",
  icons: {
    icon: [{ url: "/brand/logo-icon-magenta.png", type: "image/png" }],
    apple: "/brand/logo-icon-magenta.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Lucide via CDN — o componente Icon do design system lê window.lucide */}
        <script src="https://unpkg.com/lucide@0.474.0/dist/umd/lucide.js" async />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
