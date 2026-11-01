import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseServiceKey } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const VARIABILI = [
  { nome: "NEXT_PUBLIC_SUPABASE_URL", obbligatoria: true },
  { nome: "NEXT_PUBLIC_SUPABASE_ANON_KEY", obbligatoria: true },
  { nome: "SUPABASE_SERVICE_ROLE_KEY", obbligatoria: true },
  { nome: "ANTHROPIC_API_KEY", obbligatoria: true },
  { nome: "ADMIN_EMAIL", obbligatoria: true },
  { nome: "NOME_TECNICO", obbligatoria: false },
  { nome: "NEXT_PUBLIC_TELEFONO_TECNICO", obbligatoria: false },
  { nome: "NEXT_PUBLIC_SITE_URL", obbligatoria: false },
];

/** Pagina di controllo: dice quali impostazioni mancano (senza mostrarne il valore). */
export default async function Stato() {
  const righe = VARIABILI.map((v) => ({ ...v, presente: !!process.env[v.nome]?.trim() }));

  let database = "non controllato";
  const url = supabaseUrl();
  const service = supabaseServiceKey();
  // L'indirizzo di Supabase non è segreto (finisce comunque nell'app): lo mostriamo per controllo
  const urlOk = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url);
  if (url && service) {
    try {
      const { error } = await createClient(url, service, { auth: { persistSession: false } })
        .from("profili")
        .select("id", { head: true, count: "exact" });
      database = error ? `errore: ${error.message}` : "ok";
    } catch (e) {
      database = `errore: ${e instanceof Error ? e.message : "sconosciuto"}`;
    }
  }
  const tuttoOk = righe.every((r) => r.presente || !r.obbligatoria) && database === "ok";

  return (
    <main className="mx-auto max-w-xl p-5">
      <h1 className="mb-1 text-xl font-bold">Controllo impostazioni AgriHelp</h1>
      <p className="mb-4 text-sm text-white/60">I valori non vengono mostrati: solo se ci sono o mancano.</p>
      <ul className="scheda flex flex-col gap-2">
        {righe.map((r) => (
          <li key={r.nome} className="flex items-center gap-2 font-mono text-sm">
            <span>{r.presente ? "✅" : r.obbligatoria ? "❌" : "⚪️"}</span>
            <span className="break-all">{r.nome}</span>
            {!r.presente && <span className="ml-auto font-sans text-xs text-white/50">{r.obbligatoria ? "manca" : "facoltativa"}</span>}
          </li>
        ))}
        {url && (
          <li className="mt-2 border-t border-white/10 pt-2 text-sm">
            {urlOk ? "✅" : "⚠️"} Indirizzo Supabase letto: <span className="break-all font-mono">{url}</span>
            {!urlOk && (
              <span className="block text-white/60">
                Deve essere tipo https://abcdefghijklmnop.supabase.co (lo trovi in Supabase → Project Settings → API → Project URL).
              </span>
            )}
          </li>
        )}
        <li className="mt-2 border-t border-white/10 pt-2 text-sm">
          {database === "ok" ? "✅" : "❌"} Collegamento al database: {database}
        </li>
      </ul>
      <p className="mt-4 text-sm text-white/70">
        {tuttoOk ? (
          <>Tutto a posto. <a className="underline" href="/accedi">Vai all&apos;accesso</a></>
        ) : (
          <>Aggiungi le voci con ❌ in Vercel → Settings → Environment Variables (nome identico, senza spazi), poi Deployments → Redeploy.</>
        )}
      </p>
    </main>
  );
}
