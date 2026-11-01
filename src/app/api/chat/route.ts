import { NextResponse } from "next/server";
import { utenteApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { rispondi, titoloDa } from "@/lib/assistente";
import type { Macchina, Messaggio } from "@/lib/tipi";
import { conUrlFoto } from "@/lib/foto";

export const runtime = "nodejs";
export const maxDuration = 120;

type Corpo = {
  conversazioneId?: string | null;
  macchinaId?: string | null;
  testo?: string;
  foto?: string[]; // immagini JPEG in base64 (già ridotte dal telefono)
};

export async function POST(req: Request) {
  const utente = await utenteApi();
  if (!utente) return NextResponse.json({ errore: "Accesso non autorizzato" }, { status: 401 });
  const profilo = utente.profilo;
  const sb = supabaseAdmin();

  const corpo = (await req.json()) as Corpo;
  const testo = (corpo.testo || "").trim().slice(0, 4000);
  const fotoB64 = (corpo.foto || []).slice(0, 4);
  if (!testo && !fotoB64.length) return NextResponse.json({ errore: "Messaggio vuoto" }, { status: 400 });

  // Gettoni: l'amministratore non li consuma
  if (profilo.ruolo !== "admin") {
    const { data: rimasti, error } = await sb.rpc("usa_gettone", { p_cliente: profilo.id, p_motivo: "Domanda all'assistente" });
    if (error) return NextResponse.json({ errore: "Errore gettoni" }, { status: 500 });
    if (rimasti === -1) {
      return NextResponse.json(
        { errore: "gettoni-finiti", messaggio: "Hai finito i gettoni. Contatta il tecnico per la ricarica." },
        { status: 402 },
      );
    }
  }

  // Macchine del cliente
  const { data: macchineRaw } = await sb.from("macchine").select("*").eq("cliente_id", profilo.id).order("creato_il");
  const macchine = (macchineRaw || []) as Macchina[];

  // Conversazione: esistente (del cliente) o nuova
  let conversazioneId = corpo.conversazioneId || null;
  let macchinaId = corpo.macchinaId || null;
  if (conversazioneId) {
    const { data: conv } = await sb.from("conversazioni").select("*").eq("id", conversazioneId).maybeSingle();
    if (!conv || conv.cliente_id !== profilo.id) return NextResponse.json({ errore: "Conversazione non trovata" }, { status: 404 });
    macchinaId = conv.macchina_id;
  } else {
    if (macchinaId && !macchine.some((m) => m.id === macchinaId)) macchinaId = null;
    const { data: nuova, error } = await sb
      .from("conversazioni")
      .insert({ cliente_id: profilo.id, macchina_id: macchinaId, titolo: titoloDa(testo) })
      .select("id")
      .single();
    if (error || !nuova) return NextResponse.json({ errore: "Impossibile creare la conversazione" }, { status: 500 });
    conversazioneId = nuova.id as string;
  }

  // Salva le foto nell'archivio privato
  const percorsi: string[] = [];
  for (const b64 of fotoB64) {
    const dati = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    if (dati.length > 5_000_000) continue;
    const percorso = `${profilo.id}/${conversazioneId}/${crypto.randomUUID()}.jpg`;
    const { error } = await sb.storage.from("foto").upload(percorso, dati, { contentType: "image/jpeg" });
    if (!error) percorsi.push(percorso);
  }

  await sb.from("messaggi").insert({ conversazione_id: conversazioneId, ruolo: "cliente", testo, foto: percorsi });

  const { data: storia } = await sb
    .from("messaggi")
    .select("*")
    .eq("conversazione_id", conversazioneId)
    .order("creato_il")
    .limit(60);

  let risposta;
  try {
    risposta = await rispondi({
      profilo,
      macchine,
      macchinaScelta: macchine.find((m) => m.id === macchinaId) || null,
      messaggi: (storia || []) as Messaggio[],
      conversazioneId: conversazioneId!,
    });
  } catch (e) {
    console.error("Errore assistente", e);
    // restituisce il gettone se l'assistente non ha risposto
    if (profilo.ruolo !== "admin") await sb.rpc("ricarica_gettoni", { p_cliente: profilo.id, p_quantita: 1, p_motivo: "Rimborso: errore dell'assistente" });
    return NextResponse.json(
      { errore: "L'assistente non risponde in questo momento. Riprova tra poco.", conversazioneId },
      { status: 502 },
    );
  }

  const { data: msg } = await sb
    .from("messaggi")
    .insert({ conversazione_id: conversazioneId, ruolo: "assistente", testo: risposta.testo, fonti: risposta.fonti })
    .select("*")
    .single();

  await sb
    .from("conversazioni")
    .update({ aggiornato_il: new Date().toISOString() })
    .eq("id", conversazioneId);

  const { data: aggiornato } = await sb.from("profili").select("gettoni").eq("id", profilo.id).single();
  const { data: conv } = await sb.from("conversazioni").select("*").eq("id", conversazioneId).single();
  const messaggi = await conUrlFoto((storia || []).concat(msg ? [msg] : []) as Messaggio[]);

  return NextResponse.json({ conversazione: conv, messaggi, gettoni: aggiornato?.gettoni ?? 0 });
}
