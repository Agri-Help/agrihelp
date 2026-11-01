import React from "react";

/** Mostra il testo dell'assistente con elenchi e grassetti, senza HTML pericoloso. */
function inline(t: string, k: string) {
  const parti = t.split(/(\*\*[^*]+\*\*)/g);
  return parti.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={k + i}>{p.slice(2, -2)}</strong> : <React.Fragment key={k + i}>{p}</React.Fragment>,
  );
}

export function TestoAI({ testo }: { testo: string }) {
  const righe = testo.split("\n");
  const blocchi: React.ReactNode[] = [];
  let lista: { tipo: "ol" | "ul"; voci: string[] } | null = null;
  let paragrafo: string[] = [];

  const chiudiParagrafo = () => {
    if (paragrafo.length) {
      const k = "p" + blocchi.length;
      blocchi.push(<p key={k}>{paragrafo.flatMap((r, i) => (i ? [<br key={k + "b" + i} />, ...inline(r, k + i)] : inline(r, k + i)))}</p>);
      paragrafo = [];
    }
  };
  const chiudiLista = () => {
    if (lista) {
      const k = "l" + blocchi.length;
      const voci = lista.voci.map((v, i) => <li key={k + i}>{inline(v, k + i)}</li>);
      blocchi.push(lista.tipo === "ol" ? <ol key={k}>{voci}</ol> : <ul key={k}>{voci}</ul>);
      lista = null;
    }
  };

  for (const grezza of righe) {
    const r = grezza.trim();
    const num = r.match(/^\d+[.)]\s+(.*)$/);
    const punto = r.match(/^[-•*]\s+(.*)$/);
    const titolo = r.match(/^#{1,4}\s+(.*)$/);
    if (num || punto) {
      chiudiParagrafo();
      const tipo = num ? "ol" : "ul";
      if (lista && lista.tipo !== tipo) chiudiLista();
      if (!lista) lista = { tipo, voci: [] };
      lista.voci.push((num || punto)![1]);
    } else if (!r) {
      chiudiParagrafo();
      chiudiLista();
    } else {
      chiudiLista();
      paragrafo.push(titolo ? `**${titolo[1]}**` : r);
    }
  }
  chiudiParagrafo();
  chiudiLista();
  return <div className="testo-ai">{blocchi}</div>;
}
