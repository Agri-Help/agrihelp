import { Scena, Logo } from "@/components/Scena";
import ModuloAccesso from "./ModuloAccesso";

export default async function Accedi({ searchParams }: { searchParams: Promise<{ errore?: string }> }) {
  const { errore } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <Scena className="w-full" />
      <div className="flex flex-1 flex-col gap-5 px-5 pb-10 pt-6">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <h1 className="text-2xl font-bold">AgriHelp</h1>
            <p className="text-sm text-white/60">Assistenza per trattori e guide satellitari</p>
          </div>
        </div>
        {errore === "non-autorizzato" && (
          <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200">
            Questo indirizzo non è abilitato. AgriHelp è riservato ai clienti invitati: contatta il tecnico.
          </p>
        )}
        {errore === "link" && (
          <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200">Il link è scaduto o non è valido. Richiedi un nuovo codice.</p>
        )}
        <ModuloAccesso />
      </div>
    </main>
  );
}
