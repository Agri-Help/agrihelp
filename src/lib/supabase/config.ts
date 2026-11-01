// SOLO SERVER: non importare da componenti "use client".
// Le chiavi vengono riconosciute dal loro formato, così funziona anche se
// sono state incollate nel campo sbagliato su Vercel.

/** Progetto Supabase di AgriHelp (l'indirizzo non è segreto). Usato se la variabile è sbagliata. */
const URL_PREDEFINITO = "https://tgqresivaiwaxcviawne.supabase.co";

const NOMI = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
];

/** Lettura "dinamica": il valore non viene copiato nel codice dell'app al momento della costruzione. */
function env(nome: string): string {
  let s = (process.env[nome] ?? "").trim();
  s = s.replace(/^[A-Z_]+\s*=\s*/, "");
  s = s.replace(/^["'`]+|["'`]+$/g, "").trim();
  return s;
}

/** Ruolo scritto dentro una vecchia chiave JWT (anon / service_role). */
function ruoloJwt(k: string): string | null {
  if (!k.startsWith("eyJ")) return null;
  try {
    const parte = k.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(parte)).role ?? null;
  } catch {
    return null;
  }
}

const pubblica = (k: string) => k.startsWith("sb_publishable_") || ruoloJwt(k) === "anon";
const segreta = (k: string) => k.startsWith("sb_secret_") || ruoloJwt(k) === "service_role";

/** Indirizzo di Supabase, tollerante a come è stato incollato. */
export function supabaseUrl(): string {
  let s = env("NEXT_PUBLIC_SUPABASE_URL");
  const dash = s.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dash) s = dash[1];
  if (/^[a-z0-9]{15,30}$/i.test(s)) s = `https://${s.toLowerCase()}.supabase.co`;
  else if (s && !/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    s = new URL(s).origin;
  } catch {
    s = "";
  }
  return /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(s) ? s : URL_PREDEFINITO;
}

/** Chiave pubblica (mai una segreta), cercata in tutti i campi. */
export function supabaseAnonKey(): string {
  return NOMI.map(env).find(pubblica) ?? "";
}

/** Chiave segreta, cercata in tutti i campi. Usarla solo sul server. */
export function supabaseServiceKey(): string {
  return NOMI.map(env).find(segreta) ?? "";
}

/** Dove sono finite le chiavi (per la pagina di controllo), senza mostrarle. */
export function diagnosiChiavi() {
  return NOMI.map((nome) => {
    const v = env(nome);
    const tipo = !v ? "vuota" : pubblica(v) ? "chiave pubblica" : segreta(v) ? "chiave SEGRETA" : /supabase/i.test(v) ? "indirizzo" : "altro";
    return { nome, tipo };
  });
}
