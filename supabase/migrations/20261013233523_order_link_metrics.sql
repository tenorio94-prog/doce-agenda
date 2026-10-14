create table public.pilot_owner_activity (
 owner_user_id uuid primary key references auth.users(id) on delete cascade,
 last_seen_at timestamptz not null default now()
);
alter table public.pilot_owner_activity enable row level security;
revoke all on public.pilot_owner_activity from public,anon,authenticated;
grant select,insert,update,delete on public.pilot_owner_activity to service_role;
create function public.record_pilot_owner_visit(p_owner uuid) returns void language sql security invoker set search_path='' as $$
 insert into public.pilot_owner_activity(owner_user_id,last_seen_at) values(p_owner,now())
 on conflict(owner_user_id) do update set last_seen_at=now();
$$;
revoke all on function public.record_pilot_owner_visit(uuid) from public,anon,authenticated;
grant execute on function public.record_pilot_owner_visit(uuid) to service_role;
