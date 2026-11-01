import { richiediUtente } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Conversazione, Macchina } from "@/lib/tipi";
import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function PaginaChat() {
  const { profilo } = await richiediUtente();
  const sb = supabaseAdmin();
  const [{ data: macchine }, { data: conversazioni }] = await Promise.all([
    sb.from("macchine").select("*").eq("cliente_id", profilo.id).order("creato_il"),
    sb.from("conversazioni").select("*").eq("cliente_id", profilo.id).order("aggiornato_il", { ascending: false }).limit(50),
  ]);
  return (
    <ChatClient
      profilo={profilo}
      macchine={(macchine || []) as Macchina[]}
      conversazioniIniziali={(conversazioni || []) as Conversazione[]}
      telefonoTecnico={process.env.NEXT_PUBLIC_TELEFONO_TECNICO || ""}
    />
  );
}
