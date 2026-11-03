-- Isolated QA source authority. No production schema references or cron.
begin;
create table gamecast_v510.source_heads (
 session_id text primary key check(session_id ~ '^qa-v510-[a-z0-9-]{1,64}$'),
 state_version bigint not null, engine_version text not null
);
create table gamecast_v510.source_commits (
 session_id text not null references gamecast_v510.source_heads,
 state_version bigint not null check(state_version>=0),
 engine_version text not null, games jsonb not null, events jsonb not null,
 committed_at timestamptz not null default clock_timestamp(),
 request_id text not null, request_digest text not null,
 primary key(session_id,state_version), unique(session_id,request_id)
);
alter table gamecast_v510.source_heads enable row level security;
alter table gamecast_v510.source_commits enable row level security;
create trigger immutable_source_commits before update or delete on gamecast_v510.source_commits for each row execute function gamecast_v510.reject_journal_mutation();

create function gamecast_v510.commit_source(p_session_id text,p_expected_version bigint,p_engine_version text,p_games jsonb,p_events jsonb,p_request_id text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare h gamecast_v510.source_heads; prior gamecast_v510.source_commits; g jsonb; e jsonb; next_ver bigint;
 digest text:=encode(sha256(convert_to(jsonb_build_array(p_expected_version,p_engine_version,p_games,p_events)::text,'UTF8')),'hex');
begin
 if p_session_id is null or p_session_id !~ '^qa-v510-[a-z0-9-]{1,64}$' then raise exception 'QA_SCOPE_REQUIRED'; end if;
 if p_request_id is null or length(p_request_id) not between 16 and 128 or p_engine_version is null or length(p_engine_version)>100 then raise exception 'INVALID_REQUEST'; end if;
 if jsonb_typeof(p_games) is distinct from 'array' or jsonb_array_length(p_games) not between 1 and 56 or jsonb_typeof(p_events) is distinct from 'array' then raise exception 'INVALID_SOURCE'; end if;
 if octet_length(p_games::text)>33554432 then raise exception 'SOURCE_TOO_LARGE'; end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_games))<>jsonb_array_length(p_games) then raise exception 'DUPLICATE_GAME'; end if;
 for g in select value from jsonb_array_elements(p_games) loop
  if g->>'sessionId' is distinct from p_session_id or g->'qaOnly' is distinct from 'true'::jsonb or g->>'id' is null or g->>'id' !~ '^G[0-9]{4}$' or g->>'lifecycle' is null or g->>'lifecycle' not in ('UNLAUNCHED','ACTIVE','DELAY','EDIT','FINAL_PENDING','LOCKED','FINAL') then raise exception 'QA_SOURCE_REQUIRED'; end if;
 end loop;
 for e in select value from jsonb_array_elements(p_events) loop
  if e->>'command' is null or e->>'command' not in ('launch','advance','quarter_length','weather_set','auto','on_air','speed','pause','delay','resume_delay','restart_same_seed','deadman_arm','deadman_disarm','deadman_launch','score','clock_set','edit_begin','edit_cancel','edit_commit','end','lock','unlock','reopen_live','purge_new_seed') then raise exception 'INVALID_COMMAND'; end if;
  if not (e ? 'gameId') or (e->>'gameId' is not null and not exists(select 1 from jsonb_array_elements(p_games) x where x->>'id'=e->>'gameId')) then raise exception 'INVALID_EVENT_IDENTITY'; end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('source/'||p_session_id,0));
 select * into prior from gamecast_v510.source_commits where session_id=p_session_id and request_id=p_request_id;
 if found then
  if prior.request_digest<>digest then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('stateVersion',prior.state_version,'replayed',true);
 end if;
 select * into h from gamecast_v510.source_heads where session_id=p_session_id for update;
 if found then
  if p_expected_version is distinct from h.state_version then raise exception 'VERSION_CONFLICT'; end if;
  if p_engine_version<>h.engine_version or jsonb_array_length(p_events)=0 then raise exception 'INVALID_SOURCE'; end if;
  select * into prior from gamecast_v510.source_commits where session_id=p_session_id and state_version=h.state_version;
  if (select jsonb_agg(x->>'id' order by x->>'id') from jsonb_array_elements(prior.games) x) is distinct from (select jsonb_agg(x->>'id' order by x->>'id') from jsonb_array_elements(p_games) x) then raise exception 'GAME_SET_CHANGED'; end if;
  next_ver:=h.state_version+1;
 else
  if p_expected_version is distinct from -1::bigint or jsonb_array_length(p_events)<>0 then raise exception 'GENESIS_REQUIRED'; end if;
  for g in select value from jsonb_array_elements(p_games) loop
   if g->>'lifecycle'<>'UNLAUNCHED' or g->'history' is distinct from '[]'::jsonb then raise exception 'GENESIS_REQUIRED'; end if;
  end loop;
  next_ver:=0;
 end if;
 insert into gamecast_v510.source_heads values(p_session_id,next_ver,p_engine_version) on conflict(session_id) do update set state_version=excluded.state_version;
 insert into gamecast_v510.source_commits(session_id,state_version,engine_version,games,events,request_id,request_digest) values(p_session_id,next_ver,p_engine_version,p_games,p_events,p_request_id,digest);
 return jsonb_build_object('stateVersion',next_ver,'replayed',false);
end $$;

create function gamecast_v510.load_source(p_session_id text,p_version bigint) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('sessionId',c.session_id,'stateVersion',c.state_version,'engineVersion',c.engine_version,'committedAt',c.committed_at,'games',c.games,'commits',coalesce((select jsonb_agg(jsonb_build_object('stateVersion',x.state_version,'events',x.events) order by x.state_version) from gamecast_v510.source_commits x where x.session_id=c.session_id and x.state_version between 1 and c.state_version),'[]'::jsonb))
 from gamecast_v510.source_commits c where c.session_id=p_session_id and c.state_version=p_version;
$$;
create function gamecast_v510.source_version(p_session_id text,p_game_id text) returns bigint
language sql stable security invoker set search_path='' as $$
 select h.state_version from gamecast_v510.source_heads h join gamecast_v510.source_commits c using(session_id,state_version) where h.session_id=p_session_id and exists(select 1 from jsonb_array_elements(c.games) g where g->>'id'=p_game_id);
$$;
-- Immutable source_commits are the durable outbox: missing projections are work
-- to replay, not mutable jobs that can be acknowledged ahead of delivery.
create function gamecast_v510.pending_source(p_session_id text) returns bigint
language sql stable security invoker set search_path='' as $$
 select min(coalesce(r.state_version,-1)+1) from gamecast_v510.source_heads h join gamecast_v510.source_commits c using(session_id,state_version) cross join lateral jsonb_array_elements(c.games) g left join gamecast_v510.reporting_heads r on r.session_id=h.session_id and r.game_id=g->>'id' where h.session_id=p_session_id and coalesce(r.state_version,-1)<h.state_version;
$$;
revoke all on gamecast_v510.source_heads,gamecast_v510.source_commits from public;
revoke all on function gamecast_v510.commit_source(text,bigint,text,jsonb,jsonb,text),gamecast_v510.load_source(text,bigint),gamecast_v510.source_version(text,text),gamecast_v510.pending_source(text) from public;
grant select,insert,update on gamecast_v510.source_heads to service_role;
grant select,insert on gamecast_v510.source_commits to service_role;
grant execute on function gamecast_v510.commit_source(text,bigint,text,jsonb,jsonb,text),gamecast_v510.load_source(text,bigint),gamecast_v510.source_version(text,text),gamecast_v510.pending_source(text) to service_role;
commit;
