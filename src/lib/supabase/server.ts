import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseUrl, supabaseAnonKey, supabaseServiceKey } from "@/lib/supabase/config";

/** Client legato alla sessione dell'utente (solo per sapere chi è). */
export async function supabaseSessione() {
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // chiamato da un Server Component: il middleware aggiorna i cookie
          }
        },
      },
    },
  );
}

/** Client con pieni poteri: usarlo SOLO sul server dopo aver controllato l'utente. */
export function supabaseAdmin() {
  return createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
