"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Stato = { nome: string; msg: string; ok?: boolean };

export default function CaricaManuali() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [tipo, setTipo] = useState("manuale");
  const [marca, setMarca] = useState("");
  const [modelli, setModelli] = useState("");
  const [link, setLink] = useState("");
  const [stati, setStati] = useState<Stato[]>([]);
  const [lavoro, setLavoro] = useState(false);

  const aggiorna = (i: number, s: Partial<Stato>) => setStati((p) => p.map((x, j) => (j === i ? { ...x, ...s } : x)));

  async function carica(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return;
    setLavoro(true);
    setStati(files.map((f) => ({ nome: f.name, msg: "In attesa" })));
    const { getDocumentProxy, extractText } = await import("unpdf");

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        aggiorna(i, { msg: "Leggo il PDF…" });
        const pdf = await getDocumentProxy(new Uint8Array(await f.arrayBuffer()));
        const { totalPages, text } = await extractText(pdf, { mergePages: false });
        const caratteri = text.reduce((a, t) => a + t.trim().length, 0);
        if (caratteri < totalPages * 30) {
          aggiorna(i, { msg: "⚠️ Sembra un PDF scansionato (solo immagini): non contiene testo da leggere. Serve una versione con testo.", ok: false });
          continue;
        }
        const crea = await fetch("/api/admin/manuali", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            azione: "crea",
            titolo: f.name.replace(/\.pdf$/i, "").replace(/[_]+/g, " "),
            tipo,
            marca,
            modelli,
            link_drive: files.length === 1 ? link : "",
            pagine: totalPages,
          }),
        });
        const { id, errore } = await crea.json();
        if (!id) throw new Error(errore || "errore");
        for (let p = 0; p < text.length; p += 25) {
          aggiorna(i, { msg: `Salvo pagine ${p + 1}–${Math.min(p + 25, text.length)} di ${text.length}…` });
          const r = await fetch("/api/admin/manuali", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              azione: "pagine",
              documento_id: id,
              pagine: text.slice(p, p + 25).map((t, k) => ({ pagina: p + k + 1, testo: t })),
            }),
          });
          if (!r.ok) throw new Error((await r.json()).errore || "errore nel salvataggio");
        }
        aggiorna(i, { msg: `✅ Fatto (${totalPages} pagine)`, ok: true });
      } catch (err) {
        aggiorna(i, { msg: `❌ ${err instanceof Error ? err.message : "Errore"}`, ok: false });
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
        <option value="manuale">Manuale</option>
        <option value="bollettino">Bollettino tecnico</option>
        <option value="schema">Schema elettrico/idraulico</option>
        <option value="altro">Altro</option>
      </select>
      <input className="campo-input" placeholder="Marca (es. Fendt, Trimble)" value={marca} onChange={(e) => setMarca(e.target.value)} />
      <input className="campo-input" placeholder="Modelli (es. 700 Vario Gen6)" value={modelli} onChange={(e) => setModelli(e.target.value)} />
      <input className="campo-input" placeholder="Link Google Drive (facoltativo)" value={link} onChange={(e) => setLink(e.target.value)} />
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
