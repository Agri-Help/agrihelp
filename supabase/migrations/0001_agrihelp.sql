-- AgriHelp: schema iniziale
-- Da incollare in Supabase > SQL Editor > New query > Run

create extension if not exists pg_trgm;

-- PROFILI: un profilo per ogni utente invitato (clienti, colleghi, admin)
create table if not exists public.profili (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null default '',
  telefono text,
  azienda text,
  ruolo text not null default 'cliente' check (ruolo in ('cliente','collega','admin')),
  attivo boolean not null default true,
  gettoni integer not null default 0 check (gettoni >= 0),
  note text,
  creato_il timestamptz not null default now()
);

-- MACCHINE del cliente (le inserisce l'admin)
create table if not exists public.macchine (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profili(id) on delete cascade,
  tipo text not null default 'trattore',
  marca text not null,
  modello text not null,
  anno integer,
  matricola text,
  guida_satellitare text,
  note text,
  creato_il timestamptz not null default now()
);
create index if not exists macchine_cliente_idx on public.macchine(cliente_id);

-- CONVERSAZIONI (ogni "chiamata" del cliente)
create table if not exists public.conversazioni (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profili(id) on delete cascade,
  macchina_id uuid references public.macchine(id) on delete set null,
  titolo text not null default 'Nuova richiesta',
  stato text not null default 'aperta' check (stato in ('aperta','al_tecnico','risolta')),
  motivo_tecnico text,
  passata_il timestamptz,
  letta_dal_tecnico boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index if not exists conv_cliente_idx on public.conversazioni(cliente_id, aggiornato_il desc);
create index if not exists conv_stato_idx on public.conversazioni(stato, aggiornato_il desc);

-- MESSAGGI
create table if not exists public.messaggi (
  id uuid primary key default gen_random_uuid(),
  conversazione_id uuid not null references public.conversazioni(id) on delete cascade,
  ruolo text not null check (ruolo in ('cliente','assistente','tecnico','sistema')),
  testo text not null default '',
  foto text[] not null default '{}',
  fonti jsonb not null default '[]',
  creato_il timestamptz not null default now()
);
create index if not exists msg_conv_idx on public.messaggi(conversazione_id, creato_il);

-- MOVIMENTI GETTONI (storico per le fatture)
create table if not exists public.movimenti_gettoni (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profili(id) on delete cascade,
  quantita integer not null,
  motivo text not null,
  creato_il timestamptz not null default now()
);
create index if not exists mov_cliente_idx on public.movimenti_gettoni(cliente_id, creato_il desc);

-- DOCUMENTI (manuali, bollettini) indicizzati
create table if not exists public.documenti (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  tipo text not null default 'manuale' check (tipo in ('manuale','bollettino','schema','altro')),
  marca text,
  modelli text,
  link_drive text,
  drive_file_id text unique,
  pagine integer not null default 0,
  creato_il timestamptz not null default now()
);

-- BRANI: il testo dei documenti, pagina per pagina
create table if not exists public.brani (
  id bigint generated always as identity primary key,
  documento_id uuid not null references public.documenti(id) on delete cascade,
  pagina integer not null,
  testo text not null,
  tsv tsvector generated always as (
    to_tsvector('italian', testo) || to_tsvector('simple', testo)
  ) stored
);
create index if not exists brani_tsv_idx on public.brani using gin(tsv);
create index if not exists brani_doc_idx on public.brani(documento_id, pagina);

-- ESPERIENZA DEL TECNICO: soluzioni, trucchi, casi risolti
create table if not exists public.esperienze (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  marca text,
  modelli text,
  testo text not null,
  creato_il timestamptz not null default now(),
  tsv tsvector generated always as (
    to_tsvector('italian', coalesce(titolo,'') || ' ' || testo || ' ' || coalesce(marca,'') || ' ' || coalesce(modelli,''))
    || to_tsvector('simple', coalesce(titolo,'') || ' ' || testo || ' ' || coalesce(marca,'') || ' ' || coalesce(modelli,''))
  ) stored
);
create index if not exists esp_tsv_idx on public.esperienze using gin(tsv);

-- Scala un gettone in modo sicuro (restituisce i gettoni rimasti, oppure -1 se finiti)
create or replace function public.usa_gettone(p_cliente uuid, p_motivo text)
returns integer language plpgsql security definer set search_path = public as $$
declare rimasti integer;
begin
  update profili set gettoni = gettoni - 1
   where id = p_cliente and gettoni > 0
   returning gettoni into rimasti;
  if rimasti is null then return -1; end if;
  insert into movimenti_gettoni(cliente_id, quantita, motivo) values (p_cliente, -1, p_motivo);
  return rimasti;
end $$;

-- Ricarica gettoni (solo dal pannello admin)
create or replace function public.ricarica_gettoni(p_cliente uuid, p_quantita integer, p_motivo text)
returns integer language plpgsql security definer set search_path = public as $$
declare nuovi integer;
begin
  update profili set gettoni = greatest(0, gettoni + p_quantita)
   where id = p_cliente returning gettoni into nuovi;
  insert into movimenti_gettoni(cliente_id, quantita, motivo) values (p_cliente, p_quantita, p_motivo);
  return nuovi;
end $$;

-- Ricerca nei manuali e nell'esperienza del tecnico.
-- p_parole: parole chiave separate da spazio (vengono messe in OR)
create or replace function public.cerca_conoscenza(p_parole text, p_marca text default null, p_limite integer default 8)
returns table(fonte text, documento_id uuid, titolo text, tipo text, pagina integer, link_drive text, testo text, punteggio real)
language sql stable security definer set search_path = public as $$
  with q as (
    select
      to_tsquery('simple',  array_to_string(array(select quote_literal(w) || ':*' from regexp_split_to_table(lower(p_parole), '[^[:alnum:]]+') w where length(w) > 1), ' | ')) as qs,
      to_tsquery('italian', array_to_string(array(select quote_literal(w) from regexp_split_to_table(lower(p_parole), '[^[:alnum:]]+') w where length(w) > 2), ' | ')) as qi
  ),
  m as (
    select 'manuale'::text as fonte, d.id, d.titolo, d.tipo, b.pagina, d.link_drive, b.testo,
           (ts_rank_cd(b.tsv, q.qs) + ts_rank_cd(b.tsv, q.qi)
             + case when p_marca is not null and d.marca ilike p_marca then 0.2 else 0 end)::real as punteggio
      from brani b join documenti d on d.id = b.documento_id, q
     where b.tsv @@ q.qs or b.tsv @@ q.qi
  ),
  e as (
    select 'esperienza'::text, x.id, x.titolo, 'esperienza'::text, null::integer, null::text, x.testo,
           (ts_rank_cd(x.tsv, q.qs) + ts_rank_cd(x.tsv, q.qi) + 0.3
             + case when p_marca is not null and x.marca ilike p_marca then 0.2 else 0 end)::real
      from esperienze x, q
     where x.tsv @@ q.qs or x.tsv @@ q.qi
  )
  select * from (select * from m union all select * from e) t
  order by punteggio desc
  limit p_limite;
$$;

-- SICUREZZA: tutte le tabelle chiuse. L'app legge e scrive solo dal server,
-- dopo aver controllato chi è l'utente.
alter table public.profili enable row level security;
alter table public.macchine enable row level security;
alter table public.conversazioni enable row level security;
alter table public.messaggi enable row level security;
alter table public.movimenti_gettoni enable row level security;
alter table public.documenti enable row level security;
alter table public.brani enable row level security;
alter table public.esperienze enable row level security;

revoke execute on function public.usa_gettone(uuid, text) from public, anon, authenticated;
revoke execute on function public.ricarica_gettoni(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.cerca_conoscenza(text, text, integer) from public, anon, authenticated;
grant execute on function public.usa_gettone(uuid, text) to service_role;
grant execute on function public.ricarica_gettoni(uuid, integer, text) to service_role;
grant execute on function public.cerca_conoscenza(text, text, integer) to service_role;

-- Archivio privato per le foto inviate in chat
insert into storage.buckets (id, name, public)
values ('foto', 'foto', false)
on conflict (id) do nothing;
