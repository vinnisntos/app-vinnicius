import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino dos links de e-mail do Supabase Auth (confirmação de cadastro,
 * recuperação de senha, troca de e-mail). Aceita os dois formatos:
 * - `?code=` (PKCE — padrão do @supabase/ssr com o template default)
 * - `?token_hash=&type=` (template customizado com {{ .TokenHash }})
 * Sucesso → sessão gravada em cookie e redirect para `next` (só caminho
 * interno). Falha → /login com `?erro=link_invalido`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error("missing token") };

  const url = request.nextUrl.clone();
  url.search = "";

  if (error) {
    console.error("[auth] confirm", error.message);
    url.pathname = "/login";
    url.searchParams.set("erro", "link_invalido");
    return NextResponse.redirect(url);
  }

  // Link de recuperação sempre cai na troca de senha, mesmo sem `next`.
  url.pathname = type === "recovery" ? "/redefinir-senha" : next;
  return NextResponse.redirect(url);
}
