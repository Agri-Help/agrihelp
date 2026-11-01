# AgriHelp

App di assistenza tecnica per trattori e guide satellitari: il cliente chatta (testo, voce, foto) con un assistente AI che consulta i manuali e l'esperienza del tecnico, e passa al tecnico i casi difficili.

- **Stack**: Next.js (web app installabile) · Supabase (accessi, database, foto) · Claude API
- **Messa online**: vedi [GUIDA.md](GUIDA.md)

## Sviluppo

```bash
npm install
cp .env.example .env.local   # e compila i valori
npm run dev
```

Schema database: `supabase/migrations/0001_agrihelp.sql`. Import da Google Drive: `scripts/importa-drive.mjs`.
