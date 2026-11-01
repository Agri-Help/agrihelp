import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";

const STATI: Record<string, string> = { aperta: "Con l'AI", al_tecnico: "🧑‍🔧 Da gestire", risolta: "✅ Risolta" };

export default async function Casi({ searchParams }: { searchParams: Promise<{ tutti?: string }> }) {
  const { tutti } = await searchParams;
  const sb = supabaseAdmin();
  let q = sb
    .from("conversazioni")
    .select("*, profili(nome,email,telefono,azienda), macchine(marca,modello)")
    .order("aggiornato_il", { ascending: false })
    .limit(100);
  if (!tutti) q = q.eq("stato", "al_tecnico");
  const { data } = await q;
  const casi = data || [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="flex-1 text-xl font-bold">{tutti ? "Tutte le conversazioni" : "Casi passati a te"}</h1>
        <Link className="text-sm underline text-white/70" href={tutti ? "/admin" : "/admin?tutti=1"}>
          {tutti ? "Solo da gestire" : "Vedi tutte"}
        </Link>
      </div>
      {casi.length === 0 && (
        <p className="scheda text-white/60">{tutti ? "Nessuna conversazione ancora." : "Nessun caso da gestire. 🎉"}</p>
      )}
      <div className="flex flex-col gap-2">
        {casi.map((c) => {
          const p = c.profili as { nome: string; email: string; telefono: string | null; azienda: string | null } | null;
          const m = c.macchine as { marca: string; modello: string } | null;
          return (
            <Link key={c.id} href={`/admin/conversazioni/${c.id}`} className="scheda block hover:bg-spazio-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    {!c.letta_dal_tecnico && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-sole" />}
                    {p?.nome || p?.email} {p?.azienda ? <span className="font-normal text-white/50">· {p.azienda}</span> : null}
                  </div>
                  <div className="truncate text-white/80">{c.titolo}</div>
                  {m && <div className="text-xs text-white/50">🚜 {m.marca} {m.modello}</div>}
                  {c.stato === "al_tecnico" && c.motivo_tecnico && (
                    <div className="mt-1 line-clamp-2 text-sm text-amber-200">{c.motivo_tecnico}</div>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-white/50">
                  <div>{STATI[c.stato]}</div>
                  <div>{new Date(c.aggiornato_il).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
