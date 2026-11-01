import { NextResponse } from "next/server";
import { utenteApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { passaAlTecnico } from "@/lib/assistente";

/** Il cliente preme "Passa al tecnico". Non consuma gettoni. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const utente = await utenteApi();
  if (!utente) return NextResponse.json({ errore: "Accesso non autorizzato" }, { status: 401 });
  const sb = supabaseAdmin();
  const { data: conv } = await sb.from("conversazioni").select("*").eq("id", id).maybeSingle();
  if (!conv || conv.cliente_id !== utente.id) return NextResponse.json({ errore: "Non trovata" }, { status: 404 });

  const { data: ultimi } = await sb
    .from("messaggi")
    .select("ruolo,testo")
    .eq("conversazione_id", id)
    .order("creato_il", { ascending: false })
    .limit(6);
  const riepilogo = (ultimi || [])
    .reverse()
    .map((m) => `${m.ruolo === "cliente" ? "Cliente" : m.ruolo === "tecnico" ? "Tecnico" : "AI"}: ${String(m.testo).slice(0, 300)}`)
    .join("\n");

  await passaAlTecnico(id, "Il cliente ha chiesto di parlare con il tecnico", riepilogo, false, utente.profilo);
  await sb.from("messaggi").insert({
    conversazione_id: id,
    ruolo: "sistema",
    testo: "Hai chiesto il tecnico: è stato avvisato e ti ricontatterà al più presto.",
  });
  await sb.from("conversazioni").update({ aggiornato_il: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}
