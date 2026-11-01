import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { invitaCliente } from "../azioni";

export default async function Clienti({ searchParams }: { searchParams: Promise<{ errore?: string; q?: string }> }) {
  const { errore, q } = await searchParams;
  let query = supabaseAdmin().from("profili").select("*, macchine(id)").neq("ruolo", "admin").order("nome");
  if (q) query = query.or(`nome.ilike.%${q.replace(/[%,()]/g, "")}%,email.ilike.%${q.replace(/[%,()]/g, "")}%,azienda.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  const clienti = data || [];

  return (
    <div className="flex flex-col gap-5">
      <details className="scheda" open={clienti.length === 0 || !!errore}>
        <summary className="cursor-pointer text-lg font-bold">+ Invita un nuovo cliente</summary>
        {errore && <p className="mt-2 rounded-lg bg-red-500/15 p-2 text-sm text-red-200">{errore}</p>}
        <form action={invitaCliente} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input name="nome" className="campo-input" placeholder="Nome e cognome" required />
          <input name="email" type="email" className="campo-input" placeholder="Email (riceverà l'invito)" required />
          <input name="telefono" className="campo-input" placeholder="Telefono" />
          <input name="azienda" className="campo-input" placeholder="Azienda agricola" />
          <select name="ruolo" className="campo-input" defaultValue="cliente">
            <option value="cliente">Cliente</option>
            <option value="collega">Collega tecnico</option>
          </select>
          <input name="gettoni" type="number" min={0} className="campo-input" defaultValue={100} placeholder="Gettoni iniziali" />
          <input name="motivo_gettoni" className="campo-input sm:col-span-2" placeholder="Motivo gettoni (es. Vendita Fendt 724 - fattura 123)" defaultValue="Regalo alla vendita del trattore" />
          <div className="pt-2 text-sm font-semibold text-white/70 sm:col-span-2">Prima macchina (facoltativa)</div>
          <input name="marca" className="campo-input" placeholder="Marca (es. Fendt)" />
          <input name="modello" className="campo-input" placeholder="Modello (es. 724 Vario)" />
          <input name="anno" type="number" className="campo-input" placeholder="Anno" />
          <input name="matricola" className="campo-input" placeholder="Matricola / telaio" />
          <input name="guida_satellitare" className="campo-input sm:col-span-2" placeholder="Guida satellitare (es. Trimble GFX-750 + NAV-900, RTK)" />
          <button className="bottone sm:col-span-2">Invia invito</button>
        </form>
      </details>

      <form className="flex gap-2">
        <input name="q" defaultValue={q} className="campo-input" placeholder="Cerca per nome, email, azienda" />
        <button className="bottone-secondario">Cerca</button>
      </form>

      <div className="flex flex-col gap-2">
        {clienti.map((c) => (
          <Link key={c.id} href={`/admin/clienti/${c.id}`} className="scheda flex items-center gap-3 hover:bg-spazio-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">
                {c.nome || c.email} {c.ruolo === "collega" && <span className="ml-1 rounded bg-white/10 px-1.5 text-xs">collega</span>}
                {!c.attivo && <span className="ml-1 rounded bg-red-500/30 px-1.5 text-xs">bloccato</span>}
              </div>
              <div className="truncate text-sm text-white/50">
                {c.azienda ? `${c.azienda} · ` : ""}
                {c.email} · 🚜 {(c.macchine as unknown[]).length}
              </div>
            </div>
            <div className={`rounded-full px-3 py-1 text-sm font-semibold ${c.gettoni <= 5 ? "bg-red-500/20 text-red-200" : "bg-white/10"}`}>🪙 {c.gettoni}</div>
          </Link>
        ))}
        {clienti.length === 0 && <p className="text-white/50">Nessun cliente ancora.</p>}
      </div>
    </div>
  );
}
