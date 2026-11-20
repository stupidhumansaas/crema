-- Rory's handover (Nov 2026): roaster addresses, and brew setup / training on wholesale enquiries.
alter table public.roasters
  add column address         text,
  add column town            text,
  add column county          text,
  add column postcode        text,
  add column addr_type       text,
  add column roasterlist_url text;

alter table public.wholesale_enquiries
  add column brew_type text,
  add column training  text;

create or replace function public.submit_enquiry(p jsonb)
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
    (business, business_type, email, cups_per_day, message, supply, needs_machine, location, roaster_ids, brew_type, training)
  values (p->>'business', left(p->>'businessType', 40), p->>'email',
          case when jsonb_typeof(p->'cupsPerDay') = 'number'
               then least(greatest((p->>'cupsPerDay')::numeric, 0), 100000)::int end,
          left(p->>'message', 2000), left(p->>'supply', 20),
          coalesce((p->>'needsMachine')::boolean, false), left(p->>'location', 60), ids,
          nullif(left(p->>'brewType', 20), ''), nullif(left(p->>'training', 20), ''));
end;
$$;
