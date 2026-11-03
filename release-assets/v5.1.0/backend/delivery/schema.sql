-- DEVELOPMENT ONLY. Apply to an isolated QA database; never run on Week 11.
-- Schema draft, not an activated Supabase migration. No auth grants are seeded.
begin;
create schema gamecast_v510;
revoke all on schema gamecast_v510 from public;
create table gamecast_v510.reporting_grants (
 session_id text not null check(session_id ~ '^qa-v510-[a-z0-9-]{1,64}$'),
 user_id uuid not null, active boolean not null default false,
 primary key(session_id,user_id)
);
create table gamecast_v510.reporting_heads (
 session_id text not null, game_id text not null, run_id text not null,
 state_version bigint not null check(state_version>=0), summary jsonb not null,
 commands jsonb not null, corrected boolean not null, source_count integer not null,
 primary key(session_id,game_id),
 check(session_id ~ '^qa-v510-[a-z0-9-]{1,64}$'), check(game_id ~ '^G[0-9]{4}$'),
 check(octet_length(summary::text)<=262144)
);
create table gamecast_v510.reporting_runs (
 session_id text not null, game_id text not null, run_id text not null,
 primary key(session_id,game_id,run_id),
 foreign key(session_id,game_id) references gamecast_v510.reporting_heads
);
create table gamecast_v510.reporting_plays (
 session_id text not null, game_id text not null, run_id text not null,
 sequence integer not null check(sequence>0), event_id text not null,
 payload jsonb not null,
 primary key(session_id,game_id,run_id,sequence), unique(event_id),
 foreign key(session_id,game_id) references gamecast_v510.reporting_heads
);
create table gamecast_v510.reporting_sources (
 session_id text not null, game_id text not null, run_id text not null,
 sequence integer not null check(sequence>=0), digest text not null,
 primary key(session_id,game_id,run_id,sequence),
 foreign key(session_id,game_id) references gamecast_v510.reporting_heads
);
create table gamecast_v510.reporting_receipts (
 session_id text not null, game_id text not null, state_version bigint not null,
 digest text not null, primary key(session_id,game_id,state_version),
 foreign key(session_id,game_id) references gamecast_v510.reporting_heads
);
alter table gamecast_v510.reporting_grants enable row level security;
alter table gamecast_v510.reporting_heads enable row level security;
alter table gamecast_v510.reporting_runs enable row level security;
alter table gamecast_v510.reporting_plays enable row level security;
alter table gamecast_v510.reporting_sources enable row level security;
alter table gamecast_v510.reporting_receipts enable row level security;

create function gamecast_v510.reject_journal_mutation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception 'IMMUTABLE_JOURNAL'; end $$;
create trigger immutable_runs before update or delete on gamecast_v510.reporting_runs for each row execute function gamecast_v510.reject_journal_mutation();
create trigger immutable_plays before update or delete on gamecast_v510.reporting_plays for each row execute function gamecast_v510.reject_journal_mutation();
create trigger immutable_sources before update or delete on gamecast_v510.reporting_sources for each row execute function gamecast_v510.reject_journal_mutation();
create trigger immutable_receipts before update or delete on gamecast_v510.reporting_receipts for each row execute function gamecast_v510.reject_journal_mutation();

create function gamecast_v510.authorize_reporting(p_user_id uuid,p_session_id text) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from gamecast_v510.reporting_grants where session_id=p_session_id and user_id=p_user_id and active);
$$;

create function gamecast_v510.commit_reporting(p_packet jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 s jsonb:=p_packet->'summary'; sid text:=s->>'sessionId'; gid text:=s->>'gameId'; rid text:=s->>'runId';
 ver bigint:=(s->>'stateVersion')::bigint; prior gamecast_v510.reporting_heads;
 receipt text; digest text:=encode(sha256(convert_to(p_packet::text,'UTF8')),'hex'); commands jsonb:=p_packet->'commands';
 hashes jsonb:=p_packet->'sourceHashes'; plays jsonb:=p_packet->'plays';
 n integer; i integer; item jsonb; old jsonb; oldhash text; was_corrected boolean;
begin
 if sid is null or sid !~ '^qa-v510-[a-z0-9-]{1,64}$' or gid is null or gid !~ '^G[0-9]{4}$' or rid is null or length(rid) not between 1 and 128 or ver is null or ver<0 then raise exception 'QA_SCOPE_REQUIRED'; end if;
 if s->>'contractVersion' is distinct from 'GC-STATS-1' or s->>'deliveryVersion' is distinct from 'GC-DELIVERY-1' or jsonb_typeof(commands) is distinct from 'array' or jsonb_typeof(hashes) is distinct from 'array' or jsonb_typeof(plays) is distinct from 'array' then raise exception 'INVALID_PACKET'; end if;
 if octet_length(s::text)>262144 or octet_length(p_packet::text)>16777216 then raise exception 'PACKET_TOO_LARGE'; end if;
 if s->'availability'->>'status' is null or s->'availability'->>'status' not in ('AVAILABLE','BLOCKED','NOT_STARTED') then raise exception 'INVALID_PACKET'; end if;
 if s->>'generatedAt' is null then raise exception 'INVALID_PACKET'; end if;
 perform (s->>'generatedAt')::timestamptz;
 n:=jsonb_array_length(hashes);
 if (s->>'throughEventSequence')::integer is distinct from n-1 then raise exception 'SOURCE_COUNT_MISMATCH'; end if;
 perform pg_advisory_xact_lock(hashtextextended(sid||'/'||gid,0));
 select r.digest into receipt from gamecast_v510.reporting_receipts r where r.session_id=sid and r.game_id=gid and r.state_version=ver;
 if found then
  if receipt<>digest then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('stateVersion',ver,'replayed',true);
 end if;
 select * into prior from gamecast_v510.reporting_heads where session_id=sid and game_id=gid for update;
 if found then
  if ver<>prior.state_version+1 then raise exception 'SOURCE_REVISION_GAP'; end if;
  if s->>'engineVersion' is distinct from prior.summary->>'engineVersion' then raise exception 'ENGINE_CHANGED'; end if;
  if jsonb_array_length(commands)<jsonb_array_length(prior.commands) then raise exception 'AUDIT_REWRITE'; end if;
  for i in 0..jsonb_array_length(prior.commands)-1 loop
   if commands->i is distinct from prior.commands->i then raise exception 'AUDIT_REWRITE'; end if;
  end loop;
  if rid=prior.run_id and n<prior.source_count then raise exception 'HISTORY_TRUNCATED'; end if;
  if rid<>prior.run_id then
   if exists(select 1 from gamecast_v510.reporting_runs where session_id=sid and game_id=gid and run_id=rid) then raise exception 'RUN_ID_REUSED'; end if;
   if not exists(select 1 from jsonb_array_elements(commands) c where (c->>'stateVersion')::bigint=ver and c->>'command' in ('restart_same_seed','purge_new_seed','edit_commit','reopen_live')) then raise exception 'RUN_CHANGE_UNVERIFIED'; end if;
  end if;
 else
  if ver<>0 or n<>0 or jsonb_array_length(commands)<>0 or s->'availability'->>'status'<>'NOT_STARTED' then raise exception 'GENESIS_REQUIRED'; end if;
 end if;
 for item in select value from jsonb_array_elements(commands) loop
  if item->>'command' is null or (item->>'stateVersion')::bigint is null or (item->>'stateVersion')::bigint not between 0 and ver then raise exception 'INVALID_AUDIT'; end if;
 end loop;
 was_corrected:=coalesce(prior.corrected,false) or exists(select 1 from jsonb_array_elements(commands) c where c->>'command' in ('score','clock_set','edit_commit','end','reopen_live'));
 if was_corrected then s:=jsonb_set(s,'{availability}', '{"status":"BLOCKED","reason":"CHAIRMAN_CORRECTION"}'); end if;
 if s->'availability'->>'status'<>'AVAILABLE' then
  s:=s-'scoreboard'-'teamStatistics'-'field'-'possessions'-'fieldAvailability';
  if jsonb_array_length(plays)>0 then raise exception 'BLOCKED_DETAIL_WRITE'; end if;
 end if;
 insert into gamecast_v510.reporting_heads values(sid,gid,rid,ver,s,commands,was_corrected,n)
 on conflict(session_id,game_id) do update set run_id=excluded.run_id,state_version=excluded.state_version,summary=excluded.summary,commands=excluded.commands,corrected=excluded.corrected,source_count=excluded.source_count;
 insert into gamecast_v510.reporting_runs values(sid,gid,rid) on conflict do nothing;
 for i in 0..n-1 loop
  if hashes->>i !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_SOURCE_HASH'; end if;
  select r.digest into oldhash from gamecast_v510.reporting_sources r where r.session_id=sid and r.game_id=gid and r.run_id=rid and r.sequence=i;
  if found then
   if oldhash<>hashes->>i then raise exception 'IMMUTABLE_HISTORY_CONFLICT'; end if;
  else insert into gamecast_v510.reporting_sources values(sid,gid,rid,i,hashes->>i); end if;
 end loop;
 i:=0;
 for item in select value from jsonb_array_elements(plays) loop
  i:=i+1;
  if (item->>'sequence')::integer is distinct from i or (item->>'eventSequence')::integer is null or (item->>'eventSequence')::integer not between 0 and n-1 or item->>'eventId' is null then raise exception 'INVALID_PLAY_SEQUENCE'; end if;
  select payload into old from gamecast_v510.reporting_plays where session_id=sid and game_id=gid and run_id=rid and sequence=i;
  if found then
   if old is distinct from item then raise exception 'IMMUTABLE_PLAY_CONFLICT'; end if;
  else insert into gamecast_v510.reporting_plays values(sid,gid,rid,i,item->>'eventId',item); end if;
 end loop;
 insert into gamecast_v510.reporting_receipts values(sid,gid,ver,digest);
 return jsonb_build_object('stateVersion',ver,'replayed',false);
end $$;

create function gamecast_v510.read_reporting(p_user_id uuid,p_session_id text,p_game_id text,p_after integer,p_limit integer,p_run text,p_version bigint,p_source_version bigint) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare h gamecast_v510.reporting_heads; s jsonb; rows jsonb; total integer; reason text;
begin
 if not gamecast_v510.authorize_reporting(p_user_id,p_session_id) then raise exception 'CHAIRMAN_FORBIDDEN'; end if;
 if p_after is null or p_after<0 or p_limit is null or p_limit not between 1 and 250 then raise exception 'INVALID_CURSOR'; end if;
 if p_after>0 and (p_run is null or p_version is null) then raise exception 'CHECKPOINT_REQUIRED'; end if;
 select * into h from gamecast_v510.reporting_heads where session_id=p_session_id and game_id=p_game_id;
 if not found then raise exception 'SNAPSHOT_UNAVAILABLE'; end if;
 s:=h.summary;
 if p_source_version is null or p_source_version<>h.state_version then reason:='SOURCE_REVISION_UNAVAILABLE';
 elsif p_run is not null and p_run<>h.run_id then reason:='RUN_CHANGED';
 elsif p_version is not null and p_version<>h.state_version then reason:='STATE_VERSION_CHANGED'; end if;
 if reason is not null then return jsonb_set(s-'scoreboard'-'teamStatistics'-'field'-'possessions'-'fieldAvailability','{availability}',jsonb_build_object('status','BLOCKED','reason',reason)); end if;
 if s->'availability'->>'status'<>'AVAILABLE' then return s; end if;
 select count(*) into total from gamecast_v510.reporting_plays where session_id=p_session_id and game_id=p_game_id and run_id=h.run_id;
 if p_after>total then raise exception 'CURSOR_AHEAD_OF_HISTORY'; end if;
 select coalesce(jsonb_agg(payload order by sequence),'[]') into rows from (select sequence,payload from gamecast_v510.reporting_plays where session_id=p_session_id and game_id=p_game_id and run_id=h.run_id and sequence>p_after order by sequence limit p_limit) page;
 return s||jsonb_build_object('plays',rows,'nextSequence',p_after+jsonb_array_length(rows),'hasMore',p_after+jsonb_array_length(rows)<total);
end $$;
revoke all on all tables in schema gamecast_v510 from public;
revoke all on all functions in schema gamecast_v510 from public;
-- Supabase roles may not exist in the local PostgreSQL test harness.
-- No anon/authenticated access, even when this schema is exposed by PostgREST.
do $$ begin
 if exists(select 1 from pg_roles where rolname='service_role') then
  grant usage on schema gamecast_v510 to service_role;
  grant select on gamecast_v510.reporting_grants to service_role;
  grant select,insert,update on gamecast_v510.reporting_heads to service_role;
  grant select,insert on gamecast_v510.reporting_runs,gamecast_v510.reporting_plays,gamecast_v510.reporting_sources,gamecast_v510.reporting_receipts to service_role;
  grant execute on function gamecast_v510.authorize_reporting(uuid,text),gamecast_v510.commit_reporting(jsonb),gamecast_v510.read_reporting(uuid,text,text,integer,integer,text,bigint,bigint) to service_role;
 end if;
end $$;
commit;
