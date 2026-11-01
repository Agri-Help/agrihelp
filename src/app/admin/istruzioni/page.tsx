import { leggiIstruzioni } from "@/lib/istruzioni";
import { salvaIstruzioni } from "../azioni";

export default async function Istruzioni({ searchParams }: { searchParams: Promise<{ salvato?: string }> }) {
  const { salvato } = await searchParams;
  const testo = await leggiIstruzioni();
  return (
    <div className="scheda">
      <h1 className="text-lg font-bold">Istruzioni per l&apos;assistente</h1>
      <p className="mt-1 text-sm text-white/60">
        Regole generali che l&apos;assistente tiene sempre a mente: sigle dei manuali, quali modelli hanno quale sistema, come preferisci che risponda,
        cosa non deve mai consigliare. Scrivi come parleresti a un apprendista. Per i singoli guasti usa invece &quot;La mia esperienza&quot;.
      </p>
      {salvato && <p className="mt-3 rounded-xl bg-green-500/15 p-3 text-sm text-green-200">✅ Salvate: valgono già dalla prossima domanda.</p>}
      <form action={salvaIstruzioni} className="mt-3 flex flex-col gap-2">
        <textarea name="testo" rows={18} className="campo-input font-mono text-sm" defaultValue={testo} />
        <button className="bottone self-end">Salva istruzioni</button>
      </form>
    </div>
  );
}
