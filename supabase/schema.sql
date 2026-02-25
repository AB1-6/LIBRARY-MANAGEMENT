create table if not exists public.entity_resources (
  resource text not null,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (resource, id)
);

create index if not exists entity_resources_resource_idx
  on public.entity_resources (resource);

create or replace function public.set_entity_resources_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entity_resources_set_updated_at on public.entity_resources;
create trigger entity_resources_set_updated_at
before update on public.entity_resources
for each row
execute function public.set_entity_resources_updated_at();

alter table public.entity_resources enable row level security;

-- Server-side API uses service role key, so strict client policies are fine.
drop policy if exists "No direct anon read" on public.entity_resources;
create policy "No direct anon read"
  on public.entity_resources
  for select
  to anon
  using (false);

drop policy if exists "No direct anon write" on public.entity_resources;
create policy "No direct anon write"
  on public.entity_resources
  for all
  to anon
  using (false)
  with check (false);
