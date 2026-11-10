"use client";

export type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
type DocPdf = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;

/**
 * PDF.js completo (versione 6.4.299, "legacy" per i browser meno recenti) con un worker separato:
 * la pagina resta reattiva e le immagini JPEG2000/JBIG2 dei manuali si decodificano.
 * I file in /public/pdfjs vanno aggiornati insieme alla versione di pdfjs-dist.
 */
export async function caricaPdfJs(): Promise<PdfJs> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  return pdfjs;
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
    // decodificatori per immagini JPEG2000/JBIG2, font standard e mappe dei caratteri (copiati da pdfjs-dist 6.4.299)
    wasmUrl: "/pdfjs/wasm/",
    standardFontDataUrl: "/pdfjs/standard_fonts/",
    cMapUrl: "/pdfjs/cmaps/",
    cMapPacked: true,
  } as Parameters<PdfJs["getDocument"]>[0]).promise;
}

/** Rifiuta la promessa se non finisce entro "ms" millisecondi. */
function entro<T>(p: Promise<T>, ms: number, msg: string, annulla?: () => void): Promise<T> {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => {
      annulla?.();
      ko(new Error(msg));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(t);
        ok(v);
      },
      (e) => {
        clearTimeout(t);
        ko(e);
      },
    );
  });
}

/** Disegna una pagina e la restituisce come JPEG (base64), larga circa 1100 pixel. */
export async function immaginePagina(pdf: DocPdf, n: number): Promise<string> {
  const pagina = await entro(pdf.getPage(n), 30000, `pagina ${n}: non riesco ad aprirla`);
  const base = pagina.getViewport({ scale: 1 });
  const scala = Math.min(2.5, 1100 / Math.max(base.width, 1));
  const vista = pagina.getViewport({ scale: scala });
  const tela = document.createElement("canvas");
  tela.width = Math.round(vista.width);
  tela.height = Math.round(vista.height);
  const ctx = tela.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, tela.width, tela.height);
  const compito = pagina.render({ canvasContext: ctx, viewport: vista, canvas: tela } as Parameters<typeof pagina.render>[0]);
  try {
    await entro(compito.promise, 45000, `pagina ${n}: il disegno non finisce`, () => compito.cancel());
  } catch (e) {
    pagina.cleanup();
    tela.width = tela.height = 0;
    throw e;
  }
  pagina.cleanup();
  const dati = tela.toDataURL("image/jpeg", 0.7);
  tela.width = tela.height = 0;
  return dati.replace(/^data:image\/jpeg;base64,/, "");
}

/** Manda al server l'immagine di una pagina. */
export async function salvaImmagine(documentoId: string, pagina: number, dati: string) {
  const ferma = new AbortController();
  const t = setTimeout(() => ferma.abort(), 60000);
  const r = await fetch("/api/admin/manuali", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ azione: "immagine", documento_id: documentoId, pagina, dati }),
    signal: ferma.signal,
  })
    .catch((e) => {
      throw new Error(e?.name === "AbortError" ? `pagina ${pagina}: invio troppo lento` : `pagina ${pagina}: invio non riuscito`);
    })
    .finally(() => clearTimeout(t));
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

/**
 * Salva le immagini di tutte le pagine. Una pagina che non si riesce a disegnare viene saltata;
 * se falliscono le prime 5 di fila si ferma (vuol dire che il PDF non si disegna nel browser).
 */
export async function salvaTutteLeImmagini(
  pdf: DocPdf,
  documentoId: string,
  stato: (msg: string) => void,
): Promise<{ salvate: number; saltate: number[]; ultimoErrore: string }> {
  const totale = pdf.numPages;
  const saltate: number[] = [];
  let salvate = 0;
  let ultimoErrore = "";
  for (let n = 1; n <= totale; n++) {
    try {
      stato(`Immagini: disegno pagina ${n} di ${totale}…`);
      const dati = await immaginePagina(pdf, n);
      stato(`Immagini: invio pagina ${n} di ${totale}…`);
      await salvaImmagine(documentoId, n, dati);
      salvate++;
    } catch (e) {
      saltate.push(n);
      ultimoErrore = e instanceof Error ? e.message : String(e);
      console.error("Immagine pagina", n, e);
      if (salvate === 0 && saltate.length >= 5) break;
    }
  }
  if (salvate > 0) await segnaConImmagini(documentoId);
  return { salvate, saltate, ultimoErrore };
}

export function riassuntoImmagini(r: { salvate: number; saltate: number[]; ultimoErrore: string }): string {
  if (!r.salvate) return `❌ Immagini non salvate (${r.ultimoErrore || "errore"}). Il testo è salvato.`;
  if (!r.saltate.length) return `🖼️ ${r.salvate} immagini salvate`;
  const elenco = r.saltate.slice(0, 10).join(", ") + (r.saltate.length > 10 ? "…" : "");
  return `🖼️ ${r.salvate} immagini salvate, ${r.saltate.length} pagine saltate (${elenco})`;
}
