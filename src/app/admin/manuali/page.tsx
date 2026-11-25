import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CATEGORIE } from "@/lib/categorie";
import CaricaManuali from "./CaricaManuali";
import { DaRiordinare, SchedaDocumento, type Doc } from "./Riordina";

export default async function Manuali({ searchParams }: { searchParams: Promise<{ categoria?: string; marca?: string | string[]; cerca?: string | string[] }> }) {
  const filtro = await searchParams;
  const { data, error } = await supabaseAdmin().from("documenti").select("*").order("titolo").limit(1000);
  const tutti = ((data || []) as Partial<Doc>[]).map(
    (d) => ({ ...d, categoria: d.categoria ?? null, proposta: d.proposta ?? null, confermato: d.confermato ?? false }) as Doc,
  );
  // il database non ha ancora le colonne nuove: va eseguito il file 0002
  const manca0002 = !error && data && data.length > 0 && !("confermato" in data[0]);
  const manca0003 = !error && data && data.length > 0 && !("immagini" in data[0]);

  const daRiordinare = manca0002 ? [] : tutti.filter((d) => !d.confermato);
  const sistemati = manca0002 ? tutti : tutti.filter((d) => d.confermato);

  const marche = Array.from(new Set(sistemati.map((d) => (d.marca || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";
  const marcaScelta = uno(filtro.marca).trim().toLowerCase();
  const cerca = uno(filtro.cerca).trim().toLowerCase();
  // marca e ricerca valgono sia per la lista sia per i numeri sulle categorie, così i conteggi corrispondono sempre a ciò che si vede
  const filtrati = sistemati.filter(
    (d) =>
      (!marcaScelta || (d.marca || "").trim().toLowerCase() === marcaScelta) &&
      (!cerca || `${d.titolo || ""} ${d.marca || ""} ${d.modelli || ""}`.toLowerCase().includes(cerca)),
  );
  const visibili = filtrati.filter(
    (d) => !filtro.categoria || (filtro.categoria === "nessuna" ? !d.categoria : d.categoria === filtro.categoria),
  );
  const conta = (id: string) => filtrati.filter((d) => d.categoria === id).length;
  const senzaCategoria = filtrati.filter((d) => !d.categoria).length;
  const altriFiltri = Boolean(marcaScelta || cerca);
  const link = (p: { categoria?: string; marca?: string }) => {
    const q = new URLSearchParams();
    const categoria = "categoria" in p ? p.categoria : filtro.categoria;
    const marca = "marca" in p ? p.marca : uno(filtro.marca);
    if (categoria) q.set("categoria", categoria);
    if (marca) q.set("marca", marca);
    if (cerca) q.set("cerca", uno(filtro.cerca));
    const s = q.toString();
    return `/admin/manuali${s ? `?${s}` : ""}`;
  };
  const chip = (attivo: boolean) =>
    `shrink-0 rounded-full px-3 py-1 text-sm ${attivo ? "bg-sole font-semibold text-spazio" : "bg-white/5 hover:bg-white/10"}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="scheda">
        <h1 className="text-lg font-bold">Aggiungi manuali e bollettini</h1>
        <p className="mt-1 text-sm text-white/60">
          Scegli uno o più PDF dal telefono o dal computer. Il testo viene letto pagina per pagina e messo a disposizione
          dell&apos;assistente: il PDF non viene caricato né condiviso con i clienti, che vedono solo brevi estratti e il numero di pagina.
          Nome, categoria, marca e modello li propone l&apos;assistente leggendo la copertina: tu controlli e confermi.
        </p>
        <CaricaManuali />
      </div>

      {manca0002 && (
        <div className="scheda border border-sole/40">
          <h2 className="font-semibold">⚠️ Serve un piccolo aggiornamento del database</h2>
          <p className="mt-1 text-sm text-white/70">
            Per usare le categorie apri Supabase → SQL Editor → New query, incolla tutto il file{" "}
            <b>supabase/migrations/0002_categorie_manuali.sql</b> e premi Run. Non cancella nessun dato.
          </p>
        </div>
      )}

      {manca0003 && (
        <div className="scheda border border-sole/40">
          <h2 className="font-semibold">⚠️ Per le immagini dei manuali serve un aggiornamento del database</h2>
          <p className="mt-1 text-sm text-white/70">
            Apri Supabase → SQL Editor → New query, incolla tutto il file <b>supabase/migrations/0003_immagini_manuali.sql</b> e premi Run.
            Non cancella nessun dato.
          </p>
        </div>
      )}

      {daRiordinare.length > 0 && <DaRiordinare documenti={daRiordinare} />}

      <div>
        <h2 className="mb-2 font-semibold">Manuali sistemati ({sistemati.length})</h2>
        <nav className="-mx-1 mb-2 flex gap-1 overflow-x-auto pb-1">
          <Link href={link({ categoria: undefined })} className={chip(!filtro.categoria)}>
            Tutte ({filtrati.length})
          </Link>
          {CATEGORIE.map((c) => (
            <Link key={c.id} href={link({ categoria: c.id })} className={chip(filtro.categoria === c.id)}>
              {c.icona} {c.nome} ({conta(c.id)})
            </Link>
          ))}
          {senzaCategoria > 0 && (
            <Link href={link({ categoria: "nessuna" })} className={chip(filtro.categoria === "nessuna")}>
              Senza categoria ({senzaCategoria})
            </Link>
          )}
        </nav>
        {/* key: il modulo si ricrea a ogni cambio di filtri, così menu e casella mostrano sempre i filtri davvero attivi */}
        <form key={`${filtro.categoria || ""}|${marcaScelta}|${cerca}`} className="mb-3 flex flex-wrap gap-2" action="/admin/manuali">
          {filtro.categoria && <input type="hidden" name="categoria" value={filtro.categoria} />}
          <select name="marca" defaultValue={marche.find((m) => m.toLowerCase() === marcaScelta) || ""} className="campo-input max-w-48">
            <option value="">Tutte le marche</option>
            {marche.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input name="cerca" defaultValue={uno(filtro.cerca)} placeholder="Cerca nome o modello" className="campo-input min-w-0 flex-1" />
          <button className="rounded-full bg-white/10 px-4 text-sm">Filtra</button>
        </form>
        <div className="flex flex-col gap-2">
          {visibili.map((d) => (
            <SchedaDocumento key={d.id} d={d} />
          ))}
          {sistemati.length === 0 && <p className="text-white/50">Nessun documento sistemato ancora.</p>}
          {sistemati.length > 0 && visibili.length === 0 && <p className="text-white/50">Nessun documento con questi filtri.</p>}
          {altriFiltri && (
            <p className="text-sm text-white/50">
              Filtri attivi:{marcaScelta && <> marca <b>{uno(filtro.marca)}</b></>}
              {cerca && <> ricerca <b>{uno(filtro.cerca)}</b></>}.{" "}
              <Link href={filtro.categoria ? `/admin/manuali?categoria=${encodeURIComponent(filtro.categoria)}` : "/admin/manuali"} className="underline">
                Togli filtri
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
