-- Dedicated QA-only persistence. No writes or foreign keys to operating release tables.
create schema if not exists gamecast_test451;
revoke all on schema gamecast_test451 from public,anon,authenticated;
create table if not exists gamecast_test451.sessions (
 session_id uuid primary key default gen_random_uuid(), public_slug text not null unique check(public_slug ~ '^testw6v451-[a-f0-9]{16}$'),
 operator_token_hash text not null, week_key text not null check(week_key='2026-W06'),
 engine_version text not null check(engine_version='GC-W6-V4.5.1-TEST1'),data_version text not null,lifecycle text not null default 'ACTIVE',
 state jsonb not null check(jsonb_typeof(state)='array' and jsonb_array_length(state)=56),state_version bigint not null default 1,
 last_advanced_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),expires_at timestamptz);
create table if not exists gamecast_test451.events (
 event_id bigint generated always as identity primary key,session_id uuid not null references gamecast_test451.sessions(session_id),
 state_version bigint not null,event_type text not null,game_id text,payload jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
alter table gamecast_test451.sessions enable row level security;
alter table gamecast_test451.events enable row level security;
revoke all on all tables in schema gamecast_test451 from public,anon,authenticated;
revoke all on all sequences in schema gamecast_test451 from public,anon,authenticated;
create or replace function public.gamecast_test451_create_session(p_public_slug text,p_operator_token_hash text,p_week_key text,p_engine_version text,p_data_version text,p_state jsonb)
returns table(public_slug text,state_version bigint,last_advanced_at timestamptz,created_at timestamptz)
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if p_state is null or jsonb_typeof(p_state)<>'array' or jsonb_array_length(p_state)<>56 then raise exception 'QA slate count mismatch'; end if;
 if (select count(distinct g->>'id') from jsonb_array_elements(p_state) g)<>56 or exists(select 1 from jsonb_array_elements(p_state) g where g->>'qaOnly' is distinct from 'true' or g->>'lifecycle' is distinct from 'UNLAUNCHED') then raise exception 'QA initial state required'; end if;
 return query insert into gamecast_test451.sessions as s (public_slug,operator_token_hash,week_key,engine_version,data_version,state)
 values(p_public_slug,p_operator_token_hash,p_week_key,p_engine_version,p_data_version,p_state)
 returning s.public_slug,s.state_version,s.last_advanced_at,s.created_at;
end; $$;
revoke all on function public.gamecast_test451_create_session(text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.gamecast_test451_create_session(text,text,text,text,text,jsonb) to service_role;
CREATE OR REPLACE FUNCTION public.gamecast_test451_read_session(p_slug text)
 RETURNS TABLE(session_id uuid, public_slug text, operator_token_hash text, week_key text, state jsonb, state_version bigint, last_advanced_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  select s.session_id, s.public_slug, s.operator_token_hash, s.week_key, s.state,
         s.state_version, s.last_advanced_at, s.updated_at
  from gamecast_test451.sessions s
  where s.public_slug = p_slug
  limit 1;
$function$;

revoke all on function public.gamecast_test451_read_session(text) from public,anon,authenticated;
grant execute on function public.gamecast_test451_read_session(text) to service_role;
-- Scoped additive infrastructure for 4.5.1 test only. No old RPC or existing result is modified.
create extension if not exists pg_cron with schema pg_catalog;
do $$ begin
  if not exists(select 1 from vault.secrets where name='gamecast_test451_deadman') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'gamecast_test451_deadman','Release-scoped Dead-Man worker credential');
  end if;
end $$;
create or replace function public.gamecast_test451_scheduler_auth(p_hash text)
returns boolean language sql stable security definer set search_path=pg_catalog
as $$ select exists(select 1 from vault.decrypted_secrets where name='gamecast_test451_deadman' and encode(extensions.digest(decrypted_secret,'sha256'),'hex')=p_hash); $$;
revoke all on function public.gamecast_test451_scheduler_auth(text) from public,anon,authenticated;
grant execute on function public.gamecast_test451_scheduler_auth(text) to service_role;
create or replace function public.gamecast_test451_scheduler_sessions()
returns table(public_slug text) language sql stable security definer set search_path=pg_catalog
as $$
select s.public_slug from gamecast_test451.sessions s
where s.week_key='2026-W06' and s.engine_version='GC-W6-V4.5.1-TEST1'
  and s.public_slug ~ '^testw6v451-[a-f0-9]{16}$'
  and (s.expires_at is null or s.expires_at>now())
  and exists(select 1 from jsonb_array_elements(s.state) g where
    g->'deadman'->>'status'='ARMED' or
    (g->'deadman'->>'status'='AUTONOMOUS' and g->>'lifecycle' in ('ACTIVE','EDIT','DELAY')))
order by s.created_at;
$$;
revoke all on function public.gamecast_test451_scheduler_sessions() from public,anon,authenticated;
grant execute on function public.gamecast_test451_scheduler_sessions() to service_role;
create or replace function public.gamecast_test451_commit(
  p_session_id uuid,p_expected_version bigint,p_state jsonb,p_stamp timestamptz,p_events jsonb,p_actor text
) returns table(state jsonb,state_version bigint,last_advanced_at timestamptz)
language plpgsql security definer set search_path=pg_catalog
as $$
declare oldrow gamecast_test451.sessions%rowtype; ev jsonb;
begin
  select s.* into oldrow from gamecast_test451.sessions s where s.session_id=p_session_id for update;
  if not found or oldrow.engine_version<>'GC-W6-V4.5.1-TEST1' or oldrow.week_key<>'2026-W06' or oldrow.public_slug !~ '^testw6v451-[a-f0-9]{16}$' then
    raise exception 'Foreign release/session rejected';
  end if;
  if oldrow.state_version<>p_expected_version then return; end if;
  if p_stamp is null or p_stamp<oldrow.last_advanced_at then return; end if;
  if p_actor is null or p_actor not in ('CHAIRMAN','SCHEDULER') then raise exception 'Invalid actor'; end if;
  if p_state is null or jsonb_typeof(p_state)<>'array' or jsonb_array_length(p_state)<>56 then raise exception 'Week 6 state count mismatch'; end if;
  if (select count(distinct g->>'id') from jsonb_array_elements(p_state) g)<>56 or
     (select jsonb_agg(g->>'id' order by g->>'id') from jsonb_array_elements(p_state) g) is distinct from
     (select jsonb_agg(g->>'id' order by g->>'id') from jsonb_array_elements(oldrow.state) g) then raise exception 'Game identity mismatch'; end if;
  if p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)=0 then raise exception 'Audit events required'; end if;
  if exists(select 1 from jsonb_array_elements(p_state) g join jsonb_array_elements(oldrow.state) o on g->>'id'=o->>'id'
    where g->>'qaOnly' is distinct from 'true' or g->>'lifecycle' in ('READY','FINAL','SEUD PUBLISHED')) then
    raise exception 'QA promotion rejected';
  end if;
  if p_actor='SCHEDULER' and exists(select 1 from jsonb_array_elements(p_state) g join jsonb_array_elements(oldrow.state) o on g->>'id'=o->>'id'
    where (g->>'lifecycle' in ('LOCKED','READY','FINAL','SEUD PUBLISHED') or o->>'lifecycle' in ('LOCKED','READY','FINAL','SEUD PUBLISHED')) and g is distinct from o) then
    raise exception 'Scheduler cannot lock, accept, publish or change an accepted result';
  end if;
  update gamecast_test451.sessions s set state=p_state,state_version=s.state_version+1,last_advanced_at=p_stamp,updated_at=p_stamp
    where s.session_id=p_session_id returning s.state,s.state_version,s.last_advanced_at into state,state_version,last_advanced_at;
  for ev in select value from jsonb_array_elements(p_events) loop
    if ev->>'type' is null or ev->>'type' !~ '^V451TEST_' then raise exception 'Invalid event namespace'; end if;
    if ev->>'gameId' is not null and not exists(select 1 from jsonb_array_elements(p_state) g where g->>'id'=ev->>'gameId') then raise exception 'Invalid event game'; end if;
    insert into gamecast_test451.events(session_id,state_version,event_type,game_id,payload)
      values(p_session_id,state_version,ev->>'type',ev->>'gameId',coalesce(ev->'payload','{}'::jsonb)||jsonb_build_object('actor',p_actor));
  end loop;
  return next;
end;
$$;
revoke all on function public.gamecast_test451_commit(uuid,bigint,jsonb,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function public.gamecast_test451_commit(uuid,bigint,jsonb,timestamptz,jsonb,text) to service_role;
