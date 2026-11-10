"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIE, TIPI, idElencoModelli } from "@/lib/categorie";
import { apriPdf, caricaPdfJs, immaginePagina, salvaImmagine, segnaConImmagini } from "@/lib/pdfBrowser";

type Stato = { nome: string; msg: string; ok?: boolean };
export default function CaricaManuali() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [tipo, setTipo] = useState("manuale");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [modelli, setModelli] = useState("");
  const [link, setLink] = useState("");
  const [conImmagini, setConImmagini] = useState(false);
  const [stati, setStati] = useState<Stato[]>([]);
  const [lavoro, setLavoro] = useState(false);

  const aggiorna = (i: number, s: Partial<Stato>) => setStati((p) => p.map((x, j) => (j === i ? { ...x, ...s } : x)));

  async function carica(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return;
    setLavoro(true);
    setStati(files.map((f) => ({ nome: f.name, msg: "In attesa" })));
    const pdfjs = await caricaPdfJs();

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        aggiorna(i, { msg: "Apro il PDF…" });
        const pdf = await apriPdf(pdfjs, f);
        const totale = pdf.numPages;

        let id: string | null = null;
        let lotto: { pagina: number; testo: string }[] = [];
        let caratteri = 0;
        const salva = async () => {
          if (!lotto.length) return;
          const r = await fetch("/api/admin/manuali", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ azione: "pagine", documento_id: id, pagine: lotto }),
          });
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).errore || "errore nel salvataggio");
          lotto = [];
        };

        for (let n = 1; n <= totale; n++) {
          if (n % 5 === 1) aggiorna(i, { msg: `Leggo pagina ${n} di ${totale}…` });
          const pagina = await pdf.getPage(n);
          const contenuto = await pagina.getTextContent();
          const testo = contenuto.items
            .map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : ""))
            .join("")
            .replace(/[ \t]+/g, " ")
            .trim();
          pagina.cleanup();
          caratteri += testo.length;
          lotto.push({ pagina: n, testo });

          // dopo le prime pagine controlla che il PDF abbia testo, poi crea il documento
          if (!id && (n === Math.min(60, totale))) {
            if (caratteri < n * 30) {
              throw new Error("⚠️ Sembra un PDF scansionato (solo immagini): non contiene testo da leggere. Serve una versione con testo.");
            }
            const crea = await fetch("/api/admin/manuali", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                azione: "crea",
                titolo: f.name.replace(/\.pdf$/i, "").replace(/[_]+/g, " "),
                tipo,
                categoria,
                marca,
                modelli,
                link_drive: files.length === 1 ? link : "",
                pagine: totale,
              }),
            });
            const j = await crea.json();
            if (!j.id) throw new Error(j.errore || "errore");
            id = j.id;
          }
          if (id && lotto.length >= 25) {
            aggiorna(i, { msg: `Salvo fino a pagina ${n} di ${totale}…` });
            await salva();
          }
        }
        await salva();
        if (conImmagini && id) {
          for (let n = 1; n <= totale; n++) {
            if (n % 5 === 1) aggiorna(i, { msg: `Salvo le immagini: pagina ${n} di ${totale}…` });
            await salvaImmagine(id, n, await immaginePagina(pdf, n));
          }
          await segnaConImmagini(id);
        }
        await pdf.cleanup();
        aggiorna(i, { msg: `✅ Fatto (${totale} pagine). Preparo la proposta di nome e categoria…`, ok: true });
        const p = await fetch("/api/admin/manuali", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ azione: "proponi", documento_id: id }),
        }).catch(() => null);
        aggiorna(i, {
          msg: p?.ok
            ? `✅ Fatto (${totale} pagine). Controlla la proposta qui sotto e conferma.`
            : `✅ Fatto (${totale} pagine). Proposta automatica non riuscita: puoi riprovarla qui sotto.`,
        });
      } catch (err) {
        const m = err instanceof Error ? err.message : "Errore";
        aggiorna(i, { msg: m.startsWith("⚠️") ? m : `❌ ${m}`, ok: false });
      }
    }
    setLavoro(false);
    setFiles([]);
    router.refresh();
  }

  return (
    <form onSubmit={carica} className="mt-3 grid gap-2 sm:grid-cols-2">
      <input
        type="file"
        accept="application/pdf"
        multiple
        className="campo-input sm:col-span-2"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />
      <select className="campo-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        {TIPI.map((t) => (
          <option key={t.id} value={t.id}>{t.nome}</option>
        ))}
      </select>
      <select className="campo-input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
        <option value="">Categoria: la propone l&apos;assistente</option>
        {CATEGORIE.map((c) => (
          <option key={c.id} value={c.id}>{c.icona} {c.nome}</option>
        ))}
      </select>
      <input className="campo-input" list="marche-note" placeholder="Marca (facoltativa, es. Fendt, Trimble)" value={marca} onChange={(e) => setMarca(e.target.value)} />
      <input className="campo-input" list={idElencoModelli(marca)} placeholder="Modelli (facoltativi, es. 700 Vario Gen6)" value={modelli} onChange={(e) => setModelli(e.target.value)} />
      <input className="campo-input" placeholder="Link Google Drive (facoltativo)" value={link} onChange={(e) => setLink(e.target.value)} />
      <fieldset className="flex flex-col gap-1 text-sm sm:col-span-2">
        <label className="flex items-center gap-2">
          <input type="radio" name="contenuto" checked={!conImmagini} onChange={() => setConImmagini(false)} />
          Solo testo (veloce, occupa poco spazio)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="contenuto" checked={conImmagini} onChange={() => setConImmagini(true)} />
          Testo e immagini delle pagine (l&apos;assistente può mostrare disegni e procedure; più lento)
        </label>
      </fieldset>
      <button className="bottone sm:col-span-2" disabled={lavoro || !files.length}>
        {lavoro ? "Sto lavorando…" : `Indicizza ${files.length || ""} PDF`}
      </button>
      {stati.length > 0 && (
        <ul className="text-sm sm:col-span-2">
          {stati.map((s, i) => (
            <li key={i} className="border-t border-white/5 py-1">
              <b>{s.nome}</b>: <span className={s.ok === false ? "text-red-300" : "text-white/70"}>{s.msg}</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
