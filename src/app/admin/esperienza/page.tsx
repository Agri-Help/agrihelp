import { supabaseAdmin } from "@/lib/supabase/server";
import { eliminaEsperienza, salvaEsperienza } from "../azioni";

export default async function Esperienza() {
  const { data } = await supabaseAdmin().from("esperienze").select("*").order("creato_il", { ascending: false }).limit(500);
  const voci = data || [];
  return (
    <div className="flex flex-col gap-5">
      <div className="scheda">
        <h1 className="text-lg font-bold">La mia esperienza</h1>
        <p className="mt-1 text-sm text-white/60">
          Scrivi qui i trucchi e le soluzioni che conosci solo tu. L&apos;assistente le legge prima dei manuali e le usa per rispondere ai clienti.
        </p>
        <form action={salvaEsperienza} className="mt-3 flex flex-col gap-2">
          <input name="titolo" className="campo-input" placeholder="Titolo (es. Segnale RTK che salta vicino ai pioppi)" required />
          <div className="grid grid-cols-2 gap-2">
            <input name="marca" className="campo-input" placeholder="Marca (facoltativa)" />
            <input name="modelli" className="campo-input" placeholder="Modelli (facoltativi)" />
          </div>
          <textarea name="testo" rows={5} className="campo-input" placeholder="Sintomo, causa, soluzione passo passo" required />
          <button className="bottone self-end">Salva</button>
        </form>
      </div>
      <div className="flex flex-col gap-2">
        {voci.map((v) => (
          <details key={v.id} className="scheda">
            <summary className="cursor-pointer font-medium">
              🧠 {v.titolo} <span className="text-sm font-normal text-white/50">{[v.marca, v.modelli].filter(Boolean).join(" · ")}</span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-white/80">{v.testo}</p>
            <form action={eliminaEsperienza} className="mt-2 text-right">
              <input type="hidden" name="id" value={v.id} />
              <button className="text-sm text-red-300">Elimina</button>
            </form>
          </details>
        ))}
        {voci.length === 0 && <p className="text-white/50">Ancora niente: comincia dal problema che ti chiedono più spesso.</p>}
      </div>
    </div>
  );
}
