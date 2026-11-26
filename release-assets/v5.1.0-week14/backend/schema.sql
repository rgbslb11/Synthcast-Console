begin;

create schema gamecast_v510_w14;
revoke all on schema gamecast_v510_w14 from public;
create table gamecast_v510_w14.reporting_grants (
 session_id text not null check(session_id ~ '^w14v510-[a-z0-9-]{1,64}$'),
 user_id uuid not null, active boolean not null default false,
 primary key(session_id,user_id)
);
create table gamecast_v510_w14.reporting_heads (
 session_id text not null, game_id text not null, run_id text not null,
 state_version bigint not null check(state_version>=0), summary jsonb not null,
 commands jsonb not null, corrected boolean not null, source_count integer not null,
 primary key(session_id,game_id),
 check(session_id ~ '^w14v510-[a-z0-9-]{1,64}$'), check(game_id ~ '^G[0-9]{4}$'),
 check(octet_length(summary::text)<=262144)
);
create table gamecast_v510_w14.reporting_runs (
 session_id text not null, game_id text not null, run_id text not null,
 primary key(session_id,game_id,run_id),
 foreign key(session_id,game_id) references gamecast_v510_w14.reporting_heads
);
create table gamecast_v510_w14.reporting_plays (
 session_id text not null, game_id text not null, run_id text not null,
 sequence integer not null check(sequence>0), event_id text not null,
 payload jsonb not null,
 primary key(session_id,game_id,run_id,sequence), unique(event_id),
 foreign key(session_id,game_id) references gamecast_v510_w14.reporting_heads
);
create table gamecast_v510_w14.reporting_sources (
 session_id text not null, game_id text not null, run_id text not null,
 sequence integer not null check(sequence>=0), digest text not null,
 primary key(session_id,game_id,run_id,sequence),
 foreign key(session_id,game_id) references gamecast_v510_w14.reporting_heads
);
create table gamecast_v510_w14.reporting_receipts (
 session_id text not null, game_id text not null, state_version bigint not null,
 digest text not null, primary key(session_id,game_id,state_version),
 foreign key(session_id,game_id) references gamecast_v510_w14.reporting_heads
);
alter table gamecast_v510_w14.reporting_grants enable row level security;
alter table gamecast_v510_w14.reporting_heads enable row level security;
alter table gamecast_v510_w14.reporting_runs enable row level security;
alter table gamecast_v510_w14.reporting_plays enable row level security;
alter table gamecast_v510_w14.reporting_sources enable row level security;
alter table gamecast_v510_w14.reporting_receipts enable row level security;

create function gamecast_v510_w14.reject_journal_mutation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception 'IMMUTABLE_JOURNAL'; end $$;
create trigger immutable_runs before update or delete on gamecast_v510_w14.reporting_runs for each row execute function gamecast_v510_w14.reject_journal_mutation();
create trigger immutable_plays before update or delete on gamecast_v510_w14.reporting_plays for each row execute function gamecast_v510_w14.reject_journal_mutation();
create trigger immutable_sources before update or delete on gamecast_v510_w14.reporting_sources for each row execute function gamecast_v510_w14.reject_journal_mutation();
create trigger immutable_receipts before update or delete on gamecast_v510_w14.reporting_receipts for each row execute function gamecast_v510_w14.reject_journal_mutation();

create function gamecast_v510_w14.authorize_reporting(p_user_id uuid,p_session_id text) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from gamecast_v510_w14.reporting_grants where session_id=p_session_id and user_id=p_user_id and active);
$$;

create function gamecast_v510_w14.commit_reporting(p_packet jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 s jsonb:=p_packet->'summary'; sid text:=s->>'sessionId'; gid text:=s->>'gameId'; rid text:=s->>'runId';
 ver bigint:=(s->>'stateVersion')::bigint; prior gamecast_v510_w14.reporting_heads;
 receipt text; digest text:=encode(sha256(convert_to(p_packet::text,'UTF8')),'hex'); commands jsonb:=p_packet->'commands';
 hashes jsonb:=p_packet->'sourceHashes'; plays jsonb:=p_packet->'plays';
 n integer; i integer; item jsonb; old jsonb; oldhash text; was_corrected boolean;
begin
 if sid is null or sid !~ '^w14v510-[a-z0-9-]{1,64}$' or gid is null or gid !~ '^G[0-9]{4}$' or rid is null or length(rid) not between 1 and 128 or ver is null or ver<0 then raise exception 'W14_SCOPE_REQUIRED'; end if;
 if s->>'contractVersion' is distinct from 'GC-STATS-1' or s->>'deliveryVersion' is distinct from 'GC-DELIVERY-1' or jsonb_typeof(commands) is distinct from 'array' or jsonb_typeof(hashes) is distinct from 'array' or jsonb_typeof(plays) is distinct from 'array' then raise exception 'INVALID_PACKET'; end if;
 if octet_length(s::text)>262144 or octet_length(p_packet::text)>16777216 then raise exception 'PACKET_TOO_LARGE'; end if;
 if s->'availability'->>'status' is null or s->'availability'->>'status' not in ('AVAILABLE','BLOCKED','NOT_STARTED') then raise exception 'INVALID_PACKET'; end if;
 if s->>'generatedAt' is null then raise exception 'INVALID_PACKET'; end if;
 perform (s->>'generatedAt')::timestamptz;
 n:=jsonb_array_length(hashes);
 if (s->>'throughEventSequence')::integer is distinct from n-1 then raise exception 'SOURCE_COUNT_MISMATCH'; end if;
 perform pg_advisory_xact_lock(hashtextextended(sid||'/'||gid,0));
 select r.digest into receipt from gamecast_v510_w14.reporting_receipts r where r.session_id=sid and r.game_id=gid and r.state_version=ver;
 if found then
  if receipt<>digest then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('stateVersion',ver,'replayed',true);
 end if;
 select * into prior from gamecast_v510_w14.reporting_heads where session_id=sid and game_id=gid for update;
 if found then
  if ver<>prior.state_version+1 then raise exception 'SOURCE_REVISION_GAP'; end if;
  if s->>'engineVersion' is distinct from prior.summary->>'engineVersion' then raise exception 'ENGINE_CHANGED'; end if;
  if jsonb_array_length(commands)<jsonb_array_length(prior.commands) then raise exception 'AUDIT_REWRITE'; end if;
  for i in 0..jsonb_array_length(prior.commands)-1 loop
   if commands->i is distinct from prior.commands->i then raise exception 'AUDIT_REWRITE'; end if;
  end loop;
  if rid=prior.run_id and n<prior.source_count then raise exception 'HISTORY_TRUNCATED'; end if;
  if rid<>prior.run_id then
   if exists(select 1 from gamecast_v510_w14.reporting_runs where session_id=sid and game_id=gid and run_id=rid) then raise exception 'RUN_ID_REUSED'; end if;
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
 insert into gamecast_v510_w14.reporting_heads values(sid,gid,rid,ver,s,commands,was_corrected,n)
 on conflict(session_id,game_id) do update set run_id=excluded.run_id,state_version=excluded.state_version,summary=excluded.summary,commands=excluded.commands,corrected=excluded.corrected,source_count=excluded.source_count;
 insert into gamecast_v510_w14.reporting_runs values(sid,gid,rid) on conflict do nothing;
 for i in 0..n-1 loop
  if hashes->>i !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_SOURCE_HASH'; end if;
  select r.digest into oldhash from gamecast_v510_w14.reporting_sources r where r.session_id=sid and r.game_id=gid and r.run_id=rid and r.sequence=i;
  if found then
   if oldhash<>hashes->>i then raise exception 'IMMUTABLE_HISTORY_CONFLICT'; end if;
  else insert into gamecast_v510_w14.reporting_sources values(sid,gid,rid,i,hashes->>i); end if;
 end loop;
 i:=0;
 for item in select value from jsonb_array_elements(plays) loop
  i:=i+1;
  if (item->>'sequence')::integer is distinct from i or (item->>'eventSequence')::integer is null or (item->>'eventSequence')::integer not between 0 and n-1 or item->>'eventId' is null then raise exception 'INVALID_PLAY_SEQUENCE'; end if;
  select payload into old from gamecast_v510_w14.reporting_plays where session_id=sid and game_id=gid and run_id=rid and sequence=i;
  if found then
   if old is distinct from item then raise exception 'IMMUTABLE_PLAY_CONFLICT'; end if;
  else insert into gamecast_v510_w14.reporting_plays values(sid,gid,rid,i,item->>'eventId',item); end if;
 end loop;
 insert into gamecast_v510_w14.reporting_receipts values(sid,gid,ver,digest);
 return jsonb_build_object('stateVersion',ver,'replayed',false);
end $$;

create function gamecast_v510_w14.read_reporting(p_user_id uuid,p_session_id text,p_game_id text,p_after integer,p_limit integer,p_run text,p_version bigint,p_source_version bigint) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare h gamecast_v510_w14.reporting_heads; s jsonb; rows jsonb; total integer; reason text;
begin
 if not gamecast_v510_w14.authorize_reporting(p_user_id,p_session_id) then raise exception 'CHAIRMAN_FORBIDDEN'; end if;
 if p_after is null or p_after<0 or p_limit is null or p_limit not between 1 and 250 then raise exception 'INVALID_CURSOR'; end if;
 if p_after>0 and (p_run is null or p_version is null) then raise exception 'CHECKPOINT_REQUIRED'; end if;
 select * into h from gamecast_v510_w14.reporting_heads where session_id=p_session_id and game_id=p_game_id;
 if not found then raise exception 'SNAPSHOT_UNAVAILABLE'; end if;
 s:=h.summary;
 if p_source_version is null or p_source_version<>h.state_version then reason:='SOURCE_REVISION_UNAVAILABLE';
 elsif p_run is not null and p_run<>h.run_id then reason:='RUN_CHANGED';
 elsif p_version is not null and p_version<>h.state_version then reason:='STATE_VERSION_CHANGED'; end if;
 if reason is not null then return jsonb_set(s-'scoreboard'-'teamStatistics'-'field'-'possessions'-'fieldAvailability','{availability}',jsonb_build_object('status','BLOCKED','reason',reason)); end if;
 if s->'availability'->>'status'<>'AVAILABLE' then return s; end if;
 select count(*) into total from gamecast_v510_w14.reporting_plays where session_id=p_session_id and game_id=p_game_id and run_id=h.run_id;
 if p_after>total then raise exception 'CURSOR_AHEAD_OF_HISTORY'; end if;
 select coalesce(jsonb_agg(payload order by sequence),'[]') into rows from (select sequence,payload from gamecast_v510_w14.reporting_plays where session_id=p_session_id and game_id=p_game_id and run_id=h.run_id and sequence>p_after order by sequence limit p_limit) page;
 return s||jsonb_build_object('plays',rows,'nextSequence',p_after+jsonb_array_length(rows),'hasMore',p_after+jsonb_array_length(rows)<total);
end $$;
revoke all on all tables in schema gamecast_v510_w14 from public;
revoke all on all functions in schema gamecast_v510_w14 from public;
do $$ begin
 if exists(select 1 from pg_roles where rolname='service_role') then
  grant usage on schema gamecast_v510_w14 to service_role;
  grant select on gamecast_v510_w14.reporting_grants to service_role;
  grant select,insert,update on gamecast_v510_w14.reporting_heads to service_role;
  grant select,insert on gamecast_v510_w14.reporting_runs,gamecast_v510_w14.reporting_plays,gamecast_v510_w14.reporting_sources,gamecast_v510_w14.reporting_receipts to service_role;
  grant execute on function gamecast_v510_w14.authorize_reporting(uuid,text),gamecast_v510_w14.commit_reporting(jsonb),gamecast_v510_w14.read_reporting(uuid,text,text,integer,integer,text,bigint,bigint) to service_role;
 end if;
end $$;


create table gamecast_v510_w14.source_heads (
 session_id text primary key check(session_id ~ '^w14v510-[a-z0-9-]{1,64}$'),
 state_version bigint not null, engine_version text not null
);
create table gamecast_v510_w14.source_commits (
 session_id text not null references gamecast_v510_w14.source_heads,
 state_version bigint not null check(state_version>=0),
 engine_version text not null, games jsonb not null, events jsonb not null,
 committed_at timestamptz not null default clock_timestamp(),
 request_id text not null, request_digest text not null,
 primary key(session_id,state_version), unique(session_id,request_id)
);
alter table gamecast_v510_w14.source_heads enable row level security;
alter table gamecast_v510_w14.source_commits enable row level security;
create trigger immutable_source_commits before update or delete on gamecast_v510_w14.source_commits for each row execute function gamecast_v510_w14.reject_journal_mutation();

create function gamecast_v510_w14.commit_source(p_session_id text,p_expected_version bigint,p_engine_version text,p_games jsonb,p_events jsonb,p_request_id text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare h gamecast_v510_w14.source_heads; prior gamecast_v510_w14.source_commits; g jsonb; e jsonb; next_ver bigint;
 digest text:=encode(sha256(convert_to(jsonb_build_array(p_expected_version,p_engine_version,p_games,p_events)::text,'UTF8')),'hex');
begin
 if p_session_id is null or p_session_id !~ '^w14v510-[a-z0-9-]{1,64}$' then raise exception 'W14_SCOPE_REQUIRED'; end if;
 if p_request_id is null or length(p_request_id) not between 16 and 128 or p_engine_version is null or length(p_engine_version)>100 then raise exception 'INVALID_REQUEST'; end if;
 if jsonb_typeof(p_games) is distinct from 'array' or jsonb_array_length(p_games) <>57 or jsonb_typeof(p_events) is distinct from 'array' then raise exception 'INVALID_SOURCE'; end if;
 if octet_length(p_games::text)>33554432 then raise exception 'SOURCE_TOO_LARGE'; end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_games))<>jsonb_array_length(p_games) then raise exception 'DUPLICATE_GAME'; end if;
 for g in select value from jsonb_array_elements(p_games) loop
  if g->>'sessionId' is distinct from p_session_id or g->'qaOnly' is distinct from 'false'::jsonb or g->>'id' is null or g->>'id' !~ '^G[0-9]{4}$' or g->>'lifecycle' is null or g->>'lifecycle' not in ('UNLAUNCHED','ACTIVE','DELAY','EDIT','FINAL_PENDING','LOCKED','READY','FINAL') then raise exception 'W14_SOURCE_REQUIRED'; end if;
 end loop;
 for e in select value from jsonb_array_elements(p_events) loop
  if e->>'command' is null or e->>'command' not in ('launch','advance','quarter_length','weather_set','auto','on_air','speed','pause','delay','resume_delay','restart_same_seed','deadman_arm','deadman_disarm','deadman_launch','score','clock_set','edit_begin','edit_cancel','edit_commit','end','lock','unlock','accept','reopen_live','purge_new_seed') then raise exception 'INVALID_COMMAND'; end if;
  if not (e ? 'gameId') or (e->>'gameId' is not null and not exists(select 1 from jsonb_array_elements(p_games) x where x->>'id'=e->>'gameId')) then raise exception 'INVALID_EVENT_IDENTITY'; end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('source/'||p_session_id,0));
 select * into prior from gamecast_v510_w14.source_commits where session_id=p_session_id and request_id=p_request_id;
 if found then
  if prior.request_digest<>digest then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('stateVersion',prior.state_version,'replayed',true);
 end if;
 select * into h from gamecast_v510_w14.source_heads where session_id=p_session_id for update;
 if found then
  if p_expected_version is distinct from h.state_version then raise exception 'VERSION_CONFLICT'; end if;
  if p_engine_version<>h.engine_version or jsonb_array_length(p_events)=0 then raise exception 'INVALID_SOURCE'; end if;
  select * into prior from gamecast_v510_w14.source_commits where session_id=p_session_id and state_version=h.state_version;
  if (select jsonb_agg(x->>'id' order by x->>'id') from jsonb_array_elements(prior.games) x) is distinct from (select jsonb_agg(x->>'id' order by x->>'id') from jsonb_array_elements(p_games) x) then raise exception 'GAME_SET_CHANGED'; end if;
  next_ver:=h.state_version+1;
 else
  if p_expected_version is distinct from -1::bigint or jsonb_array_length(p_events)<>0 then raise exception 'GENESIS_REQUIRED'; end if;
  for g in select value from jsonb_array_elements(p_games) loop
   if g->>'lifecycle'<>'UNLAUNCHED' or g->'history' is distinct from '[]'::jsonb then raise exception 'GENESIS_REQUIRED'; end if;
  end loop;
  next_ver:=0;
 end if;
 insert into gamecast_v510_w14.source_heads values(p_session_id,next_ver,p_engine_version) on conflict(session_id) do update set state_version=excluded.state_version;
 insert into gamecast_v510_w14.source_commits(session_id,state_version,engine_version,games,events,request_id,request_digest) values(p_session_id,next_ver,p_engine_version,p_games,p_events,p_request_id,digest);
 return jsonb_build_object('stateVersion',next_ver,'replayed',false);
end $$;

create function gamecast_v510_w14.load_source(p_session_id text,p_version bigint) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('sessionId',c.session_id,'stateVersion',c.state_version,'engineVersion',c.engine_version,'committedAt',c.committed_at,'games',c.games,'commits',coalesce((select jsonb_agg(jsonb_build_object('stateVersion',x.state_version,'events',x.events) order by x.state_version) from gamecast_v510_w14.source_commits x where x.session_id=c.session_id and x.state_version between 1 and c.state_version),'[]'::jsonb))
 from gamecast_v510_w14.source_commits c where c.session_id=p_session_id and c.state_version=p_version;
$$;
create function gamecast_v510_w14.source_version(p_session_id text,p_game_id text) returns bigint
language sql stable security invoker set search_path='' as $$
 select h.state_version from gamecast_v510_w14.source_heads h join gamecast_v510_w14.source_commits c using(session_id,state_version) where h.session_id=p_session_id and exists(select 1 from jsonb_array_elements(c.games) g where g->>'id'=p_game_id);
$$;
create function gamecast_v510_w14.pending_source(p_session_id text) returns bigint
language sql stable security invoker set search_path='' as $$
 select min(coalesce(r.state_version,-1)+1) from gamecast_v510_w14.source_heads h join gamecast_v510_w14.source_commits c using(session_id,state_version) cross join lateral jsonb_array_elements(c.games) g left join gamecast_v510_w14.reporting_heads r on r.session_id=h.session_id and r.game_id=g->>'id' where h.session_id=p_session_id and coalesce(r.state_version,-1)<h.state_version;
$$;
revoke all on gamecast_v510_w14.source_heads,gamecast_v510_w14.source_commits from public;
revoke all on function gamecast_v510_w14.commit_source(text,bigint,text,jsonb,jsonb,text),gamecast_v510_w14.load_source(text,bigint),gamecast_v510_w14.source_version(text,text),gamecast_v510_w14.pending_source(text) from public;
grant select,insert,update on gamecast_v510_w14.source_heads to service_role;
grant select,insert on gamecast_v510_w14.source_commits to service_role;
grant execute on function gamecast_v510_w14.commit_source(text,bigint,text,jsonb,jsonb,text),gamecast_v510_w14.load_source(text,bigint),gamecast_v510_w14.source_version(text,text),gamecast_v510_w14.pending_source(text) to service_role;


create table gamecast_v510_w14.wp_priors(session_id text not null,game_id text not null,run_id text not null,source_version bigint not null,revision bigint generated always as identity,prior jsonb not null,request_id text not null,primary key(session_id,game_id,revision),unique(session_id,game_id,request_id));
create table gamecast_v510_w14.wp_heads(session_id text not null,game_id text not null,state jsonb not null,sequence bigint not null,primary key(session_id,game_id));
create table gamecast_v510_w14.wp_records(session_id text not null,game_id text not null,sequence bigint not null,run_id text not null,event_id text not null,model_id text not null,record jsonb not null,primary key(session_id,game_id,sequence),unique(session_id,game_id,run_id,model_id,event_id));
create table gamecast_v510_w14.wp_receipts(session_id text not null,request_id text not null,body jsonb not null,response jsonb not null,primary key(session_id,request_id));
create table gamecast_v510_w14.wp_progress(session_id text primary key,source_version bigint not null);
create trigger immutable_wp_records before update or delete on gamecast_v510_w14.wp_records for each row execute function gamecast_v510_w14.reject_journal_mutation();
create trigger immutable_wp_priors before update or delete on gamecast_v510_w14.wp_priors for each row execute function gamecast_v510_w14.reject_journal_mutation();
create trigger immutable_wp_receipts before update or delete on gamecast_v510_w14.wp_receipts for each row execute function gamecast_v510_w14.reject_journal_mutation();
alter table gamecast_v510_w14.wp_priors enable row level security;
alter table gamecast_v510_w14.wp_heads enable row level security;
alter table gamecast_v510_w14.wp_records enable row level security;
alter table gamecast_v510_w14.wp_receipts enable row level security;
alter table gamecast_v510_w14.wp_progress enable row level security;
revoke all on gamecast_v510_w14.wp_priors,gamecast_v510_w14.wp_heads,gamecast_v510_w14.wp_records,gamecast_v510_w14.wp_receipts,gamecast_v510_w14.wp_progress from public;
grant select,insert on gamecast_v510_w14.wp_priors,gamecast_v510_w14.wp_records,gamecast_v510_w14.wp_receipts to service_role;
grant select,insert,update on gamecast_v510_w14.wp_heads,gamecast_v510_w14.wp_progress to service_role;
grant usage on sequence gamecast_v510_w14.wp_priors_revision_seq to service_role;


create function gamecast_v510_w14.lookup_source_request(p_session_id text,p_request_id text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('stateVersion',state_version,'requestHash',events->0->>'requestHash') from gamecast_v510_w14.source_commits where session_id=p_session_id and request_id=p_request_id;
$$;
create function gamecast_v510_w14.chairman_grant(p_session_id text,p_user_id uuid,p_active boolean) returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_session_id !~ '^w14v510-[a-z0-9-]{1,64}$' or not exists(select 1 from gamecast_v510_w14.source_heads where session_id=p_session_id) or p_active is null then raise exception 'W14_SCOPE_REQUIRED'; end if;
 insert into gamecast_v510_w14.reporting_grants values(p_session_id,p_user_id,p_active) on conflict(session_id,user_id) do update set active=excluded.active;
end $$;
revoke all on function gamecast_v510_w14.lookup_source_request(text,text),gamecast_v510_w14.chairman_grant(text,uuid,boolean) from public;
grant execute on function gamecast_v510_w14.lookup_source_request(text,text),gamecast_v510_w14.chairman_grant(text,uuid,boolean) to service_role;
grant insert,update on gamecast_v510_w14.reporting_grants to service_role;

revoke all on schema gamecast_v510_w14 from anon, authenticated;
revoke all on all tables in schema gamecast_v510_w14 from anon, authenticated;
revoke execute on all functions in schema gamecast_v510_w14 from public, anon, authenticated;
commit;
