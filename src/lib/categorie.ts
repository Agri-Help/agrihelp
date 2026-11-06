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
