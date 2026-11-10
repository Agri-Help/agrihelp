-- AgriHelp: immagini delle pagine dei manuali (facoltative, scelte al caricamento).
-- Le immagini stanno nell'archivio privato "foto", cartella manuali/<id documento>/<pagina>.jpg
-- Si può eseguire più volte senza problemi (non cancella nessun dato).
alter table public.documenti add column if not exists immagini boolean not null default false;
