import { supabaseAdmin } from "@/lib/supabase/server";

// Le istruzioni del tecnico sono un file di testo nell'archivio privato di Supabase:
// così si modificano dal pannello senza toccare il database.
const PERCORSO = "_impostazioni/istruzioni.txt";

export const ISTRUZIONI_INIZIALI = `SIGLE DEI MANUALI McCORMICK
- WSM = Workshop Service Manual: manuale d'officina (riparazioni, smontaggi, schemi, codici errore).
- OIB = Operator Instruction Book: manuale dell'operatore (uso, comandi, manutenzione ordinaria).
- PSM = il nuovo sistema di guida satellitare originale McCormick. È presente sui modelli X7.624 Clever Cab Plus.

COME USARE I MANUALI
- Per problemi di uso e regolazioni quotidiane guarda prima l'OIB; per guasti, codici errore e riparazioni il WSM.
`;

export async function leggiIstruzioni(): Promise<string> {
  const { data, error } = await supabaseAdmin().storage.from("foto").download(PERCORSO);
  if (error || !data) return ISTRUZIONI_INIZIALI;
  return (await data.text()).trim();
}

export async function salvaIstruzioniTesto(testo: string) {
  const { error } = await supabaseAdmin()
    .storage.from("foto")
    .upload(PERCORSO, new Blob([testo], { type: "text/plain;charset=utf-8" }), { upsert: true, contentType: "text/plain;charset=utf-8" });
  if (error) throw new Error(error.message);
}
