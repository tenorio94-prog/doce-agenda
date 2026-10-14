-- Additive MVP: public page configuration; requests stay in pilot_agendas.state.
create table public.pilot_order_pages (
 owner_user_id uuid primary key references public.pilot_agendas(owner_user_id) on delete cascade,
 slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
 config jsonb not null check (jsonb_typeof(config)='object' and octet_length(config::text)<=65536),
 visits bigint not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.pilot_order_pages enable row level security;
revoke all on public.pilot_order_pages from public, anon, authenticated;
grant select,insert,update,delete on public.pilot_order_pages to service_role;

create table public.pilot_public_submissions (
 id bigint generated always as identity primary key,
 owner_user_id uuid not null references public.pilot_agendas(owner_user_id) on delete cascade,
 ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'), submitted_at timestamptz not null default now()
);
create index pilot_submission_ip_time on public.pilot_public_submissions(ip_hash,submitted_at);
create index pilot_submission_owner_time on public.pilot_public_submissions(owner_user_id,submitted_at);
alter table public.pilot_public_submissions enable row level security;
revoke all on public.pilot_public_submissions from public,anon,authenticated;
grant select,insert,delete on public.pilot_public_submissions to service_role;
grant usage,select on sequence public.pilot_public_submissions_id_seq to service_role;

-- Page registration and JSON state are committed together, including on restore.
create or replace function public.commit_pilot_agenda(p_owner uuid,p_expected_revision bigint,p_state jsonb,p_backup boolean)
returns bigint language plpgsql security invoker set search_path='' as $$
declare prior_state jsonb; prior_revision bigint; config jsonb; next_revision bigint;
begin
 if p_expected_revision is null or p_expected_revision<0 or p_state is null or octet_length(p_state::text)>5242880 then
  raise exception 'Invalid state or revision' using errcode='22023';
 end if;
 select state,revision into prior_state,prior_revision from public.pilot_agendas where owner_user_id=p_owner for update;
 if prior_revision is null or prior_revision<>p_expected_revision then raise exception 'Agenda changed; reload before saving' using errcode='40001'; end if;
 config:=p_state->'orderPage';
 if config is not null and coalesce(config->>'slug','')<>'' then
  insert into public.pilot_order_pages(owner_user_id,slug,config) values(p_owner,config->>'slug',config)
  on conflict(owner_user_id) do update set slug=excluded.slug,config=excluded.config,updated_at=now();
 else
  delete from public.pilot_order_pages where owner_user_id=p_owner;
 end if;
 if p_backup then
  insert into public.pilot_agenda_restore_points(owner_user_id,state,revision) values(p_owner,prior_state,prior_revision)
  on conflict(owner_user_id) do update set state=excluded.state,revision=excluded.revision,saved_at=now();
 end if;
 update public.pilot_agendas set state=p_state,revision=revision+1,updated_at=now()
 where owner_user_id=p_owner and revision=p_expected_revision returning revision into next_revision;
 return next_revision;
end; $$;
revoke all on function public.commit_pilot_agenda(uuid,bigint,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.commit_pilot_agenda(uuid,bigint,jsonb,boolean) to service_role;

create function public.submit_pilot_request(p_owner uuid,p_slug text,p_expected_revision bigint,p_state jsonb,p_ip_hash text)
returns bigint language plpgsql security invoker set search_path='' as $$
declare current_revision bigint; page_config jsonb; page_slug text; start_day timestamptz;
begin
 if p_ip_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid IP hash' using errcode='22023'; end if;
 -- Fixed lock order; global per-IP lock serializes rate checks across pages and instances.
 perform pg_advisory_xact_lock(hashtextextended(p_ip_hash,0));
 select revision into current_revision from public.pilot_agendas where owner_user_id=p_owner for update;
 if current_revision is null or current_revision<>p_expected_revision then raise exception 'Agenda changed' using errcode='40001'; end if;
 select config,slug into page_config,page_slug from public.pilot_order_pages where owner_user_id=p_owner;
 if page_slug is distinct from p_slug or not coalesce((page_config->>'active')::boolean,false) then raise exception 'Link disabled' using errcode='42501'; end if;
 start_day:=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
 if (select count(*) from public.pilot_public_submissions where ip_hash=p_ip_hash and submitted_at>now()-interval '1 hour')>=5
 or (select count(*) from public.pilot_public_submissions where owner_user_id=p_owner and submitted_at>=start_day)>=50 then
  raise exception 'Submission rate limit' using errcode='P0001';
 end if;
 insert into public.pilot_public_submissions(owner_user_id,ip_hash) values(p_owner,p_ip_hash);
 return public.commit_pilot_agenda(p_owner,p_expected_revision,p_state,false);
end; $$;
revoke all on function public.submit_pilot_request(uuid,text,bigint,jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_pilot_request(uuid,text,bigint,jsonb,text) to service_role;

create function public.record_pilot_page_visit(p_owner uuid) returns void language sql security invoker set search_path='' as $$
 update public.pilot_order_pages set visits=visits+1 where owner_user_id=p_owner and coalesce((config->>'active')::boolean,false);
$$;
revoke all on function public.record_pilot_page_visit(uuid) from public,anon,authenticated;
grant execute on function public.record_pilot_page_visit(uuid) to service_role;

-- Remove personal/free-form content from refused requests and retained restore points.
create function public.redact_pilot_refusals(p_state jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 select jsonb_set(p_state,'{orders}',coalesce(jsonb_agg(case
  when o->>'status'='Recusado' and (o->>'reviewedAt')::timestamptz<now()-interval '90 days' then
   (o - array['contact','location','details','cake','nextAction','nextAt','pendingChange','consentAt','possibleDuplicate','refusalReason','history']) ||
   jsonb_build_object('client','Dados removidos','anonymized',true,'refusalReason','Solicitação recusada — motivo pessoal removido após 90 dias','history','[]'::jsonb)
  else o end),'[]'::jsonb)) from jsonb_array_elements(p_state->'orders') o;
$$;
-- This function is time-dependent; STABLE, not IMMUTABLE.
alter function public.redact_pilot_refusals(jsonb) stable;
revoke all on function public.redact_pilot_refusals(jsonb) from public,anon,authenticated;
grant execute on function public.redact_pilot_refusals(jsonb) to service_role;
create function public.cleanup_pilot_request_data() returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.pilot_agendas set state=public.redact_pilot_refusals(state),revision=revision+1,updated_at=now()
 where exists(select 1 from jsonb_array_elements(state->'orders') o where o->>'status'='Recusado' and coalesce((o->>'anonymized')::boolean,false)=false and (o->>'reviewedAt')::timestamptz<now()-interval '90 days');
 update public.pilot_agenda_restore_points set state=public.redact_pilot_refusals(state)
 where exists(select 1 from jsonb_array_elements(state->'orders') o where o->>'status'='Recusado' and (o->>'reviewedAt')::timestamptz<now()-interval '90 days');
 delete from public.pilot_public_submissions where submitted_at<now()-interval '2 days';
end; $$;
revoke all on function public.cleanup_pilot_request_data() from public,anon,authenticated;
grant execute on function public.cleanup_pilot_request_data() to service_role;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('doce-agenda-request-retention','17 6 * * *','select public.cleanup_pilot_request_data()');

