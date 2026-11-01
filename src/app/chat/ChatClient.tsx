"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Scena";
import { TestoAI } from "@/components/TestoAI";
import { riduciFoto } from "@/lib/immagini";
import { nomeMacchina, type Conversazione, type Macchina, type Messaggio, type Profilo } from "@/lib/tipi";

type Props = {
  profilo: Profilo;
  macchine: Macchina[];
  conversazioniIniziali: Conversazione[];
  telefonoTecnico: string;
};

// Riconoscimento vocale del browser (Chrome/Android, Safari/iPhone)
type Riconoscimento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export default function ChatClient({ profilo, macchine, conversazioniIniziali, telefonoTecnico }: Props) {
  const [conversazioni, setConversazioni] = useState(conversazioniIniziali);
  const [attiva, setAttiva] = useState<Conversazione | null>(null);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [macchinaId, setMacchinaId] = useState<string | null>(macchine.length === 1 ? macchine[0].id : null);
  const [testo, setTesto] = useState("");
  const [foto, setFoto] = useState<string[]>([]);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState("");
  const [gettoni, setGettoni] = useState(profilo.gettoni);
  const [menu, setMenu] = useState(false);
  const [ascolto, setAscolto] = useState(false);
  const [parla, setParla] = useState<string | null>(null);
  const fondo = useRef<HTMLDivElement>(null);
  const riconoscimento = useRef<Riconoscimento | null>(null);
  const testoPrimaDettatura = useRef("");
  const fileInput = useRef<HTMLInputElement>(null);

  const illimitati = profilo.ruolo === "admin";
  const nome = profilo.nome?.split(" ")[0] || "";

  useEffect(() => {
    fondo.current?.scrollIntoView({ behavior: "smooth" });
  }, [messaggi, invio]);

  const apri = useCallback(async (c: Conversazione) => {
    setMenu(false);
    setErrore("");
    setAttiva(c);
    setMessaggi([]);
    const r = await fetch(`/api/conversazioni/${c.id}`);
    if (r.ok) {
      const d = await r.json();
      setAttiva(d.conversazione);
      setMessaggi(d.messaggi);
    }
  }, []);

  // Quando il caso è dal tecnico, controlla ogni 20 secondi se ha risposto
  useEffect(() => {
    if (!attiva || attiva.stato !== "al_tecnico") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/conversazioni/${attiva.id}`);
      if (!r.ok) return;
      const d = await r.json();
      setMessaggi((prima) => (d.messaggi.length !== prima.length ? d.messaggi : prima));
      setAttiva(d.conversazione);
    }, 20000);
    return () => clearInterval(t);
  }, [attiva]);

  function nuova() {
    setMenu(false);
    setAttiva(null);
    setMessaggi([]);
    setErrore("");
    setTesto("");
    setFoto([]);
  }

  async function invia() {
    if (invio) return;
    const t = testo.trim();
    if (!t && !foto.length) return;
    fermaDettatura();
    setErrore("");
    setInvio(true);
    const provvisorio: Messaggio = {
      id: "tmp-" + Date.now(),
      conversazione_id: attiva?.id || "",
      ruolo: "cliente",
      testo: t,
      foto: [],
      fotoUrl: foto,
      fonti: [],
      creato_il: new Date().toISOString(),
    };
    setMessaggi((m) => [...m, provvisorio]);
    const fotoDaInviare = foto;
    setTesto("");
    setFoto([]);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversazioneId: attiva?.id || null, macchinaId, testo: t, foto: fotoDaInviare }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMessaggi((m) => m.filter((x) => x.id !== provvisorio.id));
        setTesto(t);
        setFoto(fotoDaInviare);
        setErrore(d.messaggio || d.errore || "Qualcosa non ha funzionato. Riprova.");
        if (d.errore === "gettoni-finiti") setGettoni(0);
        return;
      }
      setAttiva(d.conversazione);
      setMessaggi(d.messaggi);
      setGettoni(d.gettoni);
      setConversazioni((lista) => [d.conversazione, ...lista.filter((c) => c.id !== d.conversazione.id)]);
    } catch {
      setMessaggi((m) => m.filter((x) => x.id !== provvisorio.id));
      setTesto(t);
      setFoto(fotoDaInviare);
      setErrore("Connessione assente. Controlla il segnale e riprova.");
    } finally {
      setInvio(false);
    }
  }

  async function chiamaTecnico() {
    if (!attiva) return;
    if (!confirm("Vuoi che il tecnico ti ricontatti per questo problema?")) return;
    const r = await fetch(`/api/conversazioni/${attiva.id}/tecnico`, { method: "POST" });
    if (r.ok) apri(attiva);
  }

  async function aggiungiFoto(files: FileList | null) {
    if (!files) return;
    const nuove: string[] = [];
    for (const f of Array.from(files).slice(0, 4 - foto.length)) {
      try {
        nuove.push(await riduciFoto(f));
      } catch {
        setErrore("Non riesco a leggere questa foto.");
      }
    }
    setFoto((p) => [...p, ...nuove].slice(0, 4));
  }

  function avviaDettatura() {
    const W = window as unknown as { SpeechRecognition?: new () => Riconoscimento; webkitSpeechRecognition?: new () => Riconoscimento };
    const Classe = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Classe) {
      setErrore("Questo telefono non supporta la dettatura qui. Usa il microfono della tastiera per dettare.");
      return;
    }
    const r = new Classe();
    r.lang = "it-IT";
    r.interimResults = true;
    r.continuous = true;
    testoPrimaDettatura.current = testo ? testo.trimEnd() + " " : "";
    let finale = "";
    r.onresult = (e) => {
      let provvisorio = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finale += res[0].transcript + " ";
        else provvisorio += res[0].transcript;
      }
      setTesto(testoPrimaDettatura.current + finale + provvisorio);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") setErrore("Permetti l'uso del microfono nelle impostazioni del browser.");
    };
    r.onend = () => setAscolto(false);
    riconoscimento.current = r;
    r.start();
    setAscolto(true);
  }

  function fermaDettatura() {
    riconoscimento.current?.stop();
    riconoscimento.current = null;
    setAscolto(false);
  }

  function leggiAdAltaVoce(m: Messaggio) {
    if (!("speechSynthesis" in window)) return;
    if (parla === m.id) {
      speechSynthesis.cancel();
      setParla(null);
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(m.testo.replace(/[*#📖]/g, "").replace(/\(\s*pag\.[^)]*\)/g, ""));
    u.lang = "it-IT";
    u.onend = () => setParla(null);
    setParla(m.id);
    speechSynthesis.speak(u);
  }

  const macchinaAttiva = macchine.find((m) => m.id === (attiva?.macchina_id ?? macchinaId));

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col">
      {/* Intestazione */}
      <header className="flex items-center gap-3 border-b border-white/10 bg-spazio px-4 py-3 pt-[max(.75rem,env(safe-area-inset-top))]">
        <button onClick={() => setMenu(true)} className="rounded-lg p-1 text-white/80" aria-label="Le mie richieste">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <Logo size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-tight">{attiva ? attiva.titolo : "AgriHelp"}</div>
          {macchinaAttiva && <div className="truncate text-xs text-white/50">{nomeMacchina(macchinaAttiva)}</div>}
        </div>
        <div
          className={`rounded-full px-3 py-1 text-sm font-semibold ${gettoni <= 5 && !illimitati ? "bg-red-500/20 text-red-200" : "bg-white/10 text-white"}`}
          title="Gettoni rimasti: ogni domanda usa un gettone"
        >
          🪙 {illimitati ? "∞" : gettoni}
        </div>
      </header>

      {/* Stato del caso */}
      {attiva?.stato === "al_tecnico" && (
        <div className="flex items-center gap-2 bg-sole/15 px-4 py-2 text-sm text-amber-100">
          <span>🧑‍🔧 Il tecnico è stato avvisato e ti risponderà qui.</span>
          {telefonoTecnico && (
            <a href={`tel:${telefonoTecnico}`} className="ml-auto shrink-0 font-semibold underline">
              Chiama
            </a>
          )}
        </div>
      )}

      {/* Messaggi */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {!attiva && messaggi.length === 0 && (
          <div className="flex flex-col gap-5 pt-4">
            <div className="flex gap-3">
              <div className="mt-1 shrink-0"><Logo size={36} /></div>
              <div className="rounded-2xl rounded-tl-sm bg-spazio-2 px-4 py-3">
                <p className="text-lg">Ciao{nome ? ` ${nome}` : ""}! 👋 Che succede?</p>
                <p className="mt-1 text-white/70">
                  Raccontami il problema scrivendo o toccando il microfono 🎤, e se puoi scatta una foto 📷 del display o del pezzo.
                </p>
              </div>
            </div>
            {macchine.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-white/60">Su quale macchina?</p>
                <div className="flex flex-wrap gap-2">
                  {macchine.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMacchinaId(macchinaId === m.id ? null : m.id)}
                      className={`rounded-full border px-4 py-2 text-sm ${macchinaId === m.id ? "border-sole bg-sole text-spazio font-semibold" : "border-white/20 text-white"}`}
                    >
                      🚜 {nomeMacchina(m)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messaggi.map((m) => (
            <Bolla key={m.id} m={m} parla={parla === m.id} onLeggi={() => leggiAdAltaVoce(m)} />
          ))}
          {invio && (
            <div className="flex gap-3">
              <div className="mt-1 shrink-0"><Logo size={28} /></div>
              <div className="rounded-2xl rounded-tl-sm bg-spazio-2 px-4 py-3 text-white/70">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce [animation-delay:.15s]">●</span>
                  <span className="animate-bounce [animation-delay:.3s]">●</span>
                </span>{" "}
                Sto controllando i manuali…
              </div>
            </div>
          )}
          <div ref={fondo} />
        </div>

        {attiva && attiva.stato === "aperta" && messaggi.length > 1 && !invio && (
          <div className="mt-5 flex justify-center">
            <button onClick={chiamaTecnico} className="bottone-secondario text-sm">
              🧑‍🔧 Non risolvo: passa al tecnico
            </button>
          </div>
        )}
      </main>

      {/* Composizione */}
      <footer className="border-t border-white/10 bg-spazio px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2">
        {errore && <p className="mb-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{errore}</p>}
        {!illimitati && gettoni === 0 && (
          <p className="mb-2 rounded-lg bg-sole/15 px-3 py-2 text-sm text-amber-100">
            Hai finito i gettoni. Contatta il tecnico per la ricarica{telefonoTecnico ? <> al <a className="underline" href={`tel:${telefonoTecnico}`}>{telefonoTecnico}</a></> : ""}.
          </p>
        )}
        {foto.length > 0 && (
          <div className="mb-2 flex gap-2">
            {foto.map((f, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <button
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-black/80 text-xs"
                  onClick={() => setFoto((p) => p.filter((_, j) => j !== i))}
                  aria-label="Togli foto"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { aggiungiFoto(e.target.files); e.target.value = ""; }} />
          <button
            onClick={() => fileInput.current?.click()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl"
            aria-label="Scatta una foto"
            disabled={foto.length >= 4}
          >
            📷
          </button>
          <textarea
            className="campo-input max-h-40 min-h-12 flex-1 resize-none py-3"
            rows={1}
            placeholder={ascolto ? "Ti ascolto… parla pure" : "Scrivi cosa succede…"}
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                invia();
              }
            }}
          />
          {testo.trim() || foto.length ? (
            <button
              onClick={invia}
              disabled={invio}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sole text-spazio"
              aria-label="Invia"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z" /></svg>
            </button>
          ) : null}
          <button
            onClick={ascolto ? fermaDettatura : avviaDettatura}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${ascolto ? "animate-pulse bg-red-500 text-white" : "bg-campo text-white"}`}
            aria-label={ascolto ? "Ferma la dettatura" : "Parla"}
          >
            {ascolto ? "■" : "🎤"}
          </button>
        </div>
      </footer>

      {/* Menu laterale: storico */}
      {menu && (
        <div className="fixed inset-0 z-20 flex" onClick={() => setMenu(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <nav className="relative flex h-full w-80 max-w-[85%] flex-col bg-spazio-2 p-4 pt-[max(1rem,env(safe-area-inset-top))]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-2">
              <Logo size={30} />
              <div className="flex-1">
                <div className="font-semibold">{profilo.nome || profilo.email}</div>
                <div className="text-xs text-white/50">🪙 {illimitati ? "illimitati" : `${gettoni} gettoni`}</div>
              </div>
            </div>
            <button onClick={nuova} className="bottone mb-4">+ Nuova richiesta</button>
            <div className="mb-2 text-xs uppercase tracking-wide text-white/40">Le mie richieste</div>
            <div className="flex-1 overflow-y-auto">
              {conversazioni.length === 0 && <p className="text-sm text-white/50">Nessuna richiesta ancora.</p>}
              {conversazioni.map((c) => (
                <button
                  key={c.id}
                  onClick={() => apri(c)}
                  className={`mb-1 block w-full rounded-lg px-3 py-2 text-left ${attiva?.id === c.id ? "bg-white/10" : ""}`}
                >
                  <div className="truncate text-sm">{c.titolo}</div>
                  <div className="text-xs text-white/40">
                    {new Date(c.aggiornato_il).toLocaleDateString("it-IT")}
                    {c.stato === "al_tecnico" && " · 🧑‍🔧 dal tecnico"}
                    {c.stato === "risolta" && " · ✅ risolta"}
                  </div>
                </button>
              ))}
            </div>
            {profilo.ruolo === "admin" && (
              <a href="/admin" className="bottone-secondario mb-2">⚙️ Pannello tecnico</a>
            )}
            <form action="/esci" method="post">
              <button className="w-full py-2 text-sm text-white/50">Esci</button>
            </form>
          </nav>
        </div>
      )}
    </div>
  );
}

function Bolla({ m, parla, onLeggi }: { m: Messaggio; parla: boolean; onLeggi: () => void }) {
  if (m.ruolo === "sistema") {
    return <div className="mx-auto max-w-[90%] rounded-full bg-white/5 px-4 py-1.5 text-center text-xs text-white/60">{m.testo}</div>;
  }
  const mio = m.ruolo === "cliente";
  const tecnico = m.ruolo === "tecnico";
  return (
    <div className={`flex gap-2 ${mio ? "justify-end" : ""}`}>
      {!mio && <div className="mt-1 shrink-0">{tecnico ? <span className="text-2xl">🧑‍🔧</span> : <Logo size={28} />}</div>}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          mio ? "rounded-tr-sm bg-campo-scuro text-white" : tecnico ? "rounded-tl-sm border border-sole/40 bg-sole/10" : "rounded-tl-sm bg-spazio-2"
        }`}
      >
        {tecnico && <div className="mb-1 text-xs font-semibold text-sole">Il tecnico</div>}
        {m.fotoUrl && m.fotoUrl.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {m.fotoUrl.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="Foto inviata" className="h-28 w-28 rounded-lg object-cover" />
              </a>
            ))}
          </div>
        )}
        {m.testo && (mio ? <p className="whitespace-pre-wrap">{m.testo}</p> : <TestoAI testo={m.testo} />)}
        {m.ruolo === "assistente" && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {m.fonti?.slice(0, 4).map((f, i) =>
              f.fonte === "esperienza" ? (
                <span key={i} className="rounded-full bg-campo/20 px-2 py-0.5 text-[11px] text-green-200">🧑‍🔧 Esperienza del tecnico</span>
              ) : (
                <span key={i} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                  📖 {f.titolo}
                  {f.pagina ? `, pag. ${f.pagina}` : ""}
                </span>
              ),
            )}
            <button onClick={onLeggi} className="ml-auto rounded-full px-2 py-0.5 text-sm text-white/60" aria-label="Leggi ad alta voce">
              {parla ? "⏹" : "🔊"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
