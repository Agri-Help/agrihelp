import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey } from "./config";

export function supabaseBrowser() {
  return createBrowserClient(
    supabaseUrl(),
    supabaseAnonKey(),
  );
}
