import { NextResponse } from "next/server";
import { ehTarefa } from "@/lib/servidor/anuncios";
import { buscarShopee, credenciaisShopee } from "@/lib/servidor/shopee";

export const dynamic = "force-dynamic";

/**
 * POST /api/anuncios/shopee   (Authorization: Bearer ANUNCIOS_TOKEN)
 * { "termo": "filamento pla", "ordem": 2, "pagina": 1, "limite": 20 }
 *
 * Busca no catálogo de afiliados da Shopee pelo próprio site, com as
 * credenciais guardadas no Worker — a tarefa não precisa conhecer o AppId
 * nem o Secret. Cada produto já volta no formato do POST /api/anuncios,
 * com o link de afiliado pronto (`link_afiliado`).
 */
export async function POST(req) {
  if (!(await ehTarefa(req))) return NextResponse.json({ message: "Token inválido." }, { status: 401 });
  if (!(await credenciaisShopee())) {
    return NextResponse.json({ message: "A Open API da Shopee não está configurada (SHOPEE_APP_ID/SHOPEE_APP_SECRET)." }, { status: 503 });
  }
  const corpo = await req.json().catch(() => ({}));
  if (!corpo.termo) return NextResponse.json({ message: "Envie { termo }." }, { status: 400 });
  try {
    return NextResponse.json(await buscarShopee(corpo));
  } catch (e) {
    return NextResponse.json({ message: e.message }, { status: 502 });
  }
}
