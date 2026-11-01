import { createClient } from "@supabase/supabase-js";

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && service) {
    try {
      const { error } = await createClient(url.trim(), service.trim(), { auth: { persistSession: false } })
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
