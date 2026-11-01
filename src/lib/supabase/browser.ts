import { createBrowserClient } from "@supabase/ssr";

/** Indirizzo e chiave pubblica arrivano dal server (pagina di accesso), mai da variabili nel codice del browser. */
export function supabaseBrowser(url: string, chiavePubblica: string) {
  return createBrowserClient(url, chiavePubblica);
}
