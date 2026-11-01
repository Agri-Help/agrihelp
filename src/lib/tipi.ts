export type Ruolo = "cliente" | "collega" | "admin";

export type Profilo = {
  id: string;
  email: string;
  nome: string;
  telefono: string | null;
  azienda: string | null;
  ruolo: Ruolo;
  attivo: boolean;
  gettoni: number;
  note: string | null;
  creato_il: string;
};

export type Macchina = {
  id: string;
  cliente_id: string;
  tipo: string;
  marca: string;
  modello: string;
  anno: number | null;
  matricola: string | null;
  guida_satellitare: string | null;
  note: string | null;
};

export type Fonte = {
  fonte: "manuale" | "esperienza";
  titolo: string;
  pagina: number | null;
  link_drive: string | null;
};

export type Messaggio = {
  id: string;
  conversazione_id: string;
  ruolo: "cliente" | "assistente" | "tecnico" | "sistema";
  testo: string;
  foto: string[];
  fonti: Fonte[];
  creato_il: string;
  fotoUrl?: string[];
};

export type Conversazione = {
  id: string;
  cliente_id: string;
  macchina_id: string | null;
  titolo: string;
  stato: "aperta" | "al_tecnico" | "risolta";
  motivo_tecnico: string | null;
  passata_il: string | null;
  letta_dal_tecnico: boolean;
  creato_il: string;
  aggiornato_il: string;
};

export function nomeMacchina(m: Pick<Macchina, "marca" | "modello" | "anno">) {
  return `${m.marca} ${m.modello}${m.anno ? ` (${m.anno})` : ""}`;
}

/** Numero per wa.me: con prefisso internazionale, senza "+" (default Italia). */
export function numeroWhatsApp(tel: string) {
  const t = tel.replace(/[^\d+]/g, "");
  if (t.startsWith("+")) return t.slice(1);
  if (t.startsWith("00")) return t.slice(2);
  return "39" + t;
}
