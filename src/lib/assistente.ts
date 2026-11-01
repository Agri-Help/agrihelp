import Anthropic from "@anthropic-ai/sdk";
import { leggiIstruzioni } from "@/lib/istruzioni";
import { supabaseAdmin } from "./supabase/server";
import type { Fonte, Macchina, Messaggio, Profilo } from "./tipi";
import { nomeMacchina } from "./tipi";

const MODELLO = (process.env.CLAUDE_MODEL || "").trim() || "claude-opus-5-5";

/** Chiave Anthropic ripulita (spazi, virgolette, "NOME=" incollati per sbaglio). */
export function chiaveAnthropic(): string {
  return (process.env.ANTHROPIC_API_KEY ?? "")
    .trim()
    .replace(/^[A-Z_]+\s*=\s*/, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
}

export function clienteAnthropic() {
  return new Anthropic({ apiKey: chiaveAnthropic() });
}

/** Spiega in italiano un errore di Anthropic (per il tecnico e la pagina di controllo). */
export function spiegaErroreAnthropic(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const stato = (e as { status?: number })?.status;
  if (stato === 401 || /api.key|authentication/i.test(msg)) return "chiave Anthropic non valida (ANTHROPIC_API_KEY)";
  if (/credit balance|billing|purchase credits/i.test(msg)) return "credito Anthropic esaurito: ricarica su console.anthropic.com → Billing";
  if (stato === 403) return "la chiave Anthropic non ha i permessi";
  if (stato === 429) return "troppe richieste o limite di spesa raggiunto su Anthropic";
  if (stato === 529 || stato === 503) return "Anthropic è sovraccarico, riprova tra poco";
  return `${stato ?? ""} ${msg}`.trim().slice(0, 300);
}
const NOME_TECNICO = process.env.NOME_TECNICO || "il tecnico";

const ISTRUZIONI = `Sei l'assistente di AgriHelp, il servizio di assistenza tecnica di ${NOME_TECNICO}, tecnico specializzato in guide satellitari (GPS/RTK, sterzo automatico, display, ISOBUS) e macchine agricole (trattori e attrezzi).
Chi ti scrive è un agricoltore cliente o un collega tecnico, spesso in campo, con le mani sporche e poco tempo. Ti parla come se fosse al telefono.

COME RISPONDI
- Sempre in italiano semplice, frasi corte, tono cordiale e pratico, come un tecnico esperto al telefono.
- Prima capisci il problema: se mancano informazioni importanti (quale macchina, cosa vede sul display, codice errore, quando succede, cosa ha già provato) fai UNA o DUE domande mirate, non un elenco lungo.
- Quando hai abbastanza informazioni, dai passi numerati e concreti da fare subito, dal più semplice al più complesso.
- Se è utile, chiedi una foto (del display, del codice errore, del connettore, della targhetta).
- Guarda con attenzione le foto che ricevi e di' cosa vedi.
- Ricorda la sicurezza quando serve: motore spento, freno di stazionamento, PTO disinserita, attenzione all'idraulica in pressione.

USA I MANUALI E L'ESPERIENZA
- Prima di dare indicazioni tecniche specifiche usa lo strumento cerca_manuali, con parole chiave precise (marca, modello, codice errore, componente). Puoi cercare più volte con parole diverse.
- Hai l'elenco dei documenti caricati qui sotto. Se l'utente nomina un manuale o un sistema (es. PSM), o sai quale documento è quello giusto, usa leggi_documento su quel documento: cerca dentro e poi leggi le pagine utili. Per una procedura lunga (installazione, configurazione, calibrazione) leggi le pagine in ordine e guida l'utente un passo alla volta.
- Non dire mai che un'informazione "non c'è" se non hai prima cercato dentro il documento giusto con leggi_documento.
- Per i CODICI ERRORE (es. SPN 204 FMI 14, E-0123, 523312.04, DTC P0101) usa prima cerca_codice, passando più scritture dello stesso codice, perché i manuali li scrivono in modi diversi: per SPN 204 FMI 14 prova per esempio "SPN 204", "204-14", "204.14", "204 14", "000204". Poi, se serve, cerca_manuali con il nome del componente.
- Se trovi l'informazione, citala così: (📖 Titolo del documento, pag. N). Riporta al massimo una o due frasi brevi del manuale: non copiare mai pagine intere.
- Le note "esperienza" sono soluzioni reali di ${NOME_TECNICO}: hanno la precedenza sul manuale generico.
- Se non trovi nulla, dillo con onestà e ragiona dall'esperienza generale, senza inventare codici, valori, coppie di serraggio o procedure.

QUANDO PASSARE AL TECNICO
Usa lo strumento passa_al_tecnico quando:
- il cliente lo chiede, o è arrabbiato/fermo in campo con urgenza;
- serve un intervento sul posto, una riparazione, un ricambio, una licenza/sblocco o un aggiornamento software da fare in officina;
- dopo due o tre tentativi il problema non si risolve;
- c'è un rischio per la sicurezza o di danni costosi;
- non sei sicuro della risposta.
Dopo averlo usato, di' al cliente che ${NOME_TECNICO} è stato avvisato e lo ricontatterà, e cosa può fare nel frattempo in sicurezza.

Non parlare di gettoni, prezzi o di come funzioni tu: se lo chiedono, rispondi che per queste cose possono sentire direttamente ${NOME_TECNICO}.`;

const STRUMENTI: Anthropic.Beta.BetaTool[] = [
  {
    name: "cerca_codice",
    description:
      "Cerca un codice errore (o un codice ricambio, una sigla) scritto esattamente così nei manuali e nelle note del tecnico. Restituisce il testo intorno al punto in cui compare, con titolo e pagina. Passa più scritture dello stesso codice.",
    input_schema: {
      type: "object",
      properties: {
        varianti: {
          type: "array",
          items: { type: "string" },
          description: "Scritture diverse dello stesso codice, es. ['SPN 204', '204-14', '204.14', '204 14']",
        },
      },
      required: ["varianti"],
      additionalProperties: false,
    },
  },
  {
    name: "cerca_manuali",
    description:
      "Cerca nei manuali, nei bollettini tecnici e nelle note di esperienza del tecnico. Restituisce brevi estratti con titolo e pagina. Usa parole chiave: marca, modello, codice errore, nome del componente o del menu.",
    input_schema: {
      type: "object",
      properties: {
        parole_chiave: { type: "string", description: "Parole chiave separate da spazio, es. 'Fendt 724 errore sterzo AutoGuide calibrazione'" },
        marca: { type: "string", description: "Marca della macchina o del sistema, se nota (es. Fendt, John Deere, Trimble)" },
      },
      required: ["parole_chiave"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "leggi_documento",
    description:
      "Lavora dentro UN documento preciso dell'elenco (es. il manuale del PSM). Con 'cerca' trova le pagine di quel documento che parlano dell'argomento; senza 'cerca' legge le pagine indicate. Usalo quando l'utente nomina un manuale, quando sai quale documento è giusto, o per seguire una procedura pagina dopo pagina.",
    input_schema: {
      type: "object",
      properties: {
        documento: { type: "string", description: "Titolo (o parte del titolo) del documento, come nell'elenco dei documenti disponibili" },
        cerca: { type: "string", description: "Parole da cercare dentro il documento (facoltativo)" },
        pagina_da: { type: "integer", description: "Prima pagina da leggere (facoltativo)" },
        pagina_a: { type: "integer", description: "Ultima pagina da leggere, al massimo 5 pagine per volta (facoltativo)" },
      },
      required: ["documento"],
      additionalProperties: false,
    },
  },
  {
    name: "passa_al_tecnico",
    description:
      "Passa il caso al tecnico umano, che riceverà un avviso e ricontatterà il cliente. Da usare per casi difficili, urgenti, che richiedono un intervento o su richiesta del cliente.",
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string", description: "Perché serve il tecnico, in una frase" },
        riepilogo: { type: "string", description: "Riepilogo per il tecnico: macchina, sintomo, codici, cosa è già stato provato" },
        urgente: { type: "boolean", description: "true se il cliente è fermo in campo o c'è un rischio" },
      },
      required: ["motivo", "riepilogo", "urgente"],
      additionalProperties: false,
    },
    strict: true,
  },
];

type RisultatoAssistente = { testo: string; fonti: Fonte[]; passataAlTecnico: boolean };

function descriviCliente(p: Profilo, macchine: Macchina[], macchinaScelta: Macchina | null) {
  const righe = [
    `Chi scrive: ${p.nome || p.email}${p.azienda ? ` (${p.azienda})` : ""}, ${p.ruolo === "collega" ? "collega tecnico" : "cliente"}.`,
  ];
  if (macchine.length) {
    righe.push("Le sue macchine registrate:");
    for (const m of macchine) {
      righe.push(
        `- ${m.tipo} ${nomeMacchina(m)}${m.matricola ? `, matricola ${m.matricola}` : ""}${m.guida_satellitare ? `, guida: ${m.guida_satellitare}` : ""}${m.note ? `, note: ${m.note}` : ""}`,
      );
    }
  } else {
    righe.push("Non ha macchine registrate: se serve, chiedi marca e modello.");
  }
  if (macchinaScelta) righe.push(`In questa conversazione parla di: ${nomeMacchina(macchinaScelta)}.`);
  return righe.join("\n");
}

async function cercaManuali(parole: string, marca: string | null) {
  const sb = supabaseAdmin();
  const { data, error } = await sb.rpc("cerca_conoscenza", { p_parole: parole, p_marca: marca, p_limite: 8 });
  if (error) return { testo: `Errore nella ricerca: ${error.message}`, fonti: [] as Fonte[] };
  const righe = (data || []) as {
    fonte: "manuale" | "esperienza";
    titolo: string;
    tipo: string;
    pagina: number | null;
    link_drive: string | null;
    testo: string;
  }[];
  if (!righe.length) return { testo: "Nessun risultato. Prova con altre parole chiave (sinonimi, codice, componente).", fonti: [] };
  const fonti: Fonte[] = righe.map((r) => ({ fonte: r.fonte, titolo: r.titolo, pagina: r.pagina, link_drive: r.link_drive }));
  const testo = righe
    .map((r, i) => {
      const termini = parole.split(/\s+/).filter((t) => /\d/.test(t) && t.length >= 2).concat(parole.split(/\s+/).filter((t) => t.length >= 5));
      const estratto = estrattoIntorno(r.testo, termini);
      const dove = r.fonte === "esperienza" ? "ESPERIENZA DEL TECNICO" : `${r.tipo.toUpperCase()} — pag. ${r.pagina}`;
      return `[${i + 1}] ${r.titolo} (${dove})\n${estratto}`;
    })
    .join("\n\n");
  return { testo, fonti };
}

/** Pezzo di testo intorno al primo punto in cui compare uno dei termini. */
function estrattoIntorno(testo: string, termini: string[], ampiezza = 700): string {
  const basso = testo.toLowerCase();
  let pos = -1;
  for (const t of termini) {
    const pezzi = t.toLowerCase().split(/[\s.\-_/:]+/).filter(Boolean);
    if (!pezzi.length) continue;
    const re = new RegExp(pezzi.map((x) => x.replace(/[*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s.\\-_/:]*"));
    const m = re.exec(basso);
    if (m) {
      pos = m.index;
      break;
    }
  }
  if (pos < 0) return testo.length > 1500 ? testo.slice(0, 1500) + "…" : testo;
  const da = Math.max(0, pos - ampiezza);
  const a = Math.min(testo.length, pos + ampiezza);
  return (da > 0 ? "…" : "") + testo.slice(da, a) + (a < testo.length ? "…" : "");
}

/** Ricerca esatta di codici errore / sigle (anche con separatori diversi). */
async function cercaCodice(varianti: string[]) {
  const sb = supabaseAdmin();
  const pulite = Array.from(
    new Set(
      varianti
        .map((v) => v.replace(/[^\p{L}\p{N} .\-_/]/gu, "").trim())
        .filter((v) => v.replace(/\D/g, "").length >= 2 || v.length >= 4),
    ),
  ).slice(0, 8);
  if (!pulite.length) return { testo: "Codice non valido: passa il codice con almeno qualche cifra.", fonti: [] as Fonte[] };
  // spazi e separatori diventano "qualsiasi cosa breve" (es. 204 14 trova 204-14, 204.14, 204/14)
  const filtro = (col: string) => pulite.map((v) => `${col}.ilike.%${v.replace(/[\s.\-_/]+/g, "_")}%`).join(",");
  const [manuali, esperienze] = await Promise.all([
    sb.from("brani").select("pagina, testo, documenti(titolo, tipo, link_drive)").or(filtro("testo")).limit(8),
    sb.from("esperienze").select("titolo, testo").or(`${filtro("testo")},${filtro("titolo")}`).limit(4),
  ]);
  const err = manuali.error || esperienze.error;
  if (err) return { testo: `Errore nella ricerca: ${err.message}`, fonti: [] as Fonte[] };

  type Riga = { fonte: "manuale" | "esperienza"; titolo: string; tipo: string; pagina: number | null; link_drive: string | null; testo: string };
  const righe: Riga[] = [
    ...(esperienze.data || []).map((e) => ({ fonte: "esperienza" as const, titolo: e.titolo, tipo: "esperienza", pagina: null, link_drive: null, testo: e.testo })),
    ...(manuali.data || []).map((b) => {
      const d = (Array.isArray(b.documenti) ? b.documenti[0] : b.documenti) as { titolo: string; tipo: string; link_drive: string | null } | null;
      return { fonte: "manuale" as const, titolo: d?.titolo || "Documento", tipo: d?.tipo || "manuale", pagina: b.pagina, link_drive: d?.link_drive || null, testo: b.testo };
    }),
  ];
  if (!righe.length) return { testo: `Nessuna pagina contiene ${pulite.join(" / ")}. Prova altre scritture del codice, oppure cerca_manuali con il nome del componente.`, fonti: [] as Fonte[] };
  const fonti: Fonte[] = righe.map((r) => ({ fonte: r.fonte, titolo: r.titolo, pagina: r.pagina, link_drive: r.link_drive }));
  const testo = righe
    .map((r, i) => {
      const dove = r.fonte === "esperienza" ? "ESPERIENZA DEL TECNICO" : `${r.tipo.toUpperCase()} — pag. ${r.pagina}`;
      return `[${i + 1}] ${r.titolo} (${dove})\n${estrattoIntorno(r.testo, pulite)}`;
    })
    .join("\n\n");
  return { testo, fonti };
}

type Documento = { id: string; titolo: string; tipo: string; marca: string | null; modelli: string | null; pagine: number; link_drive: string | null };

async function elencoDocumenti(): Promise<Documento[]> {
  const { data } = await supabaseAdmin()
    .from("documenti")
    .select("id, titolo, tipo, marca, modelli, pagine, link_drive")
    .order("titolo")
    .limit(300);
  return (data || []) as Documento[];
}

function descriviDocumenti(docs: Documento[]): string {
  if (!docs.length) return "DOCUMENTI DISPONIBILI: nessuno caricato per ora.";
  return (
    "DOCUMENTI DISPONIBILI (usa il titolo con leggi_documento):\n" +
    docs.map((d) => `- ${d.titolo} [${d.tipo}${d.marca ? `, ${d.marca}` : ""}${d.modelli ? `, ${d.modelli}` : ""}, ${d.pagine} pag.]`).join("\n")
  );
}

/** Trova il documento giusto dal titolo (anche parziale, senza badare a maiuscole e simboli). */
function trovaDocumento(docs: Documento[], nome: string): Documento | null {
  const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const n = norm(nome);
  if (!n) return null;
  const esatto = docs.find((d) => norm(d.titolo) === n);
  if (esatto) return esatto;
  const contiene = docs.filter((d) => norm(d.titolo).includes(n) || n.includes(norm(d.titolo)));
  if (contiene.length) return contiene[0];
  // per parole: il documento con più parole in comune
  const parole = n.split(" ").filter((p) => p.length >= 2);
  let migliore: Documento | null = null;
  let punti = 0;
  for (const d of docs) {
    const t = ` ${norm(d.titolo)} ${norm(d.modelli || "")} `;
    const p = parole.filter((w) => t.includes(` ${w} `) || t.includes(w)).length;
    if (p > punti) {
      punti = p;
      migliore = d;
    }
  }
  return migliore;
}

async function leggiDocumento(docs: Documento[], input: Record<string, unknown>) {
  const doc = trovaDocumento(docs, String(input.documento || ""));
  if (!doc) return { testo: `Documento non trovato. Documenti disponibili:\n${docs.map((d) => d.titolo).join("\n")}`, fonti: [] as Fonte[] };
  const sb = supabaseAdmin();
  const cerca = String(input.cerca || "").trim();
  const fonte = (pagina: number): Fonte => ({ fonte: "manuale", titolo: doc.titolo, pagina, link_drive: doc.link_drive });

  if (cerca) {
    const vuote = new Set(["il", "lo", "la", "le", "gli", "un", "una", "di", "da", "del", "della", "dei", "delle", "per", "con", "come", "che", "non", "sul", "sulla", "nel", "nella", "the", "and", "for", "with", "how", "to", "of", "in", "on", "is"]);
    const parole = Array.from(
      new Set(cerca.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => (w.length >= 3 || /\d/.test(w)) && !vuote.has(w))),
    ).slice(0, 10);
    if (!parole.length) return { testo: "Scrivi qualche parola da cercare.", fonti: [] as Fonte[] };
    const cercaCon = (sep: string) =>
      sb
        .from("brani")
        .select("pagina, testo")
        .eq("documento_id", doc.id)
        .textSearch("tsv", parole.map((w) => `${w}:*`).join(sep), { config: "simple" })
        .limit(300);
    // prima le pagine con tutte le parole, se sono poche quelle con almeno una
    let { data, error } = await cercaCon(" & ");
    if (!error && (data?.length ?? 0) < 3 && parole.length > 1) ({ data, error } = await cercaCon(" | "));
    if (error) return { testo: `Errore nella ricerca: ${error.message}`, fonti: [] as Fonte[] };
    // ordina per quante parole diverse compaiono nella pagina, poi per quante volte
    const punteggio = (t: string) => {
      const b = t.toLowerCase();
      let diverse = 0;
      let volte = 0;
      for (const w of parole) {
        const c = b.split(w).length - 1;
        if (c) diverse++;
        volte += Math.min(c, 10);
      }
      return diverse * 100 + volte;
    };
    const migliori = (data || []).map((r) => ({ ...r, p: punteggio(r.testo) })).sort((a, b) => b.p - a.p).slice(0, 6);
    if (!migliori.length) return { testo: `In "${doc.titolo}" nessuna pagina contiene: ${parole.join(", ")}. Prova sinonimi o termini inglesi (i manuali sono spesso in inglese).`, fonti: [] as Fonte[] };
    return {
      testo:
        `Documento: ${doc.titolo} (${doc.pagine} pagine). Pagine più pertinenti:\n\n` +
        migliori.map((r) => `--- pag. ${r.pagina} ---\n${estrattoIntorno(r.testo, parole, 900)}`).join("\n\n") +
        "\n\nPer leggere una pagina intera (o le successive) usa leggi_documento con pagina_da/pagina_a.",
      fonti: migliori.map((r) => fonte(r.pagina)),
    };
  }

  const da = Math.max(1, Number(input.pagina_da) || 1);
  const a = Math.min(da + 4, Number(input.pagina_a) || da + 2, doc.pagine || da + 4);
  const { data, error } = await sb.from("brani").select("pagina, testo").eq("documento_id", doc.id).gte("pagina", da).lte("pagina", a).order("pagina");
  if (error) return { testo: `Errore nella lettura: ${error.message}`, fonti: [] as Fonte[] };
  if (!data?.length) return { testo: `Nessun testo nelle pagine ${da}-${a} di "${doc.titolo}" (il documento ha ${doc.pagine} pagine).`, fonti: [] as Fonte[] };
  return {
    testo:
      `Documento: ${doc.titolo} (${doc.pagine} pagine)\n\n` +
      data.map((r) => `--- pag. ${r.pagina} ---\n${r.testo.length > 4000 ? r.testo.slice(0, 4000) + "…" : r.testo}`).join("\n\n"),
    fonti: data.map((r) => fonte(r.pagina)),
  };
}

/** Converte la cronologia salvata nel formato dei messaggi per Claude. */
async function costruisciCronologia(messaggi: Messaggio[]): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const sb = supabaseAdmin();
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  // Solo le foto degli ultimi 3 messaggi del cliente vengono rimandate, per contenere i costi
  const conFoto = new Set(messaggi.filter((m) => m.ruolo === "cliente" && m.foto.length).slice(-3).map((m) => m.id));

  for (const m of messaggi) {
    if (m.ruolo === "sistema") continue;
    if (m.ruolo === "assistente") {
      out.push({ role: "assistant", content: m.testo || "…" });
      continue;
    }
    const blocchi: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (conFoto.has(m.id)) {
      for (const percorso of m.foto) {
        const { data } = await sb.storage.from("foto").download(percorso);
        if (data) {
          const b64 = Buffer.from(await data.arrayBuffer()).toString("base64");
          blocchi.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } });
        }
      }
    } else if (m.foto.length) {
      blocchi.push({ type: "text", text: `[${m.foto.length} foto inviata/e in precedenza]` });
    }
    const prefisso = m.ruolo === "tecnico" ? `[Messaggio di ${NOME_TECNICO}, il tecnico] ` : "";
    blocchi.push({ type: "text", text: prefisso + (m.testo || (m.foto.length ? "Guarda la foto." : "…")) });
    // i messaggi consecutivi dello stesso ruolo vengono uniti
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.role === "user" && Array.isArray(ultimo.content)) {
      (ultimo.content as Anthropic.Beta.BetaContentBlockParam[]).push(...blocchi);
    } else {
      out.push({ role: "user", content: blocchi });
    }
  }
  if (out[0]?.role === "assistant") out.shift();
  return out;
}

export async function rispondi(params: {
  profilo: Profilo;
  macchine: Macchina[];
  macchinaScelta: Macchina | null;
  messaggi: Messaggio[];
  conversazioneId: string;
}): Promise<RisultatoAssistente> {
  const client = clienteAnthropic();
  const cronologia = await costruisciCronologia(params.messaggi);
  const fonti: Fonte[] = [];
  let passataAlTecnico = false;

  const documenti = await elencoDocumenti();
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: ISTRUZIONI, cache_control: { type: "ephemeral" } },
    { type: "text", text: `ISTRUZIONI DI ${NOME_TECNICO.toUpperCase()} (valgono sempre, hanno la precedenza sulle tue conoscenze generali):\n${await leggiIstruzioni()}` },
    { type: "text", text: descriviDocumenti(documenti) },
    { type: "text", text: descriviCliente(params.profilo, params.macchine, params.macchinaScelta) },
  ];

  for (let giro = 0; giro < 10; giro++) {
    const base = { model: MODELLO, max_tokens: 16000, system, tools: STRUMENTI, messages: cronologia };
    let risposta: Anthropic.Beta.BetaMessage;
    try {
      risposta = await client.beta.messages.create({
        ...base,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
      } as Anthropic.Beta.MessageCreateParamsNonStreaming);
    } catch (e) {
      // richiesta rifiutata per i parametri opzionali: riprova con quelli essenziali
      if ((e as { status?: number })?.status !== 400 || /credit balance|billing/i.test(String(e))) throw e;
      console.error("Riprovo senza parametri opzionali", e);
      risposta = await client.beta.messages.create(base as Anthropic.Beta.MessageCreateParamsNonStreaming);
    }

    cronologia.push({ role: "assistant", content: risposta.content as Anthropic.Beta.BetaContentBlockParam[] });

    if (risposta.stop_reason === "refusal") {
      return {
        testo: "Su questa richiesta non posso aiutarti. Se vuoi, premi «Passa al tecnico» e ti ricontatta lui.",
        fonti,
        passataAlTecnico,
      };
    }

    const chiamate = risposta.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (risposta.stop_reason !== "tool_use" || !chiamate.length) {
      const testo = risposta.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { testo: testo || "Scusa, non ho capito bene. Puoi ripetere?", fonti: unicheFonti(fonti), passataAlTecnico };
    }

    const risultati: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const c of chiamate) {
      const input = c.input as Record<string, unknown>;
      if (c.name === "leggi_documento") {
        const r = await leggiDocumento(documenti, input);
        fonti.push(...r.fonti);
        risultati.push({ type: "tool_result", tool_use_id: c.id, content: r.testo });
      } else if (c.name === "cerca_codice") {
        const v = Array.isArray(input.varianti) ? (input.varianti as unknown[]).map(String) : [String(input.varianti || "")];
        const r = await cercaCodice(v);
        fonti.push(...r.fonti);
        risultati.push({ type: "tool_result", tool_use_id: c.id, content: r.testo });
      } else if (c.name === "cerca_manuali") {
        const r = await cercaManuali(String(input.parole_chiave || ""), (input.marca as string) || null);
        fonti.push(...r.fonti);
        risultati.push({ type: "tool_result", tool_use_id: c.id, content: r.testo });
      } else if (c.name === "passa_al_tecnico") {
        await passaAlTecnico(params.conversazioneId, String(input.motivo || ""), String(input.riepilogo || ""), Boolean(input.urgente), params.profilo);
        passataAlTecnico = true;
        risultati.push({ type: "tool_result", tool_use_id: c.id, content: "Fatto: il tecnico è stato avvisato." });
      } else {
        risultati.push({ type: "tool_result", tool_use_id: c.id, content: "Strumento sconosciuto", is_error: true });
      }
    }
    cronologia.push({ role: "user", content: risultati });
  }
  return { testo: "Ci sto mettendo troppo. Ti passo al tecnico che ti ricontatterà.", fonti: unicheFonti(fonti), passataAlTecnico };
}

function unicheFonti(fonti: Fonte[]) {
  const viste = new Set<string>();
  return fonti.filter((f) => {
    const k = `${f.titolo}|${f.pagina}`;
    if (viste.has(k)) return false;
    viste.add(k);
    return true;
  });
}

/** Segna la conversazione come "al tecnico" e manda un avviso (Telegram, se configurato). */
export async function passaAlTecnico(conversazioneId: string, motivo: string, riepilogo: string, urgente: boolean, profilo: Profilo) {
  const sb = supabaseAdmin();
  await sb
    .from("conversazioni")
    .update({
      stato: "al_tecnico",
      motivo_tecnico: `${urgente ? "URGENTE — " : ""}${motivo}${riepilogo ? `\n\n${riepilogo}` : ""}`,
      passata_il: new Date().toISOString(),
      letta_dal_tecnico: false,
    })
    .eq("id", conversazioneId);
  await avvisaTecnico(
    `${urgente ? "🚨 URGENTE\n" : ""}🧑‍🌾 ${profilo.nome || profilo.email}${profilo.telefono ? ` (${profilo.telefono})` : ""}\n${motivo}\n\n${riepilogo}`,
    conversazioneId,
  );
}

export async function avvisaTecnico(testo: string, conversazioneId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const sito = process.env.NEXT_PUBLIC_SITE_URL || "";
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: `${testo}\n\n${sito}/admin/conversazioni/${conversazioneId}`.slice(0, 4000) }),
    });
  } catch {
    // l'avviso non è indispensabile
  }
}

/** Titolo breve della conversazione, dal primo messaggio. */
export function titoloDa(testo: string) {
  const t = testo.replace(/\s+/g, " ").trim();
  if (!t) return "Richiesta con foto";
  return t.length > 60 ? t.slice(0, 57) + "…" : t;
}
