"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIE, TIPI, idElencoModelli, iconaCategoria, nomeCategoria, nomeTipo, type Proposta } from "@/lib/categorie";
import { eliminaDocumento } from "../azioni";
import { apriPdf, caricaPdfJs, immaginePagina, salvaImmagine, segnaConImmagini } from "@/lib/pdfBrowser";

export type Doc = {
  id: string;
  titolo: string;
  tipo: string;
  categoria: string | null;
  marca: string | null;
  modelli: string | null;
  pagine: number;
  link_drive: string | null;
  proposta: Proposta | null;
  confermato: boolean;
  immagini?: boolean;
};

/** Aggiunge le immagini delle pagine a un manuale già caricato, rileggendo lo stesso PDF. */
function AggiungiImmagini({ d }: { d: Doc }) {
  const router = useRouter();
  const [stato, setStato] = useState("");
  const [lavoro, setLavoro] = useState(false);

  async function scelto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLavoro(true);
    try {
      setStato("Apro il PDF…");
      const pdf = await apriPdf(await caricaPdfJs(), f);
      if (pdf.numPages !== d.pagine && !confirm(`Questo PDF ha ${pdf.numPages} pagine, quello caricato ne ha ${d.pagine}. È davvero lo stesso manuale?`)) {
        setStato("");
        setLavoro(false);
        return;
      }
      for (let n = 1; n <= pdf.numPages; n++) {
        if (n % 5 === 1) setStato(`Salvo le immagini: pagina ${n} di ${pdf.numPages}…`);
        await salvaImmagine(d.id, n, await immaginePagina(pdf, n));
      }
      await pdf.cleanup();
      await segnaConImmagini(d.id);
      setStato("✅ Immagini salvate");
      router.refresh();
    } catch (err) {
      setStato(`❌ ${err instanceof Error ? err.message : "errore"}`);
    }
    setLavoro(false);
  }

  if (d.immagini) return <span className="text-sm text-white/50">🖼️ con immagini</span>;
  return (
    <span className="text-sm">
      <label className={`underline ${lavoro ? "text-white/40" : "cursor-pointer text-white/70"}`}>
        🖼️ Aggiungi immagini
        <input type="file" accept="application/pdf" className="hidden" disabled={lavoro} onChange={scelto} />
      </label>
      {stato && <span className="ml-2 text-white/60">{stato}</span>}
    </span>
  );
}

async function chiama(corpo: object) {
  const r = await fetch("/api/admin/manuali", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.errore || "errore");
  return j;
}

/** Valori da mostrare nel modulo: la proposta se c'è, altrimenti i dati attuali. */
function valoriIniziali(d: Doc): Proposta {
  const p = d.proposta;
  return {
    titolo: p?.titolo || d.titolo,
    categoria: p?.categoria || d.categoria || "",
    marca: p?.marca ?? d.marca ?? "",
    modelli: p?.modelli ?? d.modelli ?? "",
    tipo: p?.tipo || d.tipo,
  };
}

/** Un documento: in modifica (con la proposta) oppure già sistemato. */
export function SchedaDocumento({ d, inModifica = false }: { d: Doc; inModifica?: boolean }) {
  const router = useRouter();
  const [aperta, setAperta] = useState(inModifica);
  const [v, setV] = useState<Proposta>(valoriIniziali(d));
  const [stato, setStato] = useState("");
  const [lavoro, setLavoro] = useState(false);
  const cambia = (k: keyof Proposta) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value }));

  async function conferma() {
    setLavoro(true);
    setStato("Salvo…");
    try {
      await chiama({ azione: "conferma", documento_id: d.id, ...v });
      setStato("");
      setAperta(false);
      router.refresh();
    } catch (e) {
      setStato(`❌ ${e instanceof Error ? e.message : "errore"}`);
    }
    setLavoro(false);
  }

  async function riproponi() {
    setLavoro(true);
    setStato("L'assistente legge la copertina…");
    try {
      const { proposta } = await chiama({ azione: "proponi", documento_id: d.id });
      setV(proposta);
      setStato("Proposta pronta: controlla e conferma.");
    } catch (e) {
      setStato(`❌ ${e instanceof Error ? e.message : "errore"}`);
    }
    setLavoro(false);
  }

  if (!aperta) {
    return (
      <div className="scheda flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">
            {iconaCategoria(d.categoria)} {d.titolo}
          </div>
          <div className="text-sm text-white/50">
            {nomeCategoria(d.categoria)} · {d.marca || "marca ?"} {d.modelli ? `· ${d.modelli}` : ""} · {nomeTipo(d.tipo)} · {d.pagine} pag.
            {d.link_drive && (
              <>
                {" "}· <a className="underline" href={d.link_drive} target="_blank" rel="noreferrer">Drive</a>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button className="text-sm text-white/70 underline" onClick={() => setAperta(true)}>
            Modifica
          </button>
          <AggiungiImmagini d={d} />
        </div>
      </div>
    );
  }

  return (
    <div className="scheda flex flex-col gap-2">
      <div className="text-xs text-white/40">
        File: {d.titolo} · {d.pagine} pag.
        {d.proposta ? " · 🤖 proposta dell'assistente" : ""}
      </div>
      <input className="campo-input" value={v.titolo} onChange={cambia("titolo")} placeholder="Nome del manuale" />
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="campo-input" value={v.categoria} onChange={cambia("categoria")}>
          <option value="">Categoria…</option>
          {CATEGORIE.map((c) => (
            <option key={c.id} value={c.id}>{c.icona} {c.nome}</option>
          ))}
        </select>
        <select className="campo-input" value={v.tipo} onChange={cambia("tipo")}>
          {TIPI.map((t) => (
            <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </select>
        <input className="campo-input" list="marche-note" value={v.marca} onChange={cambia("marca")} placeholder="Marca" />
        <input className="campo-input" list={idElencoModelli(v.marca)} value={v.modelli} onChange={cambia("modelli")} placeholder="Modello" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="bottone" disabled={lavoro || !v.titolo.trim()} onClick={conferma}>
          ✓ Conferma
        </button>
        <button className="text-sm text-white/70 underline" disabled={lavoro} onClick={riproponi}>
          🤖 {d.proposta ? "Rifai la proposta" : "Fai la proposta"}
        </button>
        {d.confermato && (
          <button className="text-sm text-white/70 underline" disabled={lavoro} onClick={() => setAperta(false)}>
            Annulla
          </button>
        )}
        <form action={eliminaDocumento} className="ml-auto" onSubmit={(e) => { if (!confirm("Eliminare questo documento dall'assistente?")) e.preventDefault(); }}>
          <input type="hidden" name="id" value={d.id} />
          <button className="text-sm text-red-300">Elimina</button>
        </form>
      </div>
      {stato && <div className="text-sm text-white/70">{stato}</div>}
    </div>
  );
}

/** Riquadro "Da riordinare": prepara le proposte per tutti e permette di confermarle. */
export function DaRiordinare({ documenti }: { documenti: Doc[] }) {
  const router = useRouter();
  const [stato, setStato] = useState("");
  const [lavoro, setLavoro] = useState(false);
  const senzaProposta = documenti.filter((d) => !d.proposta);
  const pronte = documenti.filter((d) => d.proposta);

  async function preparaTutte() {
    setLavoro(true);
    let errori = 0;
    for (let i = 0; i < senzaProposta.length; i++) {
      setStato(`🤖 Leggo la copertina ${i + 1} di ${senzaProposta.length}: ${senzaProposta[i].titolo}`);
      try {
        await chiama({ azione: "proponi", documento_id: senzaProposta[i].id });
      } catch (e) {
        errori++;
        // se manca l'aggiornamento del database o il credito, inutile continuare
        const m = e instanceof Error ? e.message : "";
        if (/database|credito|chiave/i.test(m)) {
          setStato(`❌ ${m}`);
          setLavoro(false);
          return;
        }
      }
    }
    setStato(errori ? `Fatto, ma ${errori} non sono riuscite: riprova.` : "Proposte pronte: controllale qui sotto.");
    setLavoro(false);
    router.refresh();
  }

  async function confermaTutte() {
    if (!confirm(`Confermare così come sono le ${pronte.length} proposte dell'assistente?`)) return;
    setLavoro(true);
    for (let i = 0; i < pronte.length; i++) {
      setStato(`Salvo ${i + 1} di ${pronte.length}…`);
      const d = pronte[i];
      try {
        await chiama({ azione: "conferma", documento_id: d.id, ...valoriIniziali(d) });
      } catch {
        // resta nella lista: si può confermare a mano
      }
    }
    setStato("");
    setLavoro(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="scheda">
        <h2 className="font-semibold">Da riordinare ({documenti.length})</h2>
        <p className="mt-1 text-sm text-white/60">
          L&apos;assistente legge la copertina di ogni manuale e propone nome, categoria, marca e modello. Niente cambia finché non premi
          «Conferma».
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {senzaProposta.length > 0 && (
            <button className="bottone" disabled={lavoro} onClick={preparaTutte}>
              🤖 Prepara le proposte ({senzaProposta.length})
            </button>
          )}
          {pronte.length > 1 && (
            <button className="rounded-full bg-white/10 px-4 py-2 text-sm" disabled={lavoro} onClick={confermaTutte}>
              ✓ Conferma tutte le {pronte.length} proposte
            </button>
          )}
        </div>
        {stato && <div className="mt-2 text-sm text-white/70">{stato}</div>}
      </div>
      {documenti.map((d) => (
        <SchedaDocumento key={`${d.id}-${d.proposta ? "p" : "n"}`} d={d} inModifica />
      ))}
    </div>
  );
}
