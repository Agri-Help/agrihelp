import { NextResponse } from "next/server";
import { utenteApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ID_CATEGORIE, ID_TIPI } from "@/lib/categorie";
import { proponiClassificazione } from "@/lib/classifica";
import { spiegaErroreAnthropic } from "@/lib/assistente";

export const runtime = "nodejs";
export const maxDuration = 60;

type Corpo =
  | { azione: "crea"; titolo: string; tipo: string; categoria?: string; marca?: string; modelli?: string; link_drive?: string; pagine: number }
  | { azione: "pagine"; documento_id: string; pagine: { pagina: number; testo: string }[] }
  | { azione: "proponi"; documento_id: string }
  | { azione: "immagine"; documento_id: string; pagina: number; dati: string }
  | { azione: "con_immagini"; documento_id: string }
  | { azione: "conferma"; documento_id: string; titolo: string; categoria: string; marca?: string; modelli?: string; tipo: string };

/** Riceve il testo dei manuali (estratto nel browser) pagina per pagina. */
export async function POST(req: Request) {
  const u = await utenteApi();
  if (!u || u.profilo.ruolo !== "admin") return NextResponse.json({ errore: "Solo admin" }, { status: 403 });
  const sb = supabaseAdmin();
  const corpo = (await req.json()) as Corpo;

  if (corpo.azione === "crea") {
    const { data, error } = await sb
      .from("documenti")
      .insert({
        titolo: corpo.titolo,
        tipo: ID_TIPI.includes(corpo.tipo) ? corpo.tipo : "manuale",
        marca: corpo.marca || null,
        modelli: corpo.modelli || null,
        link_drive: corpo.link_drive || null,
        pagine: corpo.pagine,
        // la categoria si salva solo se scelta (così funziona anche prima dell'aggiornamento del database)
        ...(corpo.categoria && ID_CATEGORIE.includes(corpo.categoria) ? { categoria: corpo.categoria } : {}),
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  if (corpo.azione === "pagine") {
    const righe = corpo.pagine
      .map((p) => ({ documento_id: corpo.documento_id, pagina: p.pagina, testo: p.testo.replace(/\u0000/g, "").trim() }))
      .filter((p) => p.testo.length > 20);
    if (righe.length) {
      const { error } = await sb.from("brani").insert(righe);
      if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, salvate: righe.length });
  }
  if (corpo.azione === "immagine") {
    const pagina = Math.floor(Number(corpo.pagina));
    const dati = Buffer.from(String(corpo.dati || ""), "base64");
    if (!/^[0-9a-f-]{36}$/i.test(corpo.documento_id) || !(pagina > 0) || !dati.length || dati.length > 3_000_000) {
      return NextResponse.json({ errore: "Immagine non valida" }, { status: 400 });
    }
    const { error } = await sb.storage
      .from("foto")
      .upload(`manuali/${corpo.documento_id}/${pagina}.jpg`, dati, { contentType: "image/jpeg", upsert: true });
    if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (corpo.azione === "con_immagini") {
    const { error } = await sb.from("documenti").update({ immagini: true }).eq("id", corpo.documento_id);
    if (error) {
      const m = /immagini/.test(error.message) ? "manca l'aggiornamento del database (file 0003_immagini_manuali.sql)" : error.message;
      return NextResponse.json({ errore: m }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (corpo.azione === "proponi") {
    try {
      const proposta = await proponiClassificazione(corpo.documento_id);
      return NextResponse.json({ ok: true, proposta });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      const spiegazione = /proposta|column/i.test(m) && /does not exist|schema cache/i.test(m)
        ? "manca l'aggiornamento del database (file 0002_categorie_manuali.sql)"
        : spiegaErroreAnthropic(e);
      return NextResponse.json({ errore: spiegazione }, { status: 500 });
    }
  }

  if (corpo.azione === "conferma") {
    const titolo = String(corpo.titolo || "").trim().slice(0, 200);
    if (!titolo) return NextResponse.json({ errore: "Il nome non può essere vuoto" }, { status: 400 });
    const { error } = await sb
      .from("documenti")
      .update({
        titolo,
        categoria: ID_CATEGORIE.includes(corpo.categoria) ? corpo.categoria : null,
        marca: String(corpo.marca || "").trim() || null,
        modelli: String(corpo.modelli || "").trim() || null,
        tipo: ID_TIPI.includes(corpo.tipo) ? corpo.tipo : "manuale",
        confermato: true,
        proposta: null,
      })
      .eq("id", corpo.documento_id);
    if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ errore: "Azione sconosciuta" }, { status: 400 });
}
