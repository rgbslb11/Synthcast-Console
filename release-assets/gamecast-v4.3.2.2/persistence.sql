-- Scoped additive infrastructure for 4.3.2.2 only. No old RPC or existing result is modified.
create extension if not exists pg_cron with schema pg_catalog;
do $$ begin
  if not exists(select 1 from vault.secrets where name='gamecast_v4322_deadman') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'gamecast_v4322_deadman','Release-scoped Dead-Man worker credential');
  end if;
end $$;
create or replace function public.gamecast_v4322_scheduler_auth(p_hash text)
returns boolean language sql stable security definer set search_path=pg_catalog
as $$ select exists(select 1 from vault.decrypted_secrets where name='gamecast_v4322_deadman' and encode(extensions.digest(decrypted_secret,'sha256'),'hex')=p_hash); $$;
revoke all on function public.gamecast_v4322_scheduler_auth(text) from public,anon,authenticated;
grant execute on function public.gamecast_v4322_scheduler_auth(text) to service_role;
create or replace function public.gamecast_v4322_scheduler_sessions()
returns table(public_slug text) language sql stable security definer set search_path=pg_catalog
as $$
select s.public_slug from gamecast_v12.sessions s
where s.week_key='2026-W05' and s.engine_version='GC-W5-SAT-V4.3.2.2-RC1'
  and s.public_slug ~ '^w5satv4322-[a-f0-9]{16}$'
  and (s.expires_at is null or s.expires_at>now())
  and exists(select 1 from jsonb_array_elements(s.state) g where
    g->'deadman'->>'status'='ARMED' or
    (g->'deadman'->>'status'='AUTONOMOUS' and g->>'lifecycle' in ('ACTIVE','EDIT','DELAY')))
order by s.created_at;
$$;
revoke all on function public.gamecast_v4322_scheduler_sessions() from public,anon,authenticated;
grant execute on function public.gamecast_v4322_scheduler_sessions() to service_role;
create or replace function public.gamecast_v4322_commit(
  p_session_id uuid,p_expected_version bigint,p_state jsonb,p_stamp timestamptz,p_events jsonb,p_actor text
) returns table(state jsonb,state_version bigint,last_advanced_at timestamptz)
language plpgsql security definer set search_path=pg_catalog
as $$
declare oldrow gamecast_v12.sessions%rowtype; ev jsonb;
begin
  select s.* into oldrow from gamecast_v12.sessions s where s.session_id=p_session_id for update;
  if not found or oldrow.engine_version<>'GC-W5-SAT-V4.3.2.2-RC1' or oldrow.week_key<>'2026-W05' or oldrow.public_slug !~ '^w5satv4322-[a-f0-9]{16}$' then
    raise exception 'Foreign release/session rejected';
  end if;
  if oldrow.state_version<>p_expected_version then return; end if;
  if p_stamp is null or p_stamp<oldrow.last_advanced_at then return; end if;
  if p_actor is null or p_actor not in ('CHAIRMAN','SCHEDULER') then raise exception 'Invalid actor'; end if;
  if p_state is null or jsonb_typeof(p_state)<>'array' or jsonb_array_length(p_state)<>49 then raise exception 'Saturday state count mismatch'; end if;
  if (select count(distinct g->>'id') from jsonb_array_elements(p_state) g)<>49 or
     (select jsonb_agg(g->>'id' order by g->>'id') from jsonb_array_elements(p_state) g) is distinct from
     (select jsonb_agg(g->>'id' order by g->>'id') from jsonb_array_elements(oldrow.state) g) then raise exception 'Game identity mismatch'; end if;
  if p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)=0 then raise exception 'Audit events required'; end if;
  if exists(select 1 from jsonb_array_elements(p_state) g join jsonb_array_elements(oldrow.state) o on g->>'id'=o->>'id'
    where o->>'qaOnly'='true' and (g->>'qaOnly' is distinct from 'true' or g->>'lifecycle' in ('READY','FINAL','SEUD PUBLISHED'))) then
    raise exception 'QA promotion rejected';
  end if;
  if p_actor='SCHEDULER' and exists(select 1 from jsonb_array_elements(p_state) g join jsonb_array_elements(oldrow.state) o on g->>'id'=o->>'id'
    where (g->>'lifecycle' in ('LOCKED','READY','FINAL','SEUD PUBLISHED') or o->>'lifecycle' in ('LOCKED','READY','FINAL','SEUD PUBLISHED')) and g is distinct from o) then
    raise exception 'Scheduler cannot lock, accept, publish or change an accepted result';
  end if;
  update gamecast_v12.sessions s set state=p_state,state_version=s.state_version+1,last_advanced_at=p_stamp,updated_at=p_stamp
    where s.session_id=p_session_id returning s.state,s.state_version,s.last_advanced_at into state,state_version,last_advanced_at;
  for ev in select value from jsonb_array_elements(p_events) loop
    if ev->>'type' is null or ev->>'type' !~ '^V4322_' then raise exception 'Invalid event namespace'; end if;
    if ev->>'gameId' is not null and not exists(select 1 from jsonb_array_elements(p_state) g where g->>'id'=ev->>'gameId') then raise exception 'Invalid event game'; end if;
    insert into gamecast_v12.events(session_id,state_version,event_type,game_id,payload)
      values(p_session_id,state_version,ev->>'type',ev->>'gameId',coalesce(ev->'payload','{}'::jsonb)||jsonb_build_object('actor',p_actor));
  end loop;
  return next;
end;
$$;
revoke all on function public.gamecast_v4322_commit(uuid,bigint,jsonb,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function public.gamecast_v4322_commit(uuid,bigint,jsonb,timestamptz,jsonb,text) to service_role;
