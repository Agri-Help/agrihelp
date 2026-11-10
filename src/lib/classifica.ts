import type Anthropic from "@anthropic-ai/sdk";
import { clienteAnthropic } from "./assistente";
import { CATEGORIE, ID_CATEGORIE, ID_TIPI, MODELLI_NOTI, TIPI, tipoMacchina, type Proposta } from "./categorie";
import { supabaseAdmin } from "./supabase/server";

const MODELLO = (process.env.CLAUDE_MODEL || "").trim() || "claude-opus-5-5";

const STRUMENTO: Anthropic.Tool = {
  name: "classifica_documento",
  description: "Registra nome, categoria, marca, modello e tipo del documento.",
  input_schema: {
    type: "object",
    properties: {
      titolo: {
        type: "string",
        description:
          "Nome chiaro del documento come appare nel titolo in copertina, es. 'Fendt 700 Vario Gen6 - Manuale d'uso' o 'Trimble GFX-750 - Guida all'installazione'. Max 90 caratteri.",
      },
      categoria: { type: "string", enum: ID_CATEGORIE, description: CATEGORIE.map((c) => `${c.id} = ${c.nome}`).join("; ") },
      marca: { type: "string", description: "Marca della macchina o del sistema (es. Fendt, John Deere, Manitou, Trimble). Vuoto se non si capisce." },
      modelli: { type: "string", description: "Modello o serie (es. '724 Vario', 'MT 1440', 'GFX-750'). Vuoto se non si capisce." },
      tipo: { type: "string", enum: ID_TIPI, description: TIPI.map((t) => `${t.id} = ${t.nome}`).join("; ") },
    },
    required: ["titolo", "categoria", "marca", "modelli", "tipo"],
  },
};

/** Legge le prime pagine del documento e chiede all'assistente nome, categoria, marca, modello e tipo. */
export async function proponiClassificazione(documentoId: string): Promise<Proposta> {
  const sb = supabaseAdmin();
  const { data: doc, error } = await sb.from("documenti").select("id, titolo, tipo, marca, modelli, pagine").eq("id", documentoId).single();
  if (error || !doc) throw new Error(error?.message || "Documento non trovato");
  const { data: brani } = await sb
    .from("brani")
    .select("pagina, testo")
    .eq("documento_id", documentoId)
    .order("pagina")
    .limit(4);
  const testo = (brani || [])
    .map((b) => `--- pagina ${b.pagina} ---\n${b.testo.slice(0, 1800)}`)
    .join("\n")
    .slice(0, 6000);

  const risposta = await clienteAnthropic().messages.create({
    model: MODELLO,
    max_tokens: 1000,
    tools: [STRUMENTO],
    tool_choice: { type: "tool", name: STRUMENTO.name },
    messages: [
      {
        role: "user",
        content:
          `Sei l'archivista di un tecnico di macchine agricole e guide satellitari. Classifica questo documento usando il titolo nella copertina e le prime pagine.\n` +
          `Il nome del file può essere sbagliato o senza senso: fidati del testo. Il manuale di un sistema GPS, display, sterzo automatico o ISOBUS va in "guida" anche se è montato su un trattore. Seminatrici, irroratrici, presse, rotopresse, falciacondizionatrici, andanatori, erpici, livelle, benne e simili vanno in "attrezzature"; telescopici, pale gommate e pale compatte in "telescopici".\n` +
          `Modelli venduti dal tecnico (se il documento riguarda uno di questi, scrivi marca e modello esattamente così; se vale per più modelli separali con una virgola):\n` +
          Object.entries(MODELLI_NOTI).map(([m, l]) => `${m}: ${l.map((x) => `${x} (${tipoMacchina(m, x)})`).join(", ")}`).join("\n") +
          `\n\n` +
          `Nome del file: ${doc.titolo}\nPagine: ${doc.pagine}\nDati già inseriti: tipo=${doc.tipo}, marca=${doc.marca || "-"}, modelli=${doc.modelli || "-"}\n\n` +
          (testo || "(nessun testo leggibile nelle prime pagine)"),
      },
    ],
  });

  const blocco = risposta.content.find((b) => b.type === "tool_use");
  if (!blocco || blocco.type !== "tool_use") throw new Error("Nessuna proposta ricevuta");
  const x = blocco.input as Record<string, unknown>;
  const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const proposta: Proposta = {
    titolo: str(x.titolo, 120) || doc.titolo,
    categoria: ID_CATEGORIE.includes(String(x.categoria)) ? String(x.categoria) : "altro",
    marca: str(x.marca, 60) || doc.marca || "",
    modelli: str(x.modelli, 120) || doc.modelli || "",
    tipo: ID_TIPI.includes(String(x.tipo)) ? String(x.tipo) : doc.tipo,
  };

  // salva solo la proposta: i dati veri cambiano quando il tecnico conferma
  const { error: e2 } = await sb.from("documenti").update({ proposta }).eq("id", documentoId);
  if (e2) throw new Error(e2.message);
  return proposta;
}
