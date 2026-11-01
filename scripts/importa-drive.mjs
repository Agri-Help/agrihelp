// Importa i manuali PDF da una cartella di Google Drive dentro AgriHelp.
//
// Uso (dal computer, nella cartella del progetto):
//   node --env-file=.env.local scripts/importa-drive.mjs
//
// Variabili richieste in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_SERVICE_ACCOUNT_FILE  = percorso del file JSON dell'account di servizio Google
//   DRIVE_FOLDER_ID              = id della cartella dei manuali (la parte finale del link di Drive)
//
// La cartella va condivisa (in sola lettura) con l'email dell'account di servizio.
// La prima sottocartella viene usata come "marca", la seconda come "modelli".
// I file già importati vengono saltati: si può rilanciare quando si aggiungono manuali.

import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { getDocumentProxy, extractText } from "unpdf";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });
const RADICE = process.env.DRIVE_FOLDER_ID;
const MAX_MB = Number(process.env.MAX_MB || 200);

function tipoDa(nome) {
  const n = nome.toLowerCase();
  if (/bollettin|bulletin|service info|tsb/.test(n)) return "bollettino";
  if (/schem|wiring|elettric|idraulic/.test(n)) return "schema";
  return "manuale";
}

async function* elenca(cartellaId, percorso = []) {
  let pageToken;
  do {
    const r = await drive.files.list({
      q: `'${cartellaId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size, webViewLink)",
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of r.data.files || []) {
      if (f.mimeType === "application/vnd.google-apps.folder") yield* elenca(f.id, [...percorso, f.name]);
      else if (f.mimeType === "application/pdf") yield { ...f, percorso };
    }
    pageToken = r.data.nextPageToken;
  } while (pageToken);
}

async function main() {
  if (!RADICE) throw new Error("Manca DRIVE_FOLDER_ID");
  let fatti = 0, saltati = 0, errori = 0;
  for await (const f of elenca(RADICE)) {
    const { data: esiste } = await sb.from("documenti").select("id").eq("drive_file_id", f.id).maybeSingle();
    if (esiste) { saltati++; continue; }
    const mb = Number(f.size || 0) / 1e6;
    if (mb > MAX_MB) { console.log(`⏭  ${f.name}: troppo grande (${mb.toFixed(0)} MB)`); saltati++; continue; }
    try {
      process.stdout.write(`📖 ${[...f.percorso, f.name].join(" / ")} … `);
      const r = await drive.files.get({ fileId: f.id, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer" });
      const pdf = await getDocumentProxy(new Uint8Array(r.data));
      const { totalPages, text } = await extractText(pdf, { mergePages: false });
      const caratteri = text.reduce((a, t) => a + t.trim().length, 0);
      if (caratteri < totalPages * 30) { console.log("scansionato, senza testo: saltato"); saltati++; continue; }
      const { data: doc, error } = await sb.from("documenti").insert({
        titolo: f.name.replace(/\.pdf$/i, "").replace(/_+/g, " "),
        tipo: tipoDa(f.name),
        marca: f.percorso[0] || null,
        modelli: f.percorso[1] || null,
        link_drive: f.webViewLink,
        drive_file_id: f.id,
        pagine: totalPages,
      }).select("id").single();
      if (error) throw error;
      for (let i = 0; i < text.length; i += 50) {
        const righe = text.slice(i, i + 50)
          .map((t, k) => ({ documento_id: doc.id, pagina: i + k + 1, testo: t.replace(/\u0000/g, "").trim() }))
          .filter((x) => x.testo.length > 20);
        if (righe.length) {
          const { error: e2 } = await sb.from("brani").insert(righe);
          if (e2) throw e2;
        }
      }
      console.log(`✅ ${totalPages} pagine`);
      fatti++;
    } catch (e) {
      console.log(`❌ ${e.message || e}`);
      errori++;
    }
  }
  console.log(`\nFinito: ${fatti} importati, ${saltati} saltati, ${errori} errori.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
