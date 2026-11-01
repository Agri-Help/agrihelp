import { NextResponse } from "next/server";
import { utenteApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Corpo =
  | { azione: "crea"; titolo: string; tipo: string; marca?: string; modelli?: string; link_drive?: string; pagine: number }
  | { azione: "pagine"; documento_id: string; pagine: { pagina: number; testo: string }[] };

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
        tipo: ["manuale", "bollettino", "schema", "altro"].includes(corpo.tipo) ? corpo.tipo : "manuale",
        marca: corpo.marca || null,
        modelli: corpo.modelli || null,
        link_drive: corpo.link_drive || null,
        pagine: corpo.pagine,
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
  return NextResponse.json({ errore: "Azione sconosciuta" }, { status: 400 });
}
