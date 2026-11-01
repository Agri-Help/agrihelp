/** Pulisce un valore incollato: spazi, virgolette, "NOME=" davanti. */
function pulisci(v: string | undefined): string {
  let s = (v ?? "").trim();
  s = s.replace(/^[A-Z_]+\s*=\s*/, "");
  s = s.replace(/^["'`]+|["'`]+$/g, "").trim();
  return s;
}

/** Progetto Supabase di AgriHelp (l'indirizzo non è segreto). Usato se la variabile è sbagliata. */
const URL_PREDEFINITO = "https://tgqresivaiwaxcviawne.supabase.co";

const sembraChiave = (v: string) => /^(sb_publishable_|sb_secret_|eyJ)/.test(v);

/** Indirizzo di Supabase, tollerante a come è stato incollato. */
export function supabaseUrl(): string {
  const u = leggiUrl();
  return /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(u) ? u : URL_PREDEFINITO;
}

function leggiUrl(): string {
  let s = pulisci(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (sembraChiave(s)) return "";
  if (!s) return "";
  // solo l'ID del progetto (es. abcdefghijklmnopqrst)
  if (/^[a-z0-9]{15,30}$/i.test(s)) return `https://${s.toLowerCase()}.supabase.co`;
  // link della dashboard: supabase.com/dashboard/project/ID
  const dash = s.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dash) return `https://${dash[1].toLowerCase()}.supabase.co`;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    return new URL(s).origin;
  } catch {
    return s;
  }
}

export function supabaseAnonKey(): string {
  const k = pulisci(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (sembraChiave(k)) return k;
  // chiave finita per sbaglio nel campo dell'indirizzo
  const nelCampoUrl = pulisci(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return /^(sb_publishable_|eyJ)/.test(nelCampoUrl) ? nelCampoUrl : k;
}

export function supabaseServiceKey(): string {
  return pulisci(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
