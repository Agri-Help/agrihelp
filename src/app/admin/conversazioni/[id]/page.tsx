import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { conUrlFoto } from "@/lib/foto";
import { TestoAI } from "@/components/TestoAI";
import { numeroWhatsApp, type Messaggio } from "@/lib/tipi";
import { cambiaStatoCaso, rispondiComeTecnico, salvaEsperienza } from "../../azioni";

export default async function Caso({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const sb = supabaseAdmin();
  const { data: c } = await sb
    .from("conversazioni")
    .select("*, profili(id,nome,email,telefono,azienda,gettoni), macchine(marca,modello,anno,matricola,guida_satellitare)")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  if (!c.letta_dal_tecnico) await sb.from("conversazioni").update({ letta_dal_tecnico: true }).eq("id", id);
  const { data: msg } = await sb.from("messaggi").select("*").eq("conversazione_id", id).order("creato_il");
  const messaggi = await conUrlFoto((msg || []) as Messaggio[]);
  const p = c.profili as { id: string; nome: string; email: string; telefono: string | null; azienda: string | null; gettoni: number };
  const m = c.macchine as { marca: string; modello: string; anno: number | null; matricola: string | null; guida_satellitare: string | null } | null;
  const tel = p.telefono?.replace(/[^\d+]/g, "");

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="text-sm text-white/60">← Casi</Link>
      <div className="scheda">
        <div className="text-lg font-bold">{c.titolo}</div>
        <div className="mt-1 text-white/80">
          <Link className="underline" href={`/admin/clienti/${p.id}`}>{p.nome || p.email}</Link>
          {p.azienda ? ` · ${p.azienda}` : ""} · 🎟️ {p.gettoni}
        </div>
        {m && (
          <div className="text-sm text-white/60">
            🚜 {m.marca} {m.modello}
            {m.anno ? ` (${m.anno})` : ""}
            {m.matricola ? ` · matr. ${m.matricola}` : ""}
            {m.guida_satellitare ? ` · ${m.guida_satellitare}` : ""}
          </div>
        )}
        {c.motivo_tecnico && <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-sole/10 p-3 font-sans text-sm text-amber-100">{c.motivo_tecnico}</pre>}
        <div className="mt-3 flex flex-wrap gap-2">
          {tel && <a className="bottone-secondario" href={`tel:${tel}`}>📞 Chiama</a>}
          {tel && <a className="bottone-secondario" href={`https://wa.me/${numeroWhatsApp(tel)}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
          <form action={cambiaStatoCaso}>
            <input type="hidden" name="conversazione_id" value={id} />
            <input type="hidden" name="stato" value={c.stato === "risolta" ? "al_tecnico" : "risolta"} />
            <button className="bottone-secondario">{c.stato === "risolta" ? "Riapri" : "✅ Segna risolto"}</button>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {messaggi.map((x) => (
          <div key={x.id} className={x.ruolo === "sistema" ? "text-center text-xs text-white/50" : `rounded-2xl p-3 ${x.ruolo === "cliente" ? "ml-8 bg-campo-scuro" : x.ruolo === "tecnico" ? "mr-8 border border-sole/40 bg-sole/10" : "mr-8 bg-spazio-2"}`}>
            {x.ruolo !== "sistema" && (
              <div className="mb-1 text-xs text-white/50">
                {x.ruolo === "cliente" ? "Cliente" : x.ruolo === "tecnico" ? "Tu" : "Assistente AI"} · {new Date(x.creato_il).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
              </div>
            )}
            {x.fotoUrl?.length ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {x.fotoUrl.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" className="h-32 w-32 rounded-lg object-cover" />
                  </a>
                ))}
              </div>
            ) : null}
            {x.ruolo === "assistente" ? <TestoAI testo={x.testo} /> : <p className="whitespace-pre-wrap">{x.testo}</p>}
            {x.fonti?.length ? <div className="mt-2 text-xs text-white/50">Fonti: {x.fonti.map((f) => f.fonte === "esperienza" ? `Esperienza: ${f.titolo}` : `${f.titolo} p.${f.pagina}`).join(" · ")}</div> : null}
          </div>
        ))}
      </div>

      <form action={rispondiComeTecnico} className="scheda flex flex-col gap-2">
        <label className="font-semibold">Rispondi al cliente (lo vede nella sua chat)</label>
        <input type="hidden" name="conversazione_id" value={id} />
        <textarea name="testo" rows={3} className="campo-input" placeholder="Es. Passo domani mattina verso le 9. Intanto non usare lo sterzo automatico." required />
        <button className="bottone self-end">Invia risposta</button>
      </form>

      <details className="scheda" open={ok === "esperienza" ? false : undefined}>
        <summary className="cursor-pointer font-semibold">🧠 Salva la soluzione nella tua esperienza</summary>
        {ok === "esperienza" && <p className="mt-2 text-sm text-green-300">Salvata! L&apos;assistente la userà per i prossimi casi simili.</p>}
        <form action={salvaEsperienza} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="torna" value={`/admin/conversazioni/${id}`} />
          <input name="titolo" className="campo-input" placeholder="Titolo (es. Fendt 724: errore sterzo dopo cambio ruote)" defaultValue={c.titolo} required />
          <div className="grid grid-cols-2 gap-2">
            <input name="marca" className="campo-input" placeholder="Marca" defaultValue={m?.marca || ""} />
            <input name="modelli" className="campo-input" placeholder="Modelli" defaultValue={m?.modello || ""} />
          </div>
          <textarea name="testo" rows={5} className="campo-input" placeholder="Causa e soluzione, come la spiegheresti a un cliente." required />
          <button className="bottone self-end">Salva esperienza</button>
        </form>
      </details>
    </div>
  );
}
