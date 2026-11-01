"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { richiediAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => {
  const v = parseInt(s(f, k), 10);
  return Number.isFinite(v) ? v : null;
};

// ---------- CLIENTI ----------

export async function invitaCliente(f: FormData) {
  await richiediAdmin();
  const sb = supabaseAdmin();
  const email = s(f, "email").toLowerCase();
  if (!email) throw new Error("Email obbligatoria");
  const sito = process.env.NEXT_PUBLIC_SITE_URL || "";

  let userId: string | null = null;
  const { data, error } = await sb.auth.admin.inviteUserByEmail(email, { redirectTo: `${sito}/auth/callback` });
  if (data?.user) userId = data.user.id;
  if (error) {
    // utente già esistente: lo cerco
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data: lista } = await sb.auth.admin.listUsers({ page, perPage: 200 });
      const trovato = lista?.users.find((u) => u.email?.toLowerCase() === email);
      if (trovato) userId = trovato.id;
      if (!lista || lista.users.length < 200) break;
    }
    if (!userId) redirect(`/admin/clienti?errore=${encodeURIComponent("Invito non riuscito: " + error.message)}`);
  }

  const gettoni = n(f, "gettoni") ?? 100;
  const { error: e2 } = await sb.from("profili").upsert({
    id: userId!,
    email,
    nome: s(f, "nome"),
    telefono: s(f, "telefono") || null,
    azienda: s(f, "azienda") || null,
    ruolo: s(f, "ruolo") === "collega" ? "collega" : "cliente",
    attivo: true,
    gettoni: 0,
  });
  if (e2) redirect(`/admin/clienti?errore=${encodeURIComponent(e2.message)}`);
  if (gettoni > 0) await sb.rpc("ricarica_gettoni", { p_cliente: userId, p_quantita: gettoni, p_motivo: s(f, "motivo_gettoni") || "Gettoni iniziali" });

  const marca = s(f, "marca");
  const modello = s(f, "modello");
  if (marca && modello) {
    await sb.from("macchine").insert({
      cliente_id: userId,
      marca,
      modello,
      anno: n(f, "anno"),
      matricola: s(f, "matricola") || null,
      guida_satellitare: s(f, "guida_satellitare") || null,
    });
  }
  revalidatePath("/admin/clienti");
  redirect(`/admin/clienti/${userId}?ok=invitato`);
}

export async function aggiornaCliente(f: FormData) {
  await richiediAdmin();
  const id = s(f, "id");
  await supabaseAdmin()
    .from("profili")
    .update({
      nome: s(f, "nome"),
      telefono: s(f, "telefono") || null,
      azienda: s(f, "azienda") || null,
      ruolo: s(f, "ruolo") === "collega" ? "collega" : "cliente",
      note: s(f, "note") || null,
    })
    .eq("id", id)
    .neq("ruolo", "admin");
  revalidatePath(`/admin/clienti/${id}`);
}

export async function cambiaAccesso(f: FormData) {
  await richiediAdmin();
  const id = s(f, "id");
  await supabaseAdmin().from("profili").update({ attivo: s(f, "attivo") === "true" }).eq("id", id).neq("ruolo", "admin");
  revalidatePath(`/admin/clienti/${id}`);
  revalidatePath("/admin/clienti");
}

export async function ricaricaGettoni(f: FormData) {
  await richiediAdmin();
  const id = s(f, "id");
  const q = n(f, "quantita");
  if (!q) return;
  await supabaseAdmin().rpc("ricarica_gettoni", {
    p_cliente: id,
    p_quantita: q,
    p_motivo: s(f, "motivo") || (q > 0 ? "Ricarica" : "Correzione"),
  });
  revalidatePath(`/admin/clienti/${id}`);
  revalidatePath("/admin/clienti");
}

export async function reinviaInvito(f: FormData) {
  await richiediAdmin();
  const email = s(f, "email");
  const id = s(f, "id");
  const sito = process.env.NEXT_PUBLIC_SITE_URL || "";
  const { error } = await supabaseAdmin().auth.admin.inviteUserByEmail(email, { redirectTo: `${sito}/auth/callback` });
  redirect(`/admin/clienti/${id}?ok=${error ? "gia-registrato" : "reinviato"}`);
}

// ---------- MACCHINE ----------

export async function aggiungiMacchina(f: FormData) {
  await richiediAdmin();
  const cliente = s(f, "cliente_id");
  await supabaseAdmin().from("macchine").insert({
    cliente_id: cliente,
    tipo: s(f, "tipo") || "trattore",
    marca: s(f, "marca"),
    modello: s(f, "modello"),
    anno: n(f, "anno"),
    matricola: s(f, "matricola") || null,
    guida_satellitare: s(f, "guida_satellitare") || null,
    note: s(f, "note") || null,
  });
  revalidatePath(`/admin/clienti/${cliente}`);
}

export async function eliminaMacchina(f: FormData) {
  await richiediAdmin();
  await supabaseAdmin().from("macchine").delete().eq("id", s(f, "id"));
  revalidatePath(`/admin/clienti/${s(f, "cliente_id")}`);
}

// ---------- CONVERSAZIONI / CASI ----------

export async function rispondiComeTecnico(f: FormData) {
  await richiediAdmin();
  const id = s(f, "conversazione_id");
  const testo = s(f, "testo");
  if (!testo) return;
  const sb = supabaseAdmin();
  await sb.from("messaggi").insert({ conversazione_id: id, ruolo: "tecnico", testo });
  await sb.from("conversazioni").update({ aggiornato_il: new Date().toISOString(), letta_dal_tecnico: true }).eq("id", id);
  revalidatePath(`/admin/conversazioni/${id}`);
}

export async function cambiaStatoCaso(f: FormData) {
  await richiediAdmin();
  const id = s(f, "conversazione_id");
  const stato = s(f, "stato");
  if (!["aperta", "al_tecnico", "risolta"].includes(stato)) return;
  const sb = supabaseAdmin();
  await sb.from("conversazioni").update({ stato, letta_dal_tecnico: true }).eq("id", id);
  if (stato === "risolta") {
    await sb.from("messaggi").insert({ conversazione_id: id, ruolo: "sistema", testo: "Il tecnico ha segnato il problema come risolto." });
  }
  revalidatePath(`/admin/conversazioni/${id}`);
  revalidatePath("/admin");
}

// ---------- ESPERIENZA ----------

export async function salvaEsperienza(f: FormData) {
  await richiediAdmin();
  const titolo = s(f, "titolo");
  const testo = s(f, "testo");
  if (!titolo || !testo) return;
  await supabaseAdmin().from("esperienze").insert({ titolo, testo, marca: s(f, "marca") || null, modelli: s(f, "modelli") || null });
  revalidatePath("/admin/esperienza");
  const torna = s(f, "torna");
  if (torna) redirect(torna + "?ok=esperienza");
}

export async function eliminaEsperienza(f: FormData) {
  await richiediAdmin();
  await supabaseAdmin().from("esperienze").delete().eq("id", s(f, "id"));
  revalidatePath("/admin/esperienza");
}

// ---------- DOCUMENTI ----------

export async function eliminaDocumento(f: FormData) {
  await richiediAdmin();
  await supabaseAdmin().from("documenti").delete().eq("id", s(f, "id"));
  revalidatePath("/admin/manuali");
}
