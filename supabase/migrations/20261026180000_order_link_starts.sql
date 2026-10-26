-- Funil do link: quantas vezes alguém começou um pedido na vitrine. Só um número por página, sem dado pessoal.
-- Aplicar só com autorização de Lucas. Sem esta migração, o servidor segue funcionando e o funil não aparece.
alter table public.pilot_order_pages add column if not exists starts integer not null default 0;
create or replace function public.record_pilot_page_start(p_owner uuid) returns void language sql security invoker set search_path='' as $$
 update public.pilot_order_pages set starts=starts+1 where owner_user_id=p_owner and coalesce((config->>'active')::boolean,false);
$$;
revoke all on function public.record_pilot_page_start(uuid) from public,anon,authenticated;
grant execute on function public.record_pilot_page_start(uuid) to service_role;
