"use client";
import { useState, useTransition } from "react";
import { bozzaEsperienzaAI, salvaEsperienza } from "../../azioni";

export function FormEsperienza(props: { conversazioneId: string; titolo: string; marca: string; modelli: string }) {
  const [titolo, setTitolo] = useState(props.titolo);
  const [marca, setMarca] = useState(props.marca);
  const [modelli, setModelli] = useState(props.modelli);
  const [testo, setTesto] = useState("");
  const [avviso, setAvviso] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const riassumi = () => {
    if (testo.trim() && !confirm("Sostituire il testo che hai già scritto con il riepilogo dell'AI?")) return;
    setAvviso(null);
    avvia(async () => {
      const r = await bozzaEsperienzaAI(props.conversazioneId);
      if (!r.bozza) {
        setAvviso({ ok: false, testo: `Riepilogo non riuscito: ${r.errore || "errore sconosciuto"}` });
        return;
      }
      setTitolo(r.bozza.titolo);
      setMarca(r.bozza.marca);
      setModelli(r.bozza.modelli);
      setTesto(r.bozza.testo);
      setAvviso({ ok: true, testo: "Bozza pronta: rileggila, correggi quello che serve e poi premi Salva esperienza." });
    });
  };

  return (
    <form action={salvaEsperienza} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="torna" value={`/admin/conversazioni/${props.conversazioneId}`} />
      <button type="button" onClick={riassumi} disabled={inCorso} className="bottone-secondario self-start">
        {inCorso ? "⏳ Sto leggendo il caso…" : "✨ Riassumi con AI"}
      </button>
      <p className="text-xs text-slate-600">L&apos;AI legge la chat e le tue risposte e compila i campi. Non salva nulla da sola: decidi tu.</p>
      {avviso && <p className={`text-sm ${avviso.ok ? "text-green-700" : "text-red-700"}`}>{avviso.testo}</p>}
      <input name="titolo" className="campo-input" placeholder="Titolo (es. Fendt 724: errore sterzo dopo cambio ruote)" value={titolo} onChange={(e) => setTitolo(e.target.value)} required />
      <div className="grid grid-cols-2 gap-2">
        <input name="marca" list="marche-note" className="campo-input" placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
        <input name="modelli" list="modelli-noti" className="campo-input" placeholder="Modelli" value={modelli} onChange={(e) => setModelli(e.target.value)} />
      </div>
      <textarea name="testo" rows={testo ? 12 : 5} className="campo-input" placeholder="Causa e soluzione, come la spiegheresti a un cliente." value={testo} onChange={(e) => setTesto(e.target.value)} required />
      <button className="bottone self-end" disabled={inCorso}>Salva esperienza</button>
    </form>
  );
}
