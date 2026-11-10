/** Categorie e tipi dei manuali (usabili sia nel browser che sul server). */

export const CATEGORIE = [
  { id: "trattori", nome: "Trattori", icona: "🚜" },
  { id: "attrezzature", nome: "Attrezzature", icona: "⚙️" },
  { id: "telescopici", nome: "Telescopici", icona: "🏗️" },
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

/** Modelli già venduti, per marca: compaiono come suggerimenti nei campi Marca e Modello. */
export const MODELLI_NOTI: Record<string, string[]> = {
  McCormick: [
    "X2.055",
    "X4.080",
    "X5.100 Cruise",
    "X5.100 Cruise Plus",
    "X5.120 Efficient",
    "X5.120 Premium",
    "X6.135",
    "X6.414 P6-Drive",
    "X6.415 P6-Drive",
    "X7.418 P6-Drive",
    "X7.418 VT-Drive",
    "X7.618 P6-Drive",
    "X7.623 P6-Drive",
    "X7.624 VT-Drive",
    "X8.631 VT-Drive",
    "CX80",
  ],
};

export const MARCHE_NOTE = Object.keys(MODELLI_NOTI);

/** Id del suggerimento modelli da usare con <input list=…>: quelli della marca se nota, altrimenti tutti. */
export function idElencoModelli(marca: string | null | undefined): string {
  const m = MARCHE_NOTE.find((x) => x.toLowerCase() === (marca || "").trim().toLowerCase());
  return m ? `modelli-${m.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "modelli-noti";
}
