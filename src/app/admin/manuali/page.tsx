import { supabaseAdmin } from "@/lib/supabase/server";
import { eliminaDocumento } from "../azioni";
import CaricaManuali from "./CaricaManuali";

export default async function Manuali() {
  const { data } = await supabaseAdmin().from("documenti").select("*").order("creato_il", { ascending: false }).limit(500);
  const documenti = data || [];
  return (
    <div className="flex flex-col gap-5">
      <div className="scheda">
        <h1 className="text-lg font-bold">Aggiungi manuali e bollettini</h1>
        <p className="mt-1 text-sm text-white/60">
          Scegli uno o più PDF dal telefono o dal computer. Il testo viene letto pagina per pagina e messo a disposizione
          dell&apos;assistente: il PDF non viene caricato né condiviso con i clienti, che vedono solo brevi estratti e il numero di pagina.
        </p>
        <CaricaManuali />
      </div>
      <div>
        <h2 className="mb-2 font-semibold">Documenti indicizzati ({documenti.length})</h2>
        <div className="flex flex-col gap-2">
          {documenti.map((d) => (
            <div key={d.id} className="scheda flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">📖 {d.titolo}</div>
                <div className="text-sm text-white/50">
                  {d.tipo} · {d.marca || "marca ?"} {d.modelli ? `· ${d.modelli}` : ""} · {d.pagine} pag.
                  {d.link_drive && (
                    <> · <a className="underline" href={d.link_drive} target="_blank" rel="noreferrer">Drive</a></>
                  )}
                </div>
              </div>
              <form action={eliminaDocumento}>
                <input type="hidden" name="id" value={d.id} />
                <button className="text-sm text-red-300">Elimina</button>
              </form>
            </div>
          ))}
          {documenti.length === 0 && <p className="text-white/50">Nessun documento ancora.</p>}
        </div>
      </div>
    </div>
  );
}
