/** Pulisce un valore incollato: spazi, virgolette, "NOME=" davanti. */
function pulisci(v: string | undefined): string {
  let s = (v ?? "").trim();
  s = s.replace(/^[A-Z_]+\s*=\s*/, "");
  s = s.replace(/^["'`]+|["'`]+$/g, "").trim();
  return s;
}

/** Indirizzo di Supabase, tollerante a come è stato incollato. */
export function supabaseUrl(): string {
  let s = pulisci(process.env.NEXT_PUBLIC_SUPABASE_URL);
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
  return pulisci(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function supabaseServiceKey(): string {
  return pulisci(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
