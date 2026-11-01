"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ModuloAccesso() {
  const [email, setEmail] = useState("");
  const [codice, setCodice] = useState("");
  const [fase, setFase] = useState<"email" | "codice" | "password">("email");
  const [password, setPassword] = useState("");
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState("");

  // Link dell'email con le chiavi dopo il "#" (modelli email standard di Supabase)
  useEffect(() => {
    const h = new URLSearchParams(location.hash.slice(1));
    const access = h.get("access_token");
    const refresh = h.get("refresh_token");
    if (access && refresh) {
      supabaseBrowser()
        .auth.setSession({ access_token: access, refresh_token: refresh })
        .then(({ error }) => {
          if (error) setErrore("Il link è scaduto o non è valido. Richiedi un nuovo codice.");
          else location.href = "/";
        });
    } else if (h.get("error_description")) {
      setErrore("Il link è scaduto o non è valido. Richiedi un nuovo codice.");
    }
  }, []);

  async function inviaCodice(e: React.FormEvent) {
    e.preventDefault();
    setErrore("");
    setAttesa(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setAttesa(false);
    if (error) {
      setErrore(
        /not found|signups not allowed|not allowed/i.test(error.message)
          ? "Questo indirizzo non è abilitato. AgriHelp è solo su invito: contatta il tecnico."
          : "Non riesco a inviare il codice. Riprova tra un minuto.",
      );
      return;
    }
    setFase("codice");
  }

  async function verifica(e: React.FormEvent) {
    e.preventDefault();
    setErrore("");
    setAttesa(true);
    const { error } = await supabaseBrowser().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: codice.trim(),
      type: "email",
    });
    setAttesa(false);
    if (error) {
      setErrore("Codice sbagliato o scaduto.");
      return;
    }
    location.href = "/";
  }

  async function entraConPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrore("");
    setAttesa(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setAttesa(false);
    if (error) {
      setErrore(
        /invalid login credentials/i.test(error.message)
          ? "Email o password sbagliate."
          : /not confirmed/i.test(error.message)
            ? "Questo utente non è confermato: in Supabase ricrealo con \"Auto Confirm\"."
            : `Errore: ${error.message}`,
      );
      return;
    }
    location.href = "/";
  }

  if (fase === "password") {
    return (
      <form onSubmit={entraConPassword} className="flex flex-col gap-3">
        <label className="text-white/80" htmlFor="email">La tua email</label>
        <input id="email" className="campo-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="text-white/80" htmlFor="password">Password</label>
        <input id="password" className="campo-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {errore && <p className="text-sm text-red-300">{errore}</p>}
        <button className="bottone" disabled={attesa}>{attesa ? "Controllo…" : "Entra"}</button>
        <button type="button" className="text-sm text-white/60 underline" onClick={() => { setErrore(""); setFase("email"); }}>
          Entra invece con un codice via email
        </button>
      </form>
    );
  }

  if (fase === "codice") {
    return (
      <form onSubmit={verifica} className="flex flex-col gap-3">
        <p className="text-white/80">
          Ti abbiamo mandato un&apos;email a <b>{email}</b>. Scrivi qui il codice, oppure tocca il link nell&apos;email.
        </p>
        <input
          className="campo-input text-center text-2xl tracking-[.4em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          placeholder="------"
          value={codice}
          onChange={(e) => setCodice(e.target.value.replace(/\D/g, ""))}
          autoFocus
        />
        {errore && <p className="text-sm text-red-300">{errore}</p>}
        <button className="bottone" disabled={attesa || codice.length < 6}>
          {attesa ? "Controllo…" : "Entra"}
        </button>
        <button type="button" className="text-sm text-white/60 underline" onClick={() => setFase("email")}>
          Cambia email o rimanda il codice
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={inviaCodice} className="flex flex-col gap-3">
      <label className="text-white/80" htmlFor="email">
        La tua email
      </label>
      <input
        id="email"
        className="campo-input"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="nome@esempio.it"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      {errore && <p className="text-sm text-red-300">{errore}</p>}
      <button className="bottone" disabled={attesa}>
        {attesa ? "Invio…" : "Ricevi il codice di accesso"}
      </button>
      <p className="text-xs text-white/50">Accesso riservato ai clienti invitati. Niente password: ti mandiamo un codice via email.</p>
      <button type="button" className="text-sm text-white/60 underline" onClick={() => { setErrore(""); setFase("password"); }}>
        Hai una password? Entra con la password
      </button>
    </form>
  );
}
