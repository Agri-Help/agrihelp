# AgriHelp: come metterla online

Questa guida è per te, Aldo. Non serve saper programmare: sono circa 30–40 minuti, una volta sola.
Ti servono tre account a tuo nome: **Supabase** (il database), **Anthropic** (l'intelligenza artificiale) e **Vercel** (dove gira l'app). Più **GitHub**, dove sta il codice.

---

## 1. Supabase: il database

1. Vai su <https://supabase.com>, crea un account e poi **New project**.
   - Nome: `agrihelp` · Regione: **Central EU (Frankfurt)** · scegli una password e salvala.
2. Quando il progetto è pronto, a sinistra apri **SQL Editor → New query**.
   Copia tutto il contenuto del file `supabase/migrations/0001_agrihelp.sql`, incollalo e premi **Run**. Deve dire "Success".
3. **Authentication → Sign In / Providers**:
   - **disattiva** "Allow new users to sign up" (così entra solo chi inviti tu);
   - lascia attivo **Email**.
4. **Invio delle email (obbligatorio)**: senza questo passaggio Supabase manda le email solo a te, e i clienti non ricevono né l'invito né il codice. Usiamo **Brevo**, che è gratis fino a 300 email al giorno.
   - Crea l'account su <https://www.brevo.com>.
   - **Senders & IP → Senders → Add a sender**: nome `AgriHelp`, email del tuo dominio (es. `assistenza@gennariapp.com`; meglio non una @gmail.com, finirebbe nello spam). Conferma l'email che ti arriva. Se Brevo te lo propone, autentica anche il dominio (Domains): migliora la consegna.
   - **SMTP & API → SMTP → Generate a new SMTP key**: copia la chiave e annota il **Login** che vedi nella stessa pagina.
   - In Supabase: **Authentication → Emails → Set up SMTP** e compila:
     Sender email = l'email del punto sopra · Sender name = `AgriHelp` · Host = `smtp-relay.brevo.com` · Port = `587` · Username = il Login di Brevo · Password = la chiave SMTP. Salva.
   - **Authentication → Rate Limits**: porta "emails per hour" a 100.
   - Ora in **Authentication → Emails** puoi modificare i modelli:
     - **Magic Link**: oggetto `Il tuo codice AgriHelp`, corpo = contenuto del file `supabase/email/accesso.html`;
     - **Invite user**: oggetto `Sei invitato in AgriHelp`, corpo = contenuto del file `supabase/email/invito.html`.
5. **Authentication → Users → Add user → Create new user**: metti **la tua email**, spunta "Auto confirm". Sarai l'amministratore.
6. **Project Settings → API**: tieni aperta questa pagina, ti servono 3 valori:
   - Project URL
   - `anon` `public` key
   - `service_role` key (è segreta: non mandarla a nessuno)

## 2. Anthropic: l'assistente

1. Vai su <https://console.anthropic.com>, crea l'account, inserisci i dati di fatturazione e carica un credito (per iniziare bastano 20–50 €).
2. **API Keys → Create Key** → copiala.
3. Consiglio: in **Limits** metti un tetto di spesa mensile, così sei tranquillo.

Una domanda costa indicativamente pochi centesimi (di più se ci sono foto). Il modello predefinito è il più capace; se vuoi spendere meno, in Vercel puoi mettere `CLAUDE_MODEL=claude-sonnet-5-5`.

## 3. Vercel: l'app online

1. Vai su <https://vercel.com>, entra **con GitHub**.
2. **Add New → Project** → scegli il repository `agrihelp` → **Import**.
3. Apri **Settings → Environments → Production → Environment Variables** e aggiungi (nome = valore):

| Nome | Valore |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL di Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chiave `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | chiave `service_role` |
| `ANTHROPIC_API_KEY` | la chiave di Anthropic |
| `ADMIN_EMAIL` | la tua email (la stessa del punto 1.5) |
| `NOME_TECNICO` | `Aldo` |
| `NEXT_PUBLIC_TELEFONO_TECNICO` | il tuo numero, es. `+393331234567` |
| `NEXT_PUBLIC_SITE_URL` | l'indirizzo che ti dà Vercel, es. `https://agrihelp.vercel.app` |

4. **Deploy**. Dopo un paio di minuti hai l'indirizzo dell'app.
5. Torna in Supabase → **Authentication → URL Configuration**:
   - **Site URL** = l'indirizzo di Vercel;
   - **Redirect URLs** → aggiungi `https://IL-TUO-INDIRIZZO/auth/callback`.

Se più avanti vuoi un dominio tuo (es. `app.agrihelp.it`), si aggiunge in Vercel → Settings → Domains.

## 4. Primo accesso

1. Apri l'indirizzo dal telefono, scrivi la tua email, inserisci il codice che ti arriva. In alternativa tocca "Entra con la password" e usa la password che hai impostato per il tuo utente in Supabase.
2. Entri nel **Pannello tecnico**. Da lì:
   - **Clienti → Invita un nuovo cliente**: nome, email, telefono, gettoni (100 alla vendita) e la sua prima macchina. Il cliente riceve un'email e entra con un tocco.
   - **Manuali**: scegli i PDF e premi "Indicizza". L'assistente li userà subito.
   - **La mia esperienza**: scrivi i trucchi che sai solo tu. L'assistente li legge prima dei manuali.
   - **Casi**: qui arrivano le richieste "passa al tecnico". Puoi rispondere in chat, chiamare, aprire WhatsApp, segnare come risolto e salvare la soluzione nella tua esperienza.
3. "Prova la chat" in alto ti fa usare l'app come un cliente (tu non consumi gettoni).

Sul telefono: apri l'indirizzo nel browser → menu → **Aggiungi a schermata Home**. Diventa un'icona come un'app.

## 5. Facoltativo: avviso su Telegram quando un caso passa a te

1. Su Telegram scrivi a **@BotFather** → `/newbot` → scegli un nome → ti dà un **token**.
2. Scrivi un messaggio qualsiasi al tuo nuovo bot.
3. Apri `https://api.telegram.org/botIL_TOKEN/getUpdates` e cerca `"chat":{"id":NUMERO` → quel numero è il **chat id**.
4. In Vercel aggiungi `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`, poi **Redeploy**.

## 6. Facoltativo: importare tutto l'archivio di Google Drive

Per caricare molti manuali in una volta senza sceglierli a mano:

1. In <https://console.cloud.google.com> crea un progetto, attiva **Google Drive API**, crea un **Service account** e scarica la sua chiave JSON.
2. Su Drive condividi la cartella dei manuali (sola lettura) con l'email del service account.
3. Sul computer, nella cartella del progetto, crea il file `.env.local` (copia `.env.example`) e compila Supabase, `GOOGLE_SERVICE_ACCOUNT_FILE` (percorso del JSON) e `DRIVE_FOLDER_ID` (la parte finale del link della cartella).
4. Esegui: `npm install` e poi `node --env-file=.env.local scripts/importa-drive.mjs`

Le sottocartelle diventano marca e modello (es. `Manuali/Fendt/700 Vario/...`). Si può rilanciare quando aggiungi manuali: quelli già fatti vengono saltati.
I PDF scansionati (solo immagini) vengono saltati perché non hanno testo; per quelli servirà un passaggio di riconoscimento del testo (OCR).

---

## 7. Aggiornamento: categorie dei manuali (novembre 2026)

1. In Supabase apri **SQL Editor → New query**, incolla tutto il file `supabase/migrations/0002_categorie_manuali.sql` e premi **Run**. Non cancella nessun dato e si può rieseguire.
2. Nel pannello apri **Manuali**: in alto trovi il riquadro **Da riordinare**. Premi **Prepara le proposte**: l'assistente legge la copertina di ogni manuale e propone nome, categoria (Trattori, Attrezzature, Telescopici, Mietitrebbie e raccolta, Guida satellitare e GPS, Altro), marca, modello e tipo.
3. Controlla le proposte, correggi se serve e premi **Conferma** (o **Conferma tutte**). Finché non confermi, nessun dato cambia.
4. I manuali nuovi ricevono la proposta in automatico subito dopo il caricamento.

Ogni proposta è una piccola domanda all'assistente: costa pochi centesimi per manuale.

## Come funziona, in breve

- **Gettoni**: ogni domanda del cliente scala 1 gettone. Se l'assistente va in errore il gettone viene restituito. "Passa al tecnico" non costa gettoni. Lo storico movimenti per cliente è nella sua scheda (utile per le fatture).
- **Accesso**: entra solo chi inviti tu. Se blocchi un cliente, non entra più anche se ha ancora gettoni.
- **Manuali**: i PDF non vengono caricati né mostrati ai clienti. L'app salva il testo pagina per pagina e l'assistente cita solo brevi frasi con titolo e pagina.
- **Foto**: restano in un archivio privato; le vedete solo il cliente e tu.
- **Audio**: il microfono usa la dettatura del telefono (italiano). Ogni risposta ha il pulsante 🔊 per sentirla ad alta voce.
