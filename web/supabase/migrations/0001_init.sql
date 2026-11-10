-- Crema directory + user data.
-- Directory tables are public read-only; they are written by `npm run seed` with the secret key.
-- Profiles and enquiries have no direct access: the site goes through the functions at the bottom.

create table public.roasters (
  id          text primary key,
  position    int not null,
  name        text not null,
  city        text,
  region      text,
  status      text,
  shop        text,
  links       jsonb,
  note        text,
  sells_pods  boolean,
  wholesale   jsonb,
  logo        jsonb,
  offers      jsonb,
  offers_meta jsonb,
  lat         double precision,
  lng         double precision,
  geo         text,
  sample      boolean,
  updated_at  timestamptz not null default now()
);

create table public.beans (
  id             text primary key,
  position       int not null,
  roaster        text not null references public.roasters(id) on delete cascade,
  name           text not null,
  origin         text,
  producer       text,
  process        text,
  process_full   text,
  roast          text,
  brew_roast     text,
  roast_known    boolean,
  roast_note     text,
  notes          text[],
  listed_notes   text,
  taste          text,
  type           text,
  decaf          boolean,
  brew           text,
  format         text,
  url            text,
  source         text,
  in_stock       boolean,
  added_days     int,
  description    text,
  bag_img        text,
  link_type      text,
  price          double precision,
  price_basis    text,
  price_from     boolean,
  size_confirmed boolean,
  size           int,
  per_unit       boolean,
  unit           text,
  updated_at     timestamptz not null default now()
);
create index beans_roaster_idx on public.beans (roaster);

create table public.pods (like public.beans including defaults);
alter table public.pods
  add primary key (id),
  add foreign key (roaster) references public.roasters(id) on delete cascade,
  add column system    text,
  add column material  text,
  add column count     int,
  add column intensity int;
create index pods_roaster_idx on public.pods (roaster);

create table public.supermarket (
  id          text primary key,
  position    int not null,
  brand       text,
  name        text not null,
  format      text,
  kind        text,
  roast       text,
  brand_scale text,
  notes       text[],
  taste       text,
  price       double precision,
  size        int,
  price_note  text,
  source      text,
  blend       text,
  system      text,
  count       int,
  roaster_id  text,
  updated_at  timestamptz not null default now()
);

create table public.guides (
  id          text primary key,
  position    int not null,
  method      text not null,
  kind        text,
  difficulty  text,
  time        text,
  kit         text[],
  dose        int,
  water       int,
  grind       text,
  affinity    jsonb,
  taste_bonus jsonb,
  why         text,
  steps       text[],
  updated_at  timestamptz not null default now()
);

create table public.pod_tips (
  system     text primary key,
  tip        text not null,
  updated_at timestamptz not null default now()
);

-- Public read-only access to the directory
do $$
declare t text;
begin
  foreach t in array array['roasters','beans','pods','supermarket','guides','pod_tips'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- People's saved profiles (weekly picks). Keyed by a random token kept in their browser.
create table public.profiles (
  token      uuid primary key,
  name       text,
  email      text,
  consent    boolean not null default false,
  doc        jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.wholesale_enquiries (
  id            bigint generated always as identity primary key,
  business      text not null,
  business_type text,
  email         text not null,
  cups_per_day  int,
  message       text,
  supply        text,
  needs_machine boolean not null default false,
  location      text,
  roaster_ids   text[] not null,
  created_at    timestamptz not null default now()
);
alter table public.wholesale_enquiries enable row level security;

-- Functions the site calls. They run with table-owner rights, so they validate their input.
create function public.get_profile(p_token uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select doc from public.profiles where token = p_token;
$$;

create function public.save_profile(p_token uuid, p_doc jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if jsonb_typeof(p_doc) <> 'object' or octet_length(p_doc::text) > 100000 then
    raise exception 'invalid profile';
  end if;
  insert into public.profiles as p (token, name, email, consent, doc)
  values (p_token, left(p_doc->>'name', 60), left(p_doc->>'email', 120),
          coalesce((p_doc->>'consent')::boolean, false), p_doc)
  on conflict (token) do update
    set name = excluded.name, email = excluded.email, consent = excluded.consent,
        doc = excluded.doc, updated_at = now();
end;
$$;

create function public.delete_profile(p_token uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.profiles where token = p_token;
$$;

create function public.submit_enquiry(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare ids text[];
begin
  select coalesce(array_agg(left(v, 80)), '{}') into ids
  from jsonb_array_elements_text(coalesce(p->'roasterIds', '[]'::jsonb)) as v;
  if length(coalesce(p->>'business', '')) not between 1 and 120
     or coalesce(p->>'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or length(p->>'email') > 120
     or cardinality(ids) not between 1 and 5 then
    raise exception 'invalid enquiry';
  end if;
  insert into public.wholesale_enquiries
    (business, business_type, email, cups_per_day, message, supply, needs_machine, location, roaster_ids)
  values (p->>'business', left(p->>'businessType', 40), p->>'email',
          case when jsonb_typeof(p->'cupsPerDay') = 'number'
               then least(greatest((p->>'cupsPerDay')::numeric, 0), 100000)::int end,
          left(p->>'message', 2000), left(p->>'supply', 20),
          coalesce((p->>'needsMachine')::boolean, false), left(p->>'location', 60), ids);
end;
$$;

-- Explicit table access (newer projects don't expose new tables to the API automatically)
grant select on public.roasters, public.beans, public.pods, public.supermarket, public.guides, public.pod_tips
  to anon, authenticated;
grant all on public.roasters, public.beans, public.pods, public.supermarket, public.guides, public.pod_tips,
  public.profiles, public.wholesale_enquiries to service_role;
revoke all on public.profiles, public.wholesale_enquiries from anon, authenticated;

revoke all on function public.get_profile(uuid), public.save_profile(uuid, jsonb),
  public.delete_profile(uuid), public.submit_enquiry(jsonb) from public;
grant execute on function public.get_profile(uuid), public.save_profile(uuid, jsonb),
  public.delete_profile(uuid), public.submit_enquiry(jsonb) to anon, authenticated;
