-- Dedicated Doce Agenda tables; existing unrelated tables are preserved.
-- One agenda per owner in the first beta; no team-sharing permissions implied.
create table public.pilot_agendas (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id),
  business_name text not null check (char_length(business_name) between 1 and 120),
  state jsonb not null check (coalesce((
    jsonb_typeof(state) = 'object'
    and state->>'version' = '1'
    and jsonb_typeof(state->'orders') = 'array'
    and jsonb_typeof(state->'payments') = 'array'
  ), false) and octet_length(state::text) <= 5242880),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);
alter table public.pilot_agendas enable row level security;
revoke all on public.pilot_agendas from anon, authenticated;
grant select on public.pilot_agendas to authenticated;
grant select, insert, update on public.pilot_agendas to service_role;
create policy read_own_agenda on public.pilot_agendas
  for select to authenticated using ((select auth.uid()) = owner_user_id);

-- Writes must go through the authenticated backend and its business-rule engine.
create table public.pilot_agenda_restore_points (
  owner_user_id uuid primary key references public.pilot_agendas(owner_user_id),
  state jsonb not null,
  revision bigint not null,
  saved_at timestamptz not null default now()
);
alter table public.pilot_agenda_restore_points enable row level security;
revoke all on public.pilot_agenda_restore_points from anon, authenticated;
grant select, insert, update on public.pilot_agenda_restore_points to service_role;

-- Optimistic concurrency prevents overwriting an agenda read before another edit.
create function public.commit_pilot_agenda(
  p_owner uuid, p_expected_revision bigint, p_state jsonb, p_backup boolean
) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare next_revision bigint; previous_state jsonb; previous_revision bigint;
begin
  if p_expected_revision is null or p_expected_revision < 0 or p_state is null or octet_length(p_state::text) > 5242880 then
    raise exception 'Invalid state or revision' using errcode = '22023';
  end if;
  select state, revision into previous_state, previous_revision
  from public.pilot_agendas where owner_user_id = p_owner for update;
  if previous_revision is null or previous_revision <> p_expected_revision then
    raise exception 'Agenda changed; reload before saving' using errcode = '40001';
  end if;
  if p_backup then
    insert into public.pilot_agenda_restore_points(owner_user_id, state, revision)
    values(p_owner, previous_state, previous_revision)
    on conflict(owner_user_id) do update set state = excluded.state,
      revision = excluded.revision, saved_at = now();
  end if;
  update public.pilot_agendas
  set state = p_state, revision = revision + 1, updated_at = now()
  where owner_user_id = p_owner and revision = p_expected_revision
  returning revision into next_revision;
  if next_revision is null then
    raise exception 'Agenda changed; reload before saving' using errcode = '40001';
  end if;
  return next_revision;
end;
$$;
revoke all on function public.commit_pilot_agenda(uuid, bigint, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.commit_pilot_agenda(uuid, bigint, jsonb, boolean) to service_role;
