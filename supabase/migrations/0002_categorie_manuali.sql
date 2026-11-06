-- AgriHelp: categorie dei manuali e proposte automatiche da confermare.
-- Si può eseguire più volte senza problemi (non cancella nessun dato).

alter table public.documenti add column if not exists categoria text;
alter table public.documenti add column if not exists proposta jsonb;
alter table public.documenti add column if not exists confermato boolean not null default false;

-- Nuovo tipo "officina" (manuale d'officina / riparazione) oltre a quelli già presenti
alter table public.documenti drop constraint if exists documenti_tipo_check;
alter table public.documenti add constraint documenti_tipo_check
  check (tipo in ('manuale','officina','bollettino','schema','altro'));

alter table public.documenti drop constraint if exists documenti_categoria_check;
alter table public.documenti add constraint documenti_categoria_check
  check (categoria is null or categoria in ('trattori','attrezzature','telescopici','raccolta','guida','altro'));

create index if not exists documenti_categoria_idx on public.documenti(categoria, marca);

-- Ricerca: a parità di testo, preferisce i manuali della marca e del modello del cliente
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
             + case when p_marca is not null and d.marca ilike p_marca then 0.2 else 0 end
             + case when d.modelli is not null and length(d.modelli) > 1
                         and lower(p_parole) like '%' || lower(d.modelli) || '%' then 0.2 else 0 end)::real as punteggio
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

revoke execute on function public.cerca_conoscenza(text, text, integer) from public, anon, authenticated;
grant execute on function public.cerca_conoscenza(text, text, integer) to service_role;
