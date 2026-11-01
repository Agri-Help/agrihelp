import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { nomeMacchina, type Macchina } from "@/lib/tipi";
import { aggiornaCliente, aggiungiMacchina, cambiaAccesso, eliminaMacchina, reinviaInvito, ricaricaGettoni } from "../../azioni";

export default async function SchedaCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const sb = supabaseAdmin();
  const { data: c } = await sb.from("profili").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: macchine }, { data: movimenti }, { data: conv }] = await Promise.all([
    sb.from("macchine").select("*").eq("cliente_id", id).order("creato_il"),
    sb.from("movimenti_gettoni").select("*").eq("cliente_id", id).order("creato_il", { ascending: false }).limit(30),
    sb.from("conversazioni").select("id,titolo,stato,aggiornato_il").eq("cliente_id", id).order("aggiornato_il", { ascending: false }).limit(20),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/clienti" className="text-sm text-white/60">← Clienti</Link>
      {ok === "invitato" && <p className="rounded-lg bg-green-500/15 p-3 text-green-200">Invito inviato a {c.email}. Riceverà un&apos;email per entrare.</p>}
      {ok === "reinviato" && <p className="rounded-lg bg-green-500/15 p-3 text-green-200">Invito inviato di nuovo.</p>}
      {ok === "gia-registrato" && <p className="rounded-lg bg-white/10 p-3">Questo cliente è già registrato: può entrare da solo dalla pagina di accesso, scrivendo la sua email e il codice che riceve.</p>}

      <div className="scheda flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xl font-bold">{c.nome || c.email}</div>
          <div className="text-sm text-white/60">{c.email}{c.telefono ? ` · ${c.telefono}` : ""}</div>
        </div>
        <div className="text-2xl font-bold">🎟️ {c.gettoni}</div>
      </div>

      {/* Gettoni */}
      <form action={ricaricaGettoni} className="scheda flex flex-col gap-2">
        <div className="font-semibold">Carica gettoni</div>
        <input type="hidden" name="id" value={id} />
        <div className="flex flex-wrap gap-2">
          <input name="quantita" type="number" className="campo-input w-28" defaultValue={100} />
          <input name="motivo" className="campo-input flex-1" placeholder="Motivo (es. Ricarica - fattura 45/2026)" />
          <button className="bottone">Carica</button>
        </div>
        <p className="text-xs text-white/50">Per togliere gettoni scrivi un numero negativo.</p>
        {movimenti && movimenti.length > 0 && (
          <details className="mt-1">
            <summary className="cursor-pointer text-sm text-white/70">Storico movimenti</summary>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {movimenti.map((mv) => (
                  <tr key={mv.id} className="border-t border-white/5">
                    <td className="py-1 text-white/50">{new Date(mv.creato_il).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className={mv.quantita > 0 ? "text-green-300" : "text-white/70"}>{mv.quantita > 0 ? "+" : ""}{mv.quantita}</td>
                    <td className="text-white/70">{mv.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </form>

      {/* Macchine */}
      <div className="scheda flex flex-col gap-3">
        <div className="font-semibold">Macchine</div>
        {((macchine || []) as Macchina[]).map((m) => (
          <div key={m.id} className="flex items-start gap-2 rounded-xl bg-white/5 p-3">
            <div className="flex-1">
              <div>🚜 {nomeMacchina(m)} <span className="text-xs text-white/50">({m.tipo})</span></div>
              <div className="text-sm text-white/50">
                {[m.matricola && `matr. ${m.matricola}`, m.guida_satellitare, m.note].filter(Boolean).join(" · ")}
              </div>
            </div>
            <form action={eliminaMacchina}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="cliente_id" value={id} />
              <button className="text-sm text-red-300">Elimina</button>
            </form>
          </div>
        ))}
        <details>
          <summary className="cursor-pointer text-sm text-sole">+ Aggiungi macchina</summary>
          <form action={aggiungiMacchina} className="mt-2 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="cliente_id" value={id} />
            <select name="tipo" className="campo-input" defaultValue="trattore">
              <option value="trattore">Trattore</option>
              <option value="mietitrebbia">Mietitrebbia</option>
              <option value="guida satellitare">Kit guida satellitare</option>
              <option value="attrezzo">Attrezzo (seminatrice, spandiconcime…)</option>
              <option value="altro">Altro</option>
            </select>
            <input name="marca" className="campo-input" placeholder="Marca" required />
            <input name="modello" className="campo-input" placeholder="Modello" required />
            <input name="anno" type="number" className="campo-input" placeholder="Anno" />
            <input name="matricola" className="campo-input" placeholder="Matricola" />
            <input name="guida_satellitare" className="campo-input" placeholder="Guida satellitare / display" />
            <input name="note" className="campo-input sm:col-span-2" placeholder="Note (es. ricevitore aggiornato a 6.2, correzione RTK via NTRIP)" />
            <button className="bottone sm:col-span-2">Aggiungi</button>
          </form>
        </details>
      </div>

      {/* Conversazioni */}
      <div className="scheda">
        <div className="mb-2 font-semibold">Richieste</div>
        {(conv || []).length === 0 && <p className="text-sm text-white/50">Nessuna richiesta.</p>}
        {(conv || []).map((x) => (
          <Link key={x.id} href={`/admin/conversazioni/${x.id}`} className="flex gap-2 border-t border-white/5 py-2 text-sm">
            <span className="flex-1 truncate">{x.titolo}</span>
            <span className="text-white/50">{x.stato === "al_tecnico" ? "🧑‍🔧" : x.stato === "risolta" ? "✅" : ""} {new Date(x.aggiornato_il).toLocaleDateString("it-IT")}</span>
          </Link>
        ))}
      </div>

      {/* Dati */}
      <details className="scheda">
        <summary className="cursor-pointer font-semibold">Modifica dati</summary>
        <form action={aggiornaCliente} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="id" value={id} />
          <input name="nome" className="campo-input" defaultValue={c.nome} placeholder="Nome" />
          <input name="telefono" className="campo-input" defaultValue={c.telefono || ""} placeholder="Telefono" />
          <input name="azienda" className="campo-input" defaultValue={c.azienda || ""} placeholder="Azienda" />
          <select name="ruolo" className="campo-input" defaultValue={c.ruolo}>
            <option value="cliente">Cliente</option>
            <option value="collega">Collega tecnico</option>
          </select>
          <textarea name="note" className="campo-input sm:col-span-2" defaultValue={c.note || ""} placeholder="Note interne (non le vede il cliente)" />
          <button className="bottone sm:col-span-2">Salva</button>
        </form>
      </details>

      <div className="flex flex-wrap gap-2">
        <form action={cambiaAccesso}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="attivo" value={c.attivo ? "false" : "true"} />
          <button className={c.attivo ? "bottone-secondario border-red-400/50 text-red-200" : "bottone"}>
            {c.attivo ? "🚫 Blocca accesso" : "✅ Riattiva accesso"}
          </button>
        </form>
        <form action={reinviaInvito}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="email" value={c.email} />
          <button className="bottone-secondario">✉️ Reinvia invito</button>
        </form>
      </div>
    </div>
  );
}
