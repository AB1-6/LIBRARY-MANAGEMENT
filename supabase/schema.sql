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

create table if not exists public.trigger_events (
  id bigserial primary key,
  event_type text not null,
  resource text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trigger_events_resource_idx
  on public.trigger_events (resource, created_at desc);

create or replace function public.handle_entity_resource_triggers()
returns trigger
language plpgsql
as $$
declare
  old_status text;
  new_status text;
begin
  if tg_op = 'INSERT' then
    if new.resource = 'issues' then
      insert into public.trigger_events (event_type, resource, entity_id, payload)
      values ('issue_created', new.resource, new.id, new.data);
      perform pg_notify('library_events', json_build_object('event','issue_created','resource',new.resource,'id',new.id)::text);
    elsif new.resource = 'notifications' then
      insert into public.trigger_events (event_type, resource, entity_id, payload)
      values ('notification_created', new.resource, new.id, new.data);
    elsif new.resource = 'fines' then
      insert into public.trigger_events (event_type, resource, entity_id, payload)
      values ('fine_created', new.resource, new.id, new.data);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.resource = 'issues' then
      old_status := coalesce(old.data->>'status', '');
      new_status := coalesce(new.data->>'status', '');

      if old_status <> 'returned' and new_status = 'returned' then
        insert into public.trigger_events (event_type, resource, entity_id, payload)
        values ('issue_returned', new.resource, new.id, new.data);
        perform pg_notify('library_events', json_build_object('event','issue_returned','resource',new.resource,'id',new.id)::text);
      elsif old_status <> new_status then
        insert into public.trigger_events (event_type, resource, entity_id, payload)
        values ('issue_status_changed', new.resource, new.id, new.data);
      end if;
    elsif new.resource = 'waitlist' then
      old_status := coalesce(old.data->>'status', '');
      new_status := coalesce(new.data->>'status', '');
      if old_status <> 'notified' and new_status = 'notified' then
        insert into public.trigger_events (event_type, resource, entity_id, payload)
        values ('waitlist_notified', new.resource, new.id, new.data);
      end if;
    elsif new.resource = 'fines' then
      insert into public.trigger_events (event_type, resource, entity_id, payload)
      values ('fine_updated', new.resource, new.id, new.data);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists entity_resources_business_triggers on public.entity_resources;
create trigger entity_resources_business_triggers
after insert or update on public.entity_resources
for each row
execute function public.handle_entity_resource_triggers();

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

alter table public.trigger_events enable row level security;

drop policy if exists "No direct anon read trigger_events" on public.trigger_events;
create policy "No direct anon read trigger_events"
  on public.trigger_events
  for select
  to anon
  using (false);

drop policy if exists "No direct anon write trigger_events" on public.trigger_events;
create policy "No direct anon write trigger_events"
  on public.trigger_events
  for all
  to anon
  using (false)
  with check (false);
