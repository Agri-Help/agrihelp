import { LogoCompleto } from "@/components/Logo";
import ModuloAccesso from "./ModuloAccesso";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function Accedi({ searchParams }: { searchParams: Promise<{ errore?: string }> }) {
  const { errore } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <div className="flex flex-1 flex-col gap-5 px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
        <LogoCompleto className="mx-auto w-52" />
        <div className="text-center">
          <h1 className="sr-only">AgriDiag</h1>
          <p className="text-sm text-slate-600">Assistenza per trattori e guide satellitari</p>
        </div>
        {errore === "non-autorizzato" && (
          <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            Questo indirizzo non è abilitato. AgriDiag è riservato ai clienti invitati: contatta il tecnico.
          </p>
        )}
        {errore === "link" && (
          <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">Il link è scaduto o non è valido. Richiedi un nuovo codice.</p>
        )}
        <ModuloAccesso url={supabaseUrl()} chiave={supabaseAnonKey()} />
      </div>
    </main>
  );
}
