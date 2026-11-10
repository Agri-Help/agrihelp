"use client";

export type PdfJs = Awaited<ReturnType<typeof import("unpdf").getResolvedPDFJS>>;
type DocPdf = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;

export async function caricaPdfJs(): Promise<PdfJs> {
  const { getResolvedPDFJS } = await import("unpdf");
  return getResolvedPDFJS();
}

/**
 * Apre il PDF leggendo il file a pezzi (1 MB alla volta) invece di caricarlo tutto in memoria:
 * così funzionano anche manuali da centinaia di MB.
 */
export async function apriPdf(pdfjs: PdfJs, f: File): Promise<DocPdf> {
  const iniziale = new Uint8Array(await f.slice(0, Math.min(f.size, 1 << 20)).arrayBuffer());
  const trasporto = new pdfjs.PDFDataRangeTransport(f.size, iniziale);
  trasporto.requestDataRange = (inizio: number, fine: number) => {
    f.slice(inizio, fine)
      .arrayBuffer()
      .then((b) => trasporto.onDataRange(inizio, new Uint8Array(b)));
  };
  return pdfjs.getDocument({
    range: trasporto,
    rangeChunkSize: 1 << 20,
    disableAutoFetch: true,
    disableStream: true,
  }).promise;
}

/** Disegna una pagina e la restituisce come JPEG (base64), larga circa 1100 pixel. */
export async function immaginePagina(pdf: DocPdf, n: number): Promise<string> {
  const pagina = await pdf.getPage(n);
  const base = pagina.getViewport({ scale: 1 });
  const scala = Math.min(2.5, 1100 / Math.max(base.width, 1));
  const vista = pagina.getViewport({ scale: scala });
  const tela = document.createElement("canvas");
  tela.width = Math.round(vista.width);
  tela.height = Math.round(vista.height);
  const ctx = tela.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, tela.width, tela.height);
  await pagina.render({ canvasContext: ctx, viewport: vista, canvas: tela } as Parameters<typeof pagina.render>[0]).promise;
  pagina.cleanup();
  const dati = tela.toDataURL("image/jpeg", 0.7);
  tela.width = tela.height = 0;
  return dati.replace(/^data:image\/jpeg;base64,/, "");
}

/** Manda al server l'immagine di una pagina. */
export async function salvaImmagine(documentoId: string, pagina: number, dati: string) {
  const r = await fetch("/api/admin/manuali", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ azione: "immagine", documento_id: documentoId, pagina, dati }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).errore || "errore nel salvataggio dell'immagine");
}

export async function segnaConImmagini(documentoId: string) {
  const r = await fetch("/api/admin/manuali", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ azione: "con_immagini", documento_id: documentoId }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).errore || "errore");
}
