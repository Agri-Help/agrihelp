import type Anthropic from "@anthropic-ai/sdk";
import { clienteAnthropic } from "./assistente";
import { supabaseAdmin } from "./supabase/server";

const MODELLO = (process.env.CLAUDE_MODEL || "").trim() || "claude-opus-5-5";

export type BozzaEsperienza = { titolo: string; marca: string; modelli: string; testo: string };

const STRUMENTO: Anthropic.Tool = {
  name: "bozza_esperienza",
  description: "Registra la bozza della nota di esperienza ricavata dal caso.",
  input_schema: {
    type: "object",
    properties: {
      titolo: {
        type: "string",
        description: "Titolo breve e cercabile: macchina + sintomo, es. 'X6.135: sterzo automatico non si inserisce dopo cambio ruote'. Max 90 caratteri.",
      },
      marca: { type: "string", description: "Marca della macchina o del sistema. Vuoto se non si capisce." },
      modelli: { type: "string", description: "Modello o modelli (separati da virgola). Vuoto se non si capisce." },
      testo: {
        type: "string",
        description:
          "Nota in italiano semplice, come il tecnico la spiegherebbe a un cliente, con queste righe: 'Sintomo:', 'Causa:', 'Soluzione:' (passi numerati se servono) ed eventualmente 'Da sapere:'. Solo fatti emersi nella conversazione.",
      },
    },
    required: ["titolo", "marca", "modelli", "testo"],
  },
};

const ETICHETTA: Record<string, string> = { cliente: "CLIENTE", assistente: "ASSISTENTE AI", tecnico: "TECNICO", sistema: "NOTA" };

/** Legge il caso (chat + motivo del passaggio al tecnico) e propone una bozza di esperienza. Non salva nulla. */
export async function riassumiCaso(conversazioneId: string): Promise<BozzaEsperienza> {
  const sb = supabaseAdmin();
  const { data: c, error } = await sb
    .from("conversazioni")
    .select("titolo, motivo_tecnico, macchine(marca,modello,guida_satellitare)")
    .eq("id", conversazioneId)
    .maybeSingle();
  if (error || !c) throw new Error(error?.message || "Caso non trovato");
  const { data: msg } = await sb.from("messaggi").select("ruolo, testo, foto").eq("conversazione_id", conversazioneId).order("creato_il");
  const m = c.macchine as unknown as { marca: string; modello: string; guida_satellitare: string | null } | null;

  let chat = (msg || [])
    .map((x) => `[${ETICHETTA[x.ruolo] || x.ruolo}] ${String(x.testo || "").slice(0, 3000)}${x.foto?.length ? ` (con ${x.foto.length} foto)` : ""}`)
    .join("\n\n");
  // tengo l'inizio e la fine se la conversazione è molto lunga: la soluzione di solito è in fondo
  if (chat.length > 40000) chat = chat.slice(0, 12000) + "\n\n[...]\n\n" + chat.slice(-28000);

  const risposta = await clienteAnthropic().messages.create({
    model: MODELLO,
    max_tokens: 1500,
    tools: [STRUMENTO],
    tool_choice: { type: "tool", name: STRUMENTO.name },
    messages: [
      {
        role: "user",
        content:
          `Sei l'aiutante di un tecnico di macchine agricole e guide satellitari. Dal caso qui sotto prepara una nota per il suo archivio "esperienza", che l'assistente userà per i prossimi casi simili.\n` +
          `Regole:\n` +
          `- Le parole del TECNICO valgono più di quelle dell'ASSISTENTE AI: se il tecnico ha corretto o completato l'AI, usa la versione del tecnico.\n` +
          `- Scrivi solo quello che è emerso davvero. Non inventare codici, valori, coppie di serraggio o procedure. Se la soluzione non è chiara, scrivi 'Soluzione: da completare' e indica cosa manca.\n` +
          `- Niente nomi, telefoni o dati del cliente: la nota deve valere per tutti.\n` +
          `- Frasi brevi, linguaggio da officina comprensibile a un cliente.\n\n` +
          `Titolo del caso: ${c.titolo || "-"}\n` +
          `Macchina del cliente: ${m ? `${m.marca} ${m.modello}${m.guida_satellitare ? ` · guida: ${m.guida_satellitare}` : ""}` : "non indicata"}\n` +
          (c.motivo_tecnico ? `Motivo del passaggio al tecnico:\n${c.motivo_tecnico}\n` : "") +
          `\nCONVERSAZIONE:\n${chat || "(vuota)"}`,
      },
    ],
  });

  const blocco = risposta.content.find((b) => b.type === "tool_use");
  if (!blocco || blocco.type !== "tool_use") throw new Error("Nessuna bozza ricevuta");
  const x = blocco.input as Record<string, unknown>;
  const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  return {
    titolo: str(x.titolo, 120) || c.titolo || "",
    marca: str(x.marca, 60) || m?.marca || "",
    modelli: str(x.modelli, 120) || m?.modello || "",
    testo: str(x.testo, 4000),
  };
}
