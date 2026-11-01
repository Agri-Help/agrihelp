import { NextResponse } from "next/server";
import { utenteApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { conUrlFoto } from "@/lib/foto";
import type { Messaggio } from "@/lib/tipi";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const utente = await utenteApi();
  if (!utente) return NextResponse.json({ errore: "Accesso non autorizzato" }, { status: 401 });
  const sb = supabaseAdmin();
  const { data: conv } = await sb.from("conversazioni").select("*").eq("id", id).maybeSingle();
  if (!conv || (conv.cliente_id !== utente.id && utente.profilo.ruolo !== "admin"))
    return NextResponse.json({ errore: "Non trovata" }, { status: 404 });
  const { data: msg } = await sb.from("messaggi").select("*").eq("conversazione_id", id).order("creato_il");
  return NextResponse.json({ conversazione: conv, messaggi: await conUrlFoto((msg || []) as Messaggio[]) });
}
