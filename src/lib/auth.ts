import { redirect } from "next/navigation";
import { supabaseAdmin, supabaseSessione } from "./supabase/server";
import type { Profilo } from "./tipi";

/**
 * Restituisce l'utente collegato e il suo profilo.
 * Se l'email è quella dell'amministratore (ADMIN_EMAIL) e il profilo non esiste, lo crea.
 */
export async function utenteCorrente(): Promise<{ id: string; email: string; profilo: Profilo | null } | null> {
  const sb = await supabaseSessione();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user?.email) return null;

  const admin = supabaseAdmin();
  const { data: profilo } = await admin.from("profili").select("*").eq("id", user.id).maybeSingle();
  if (profilo) return { id: user.id, email: user.email, profilo: profilo as Profilo };

  const emailAdmin = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (emailAdmin && user.email.toLowerCase() === emailAdmin) {
    const { data: nuovo } = await admin
      .from("profili")
      .insert({ id: user.id, email: user.email, nome: "Tecnico", ruolo: "admin", gettoni: 0 })
      .select("*")
      .single();
    return { id: user.id, email: user.email, profilo: nuovo as Profilo };
  }
  return { id: user.id, email: user.email, profilo: null };
}

/** Per le pagine: utente invitato e attivo, altrimenti alla pagina di accesso. */
export async function richiediUtente() {
  const u = await utenteCorrente();
  if (!u) redirect("/accedi");
  if (!u.profilo || !u.profilo.attivo) redirect("/accedi?errore=non-autorizzato");
  return { ...u, profilo: u.profilo };
}

export async function richiediAdmin() {
  const u = await richiediUtente();
  if (u.profilo.ruolo !== "admin") redirect("/chat");
  return u;
}

/** Per le API: restituisce null invece di reindirizzare. */
export async function utenteApi() {
  const u = await utenteCorrente();
  if (!u?.profilo || !u.profilo.attivo) return null;
  return { ...u, profilo: u.profilo };
}
