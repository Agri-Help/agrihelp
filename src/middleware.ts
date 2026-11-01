import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  // Impostazioni mancanti: mostra la pagina di controllo invece di un errore
  if (!url || !key) {
    if (request.nextUrl.pathname === "/stato") return response;
    return NextResponse.redirect(new URL("/stato", request.url));
  }
  try {
    const sb = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await sb.auth.getUser();
  } catch (e) {
    console.error("Middleware: errore Supabase", e);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icone|immagini|manifest.webmanifest|sw.js|icon.png|apple-icon.png).*)"],
};
