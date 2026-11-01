import { supabaseAdmin } from "./supabase/server";
import type { Messaggio } from "./tipi";

/** Aggiunge ai messaggi dei link temporanei (1 ora) per vedere le foto. */
export async function conUrlFoto(messaggi: Messaggio[]): Promise<Messaggio[]> {
  const percorsi = messaggi.flatMap((m) => m.foto || []);
  if (!percorsi.length) return messaggi;
  const { data } = await supabaseAdmin().storage.from("foto").createSignedUrls(percorsi, 3600);
  const mappa = new Map((data || []).map((d) => [d.path, d.signedUrl]));
  return messaggi.map((m) => ({ ...m, fotoUrl: (m.foto || []).map((p) => mappa.get(p) || "").filter(Boolean) }));
}
