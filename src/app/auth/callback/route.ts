import { NextResponse } from "next/server";
import { supabaseSessione } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/** Arrivo dal link nell'email (invito o accesso). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sb = await supabaseSessione();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;

  // Nessun parametro: le chiavi possono essere dopo il "#", le legge la pagina di accesso
  if (!code && !tokenHash) return NextResponse.redirect(new URL("/accedi", url.origin));

  let ok = false;
  if (code) ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && tipo) ok = !(await sb.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error;

  return NextResponse.redirect(new URL(ok ? "/" : "/accedi?errore=link", url.origin));
}
