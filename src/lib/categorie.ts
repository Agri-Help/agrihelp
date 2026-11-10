/** Categorie e tipi dei manuali (usabili sia nel browser che sul server). */

export const CATEGORIE = [
  { id: "trattori", nome: "Trattori", icona: "🚜" },
  { id: "attrezzature", nome: "Attrezzature", icona: "⚙️" },
  { id: "telescopici", nome: "Telescopici e pale", icona: "🏗️" },
  { id: "raccolta", nome: "Mietitrebbie e raccolta", icona: "🌾" },
  { id: "guida", nome: "Guida satellitare e GPS", icona: "🛰️" },
  { id: "altro", nome: "Altro", icona: "📁" },
] as const;

export type CategoriaId = (typeof CATEGORIE)[number]["id"];

export const TIPI = [
  { id: "manuale", nome: "Manuale d'uso" },
  { id: "officina", nome: "Manuale d'officina" },
  { id: "bollettino", nome: "Bollettino tecnico" },
  { id: "schema", nome: "Schema elettrico/idraulico" },
  { id: "altro", nome: "Altro" },
] as const;

export const ID_CATEGORIE: string[] = CATEGORIE.map((c) => c.id);
export const ID_TIPI: string[] = TIPI.map((t) => t.id);

export function nomeCategoria(id: string | null | undefined): string {
  return CATEGORIE.find((c) => c.id === id)?.nome || "Senza categoria";
}
export function iconaCategoria(id: string | null | undefined): string {
  return CATEGORIE.find((c) => c.id === id)?.icona || "📖";
}
export function nomeTipo(id: string | null | undefined): string {
  return TIPI.find((t) => t.id === id)?.nome || id || "";
}

export type Proposta = {
  titolo: string;
  categoria: string;
  marca: string;
  modelli: string;
  tipo: string;
};

/** Macchine vendute dal tecnico (marca, tipo, modello): suggerimenti nei campi Marca e Modello. */
export const MACCHINE_NOTE: [marca: string, tipo: string, modello: string][] = [
  ["McCormick", "Trattore", "X2.055"],
  ["McCormick", "Trattore", "X4.080"],
  ["McCormick", "Trattore", "X5.100 Cruise"],
  ["McCormick", "Trattore", "X5.100 Cruise Plus"],
  ["McCormick", "Trattore", "X5.120 Efficient"],
  ["McCormick", "Trattore", "X5.120 Premium"],
  ["McCormick", "Trattore", "X6.135"],
  ["McCormick", "Trattore", "X6.414 P6-Drive"],
  ["McCormick", "Trattore", "X6.415 P6-Drive"],
  ["McCormick", "Trattore", "X7.418 P6-Drive"],
  ["McCormick", "Trattore", "X7.418 VT-Drive"],
  ["McCormick", "Trattore", "X7.618 P6-Drive"],
  ["McCormick", "Trattore", "X7.623 P6-Drive"],
  ["McCormick", "Trattore", "X7.624 VT-Drive"],
  ["McCormick", "Trattore", "X8.631 VT-Drive"],
  ["McCormick", "Trattore", "CX80"],
  ["Weidemann", "Telescopico", "T9535"],
  ["Weidemann", "Telescopico", "T7042"],
  ["Weidemann", "Telescopico", "T6025"],
  ["Weidemann", "Pala gommata", "3060T"],
  ["Weidemann", "Pala gommata", "1260LP"],
  ["Weidemann", "Pala gommata", "1160"],
  ["Kverneland", "Seminatrice", "TF Profi SX eDrive"],
  ["Kverneland", "Seminatrice", "Optima V"],
  ["Kverneland", "Seminatrice", "Satio 1060F"],
  ["Kverneland", "Seminatrice", "F-Drill Duo 1600I"],
  ["Kverneland", "Barra di semina", "6 m 48 elementi"],
  ["Kverneland", "Erpice rotante", "Rotago 6 m"],
  ["Vicon", "Falciacondizionatrice", "Extra 7100R"],
  ["Vicon", "Falciacondizionatrice", "Extra 632FR"],
  ["Vicon", "Falciacondizionatrice", "Extra 732FR"],
  ["Vicon", "Falciacondizionatrice", "Extra 732R"],
  ["Vicon", "Rotopressa", "VariBale 190"],
  ["Vicon", "Rotopressa", "RV5220"],
  ["Vicon", "Andanatore", "Andex 764"],
  ["ROC", "Andanatore a tappeto", "RT 870"],
  ["ROC", "Andanatore a tappeto", "RT 730"],
  ["Novak", "Livella", "Master 60"],
  ["Novak", "Livella", "Master 50"],
  ["Bobcat", "Pala compatta", "S100"],
  ["Bobcat", "Pala compatta", "S70"],
  ["Triolet", "Benna trinciatrice", "TU 180 XL"],
];

/** Modelli per marca, ricavati dall'elenco sopra. */
export const MODELLI_NOTI: Record<string, string[]> = MACCHINE_NOTE.reduce(
  (acc, [marca, , modello]) => {
    (acc[marca] ||= []).push(modello);
    return acc;
  },
  {} as Record<string, string[]>,
);

export function tipoMacchina(marca: string, modello: string): string {
  return MACCHINE_NOTE.find(([m, , x]) => m === marca && x === modello)?.[1] || "";
}

export const MARCHE_NOTE = Object.keys(MODELLI_NOTI);

/** Id del suggerimento modelli da usare con <input list=…>: quelli della marca se nota, altrimenti tutti. */
export function idElencoModelli(marca: string | null | undefined): string {
  const m = MARCHE_NOTE.find((x) => x.toLowerCase() === (marca || "").trim().toLowerCase());
  return m ? `modelli-${m.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "modelli-noti";
}
