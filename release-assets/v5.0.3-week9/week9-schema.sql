-- Separate Week 9 operating schema. Existing Week 7 QA and prior releases remain unchanged.

create schema gamecast_v503_w9;

revoke all on schema gamecast_v503_w9 from public, anon, authenticated;

grant usage on schema gamecast_v503_w9 to service_role;

create table gamecast_v503_w9.creation_requests (
  "actor_id" uuid not null,
  "idempotency_key" text not null,
  "request_hash" text not null,
  "response" jsonb not null,
  "created_at" timestamp with time zone default now() not null
);

alter table gamecast_v503_w9.creation_requests enable row level security;

create table gamecast_v503_w9.events (
  "event_id" bigint generated always as identity not null,
  "session_id" uuid not null,
  "state_version" bigint not null,
  "event_sequence" integer default 0 not null,
  "event_type" text not null,
  "game_id" text,
  "actor_id" text not null,
  "payload" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);

alter table gamecast_v503_w9.events enable row level security;

create table gamecast_v503_w9.final_snapshots (
  "game_id" text not null,
  "slate_order" integer not null,
  "away_team" text not null,
  "home_team" text not null,
  "away_score" integer not null,
  "home_score" integer not null,
  "display_payload" jsonb not null,
  "source_release" text not null,
  "source_session_slug" text not null,
  "source_state_version" bigint not null,
  "source_evidence_hash" text not null,
  "import_batch_hash" text not null,
  "imported_by" uuid not null,
  "imported_at" timestamp with time zone default now() not null
);

alter table gamecast_v503_w9.final_snapshots enable row level security;

create table gamecast_v503_w9.operators (
  "user_id" uuid not null,
  "role" text not null,
  "active" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

alter table gamecast_v503_w9.operators enable row level security;

create table gamecast_v503_w9.release_control (
  "singleton" boolean default true not null,
  "writes_enabled" boolean default false not null,
  "updated_at" timestamp with time zone default now() not null
);

alter table gamecast_v503_w9.release_control enable row level security;

create table gamecast_v503_w9.requests (
  "session_id" uuid not null,
  "actor_id" text not null,
  "idempotency_key" text not null,
  "request_hash" text not null,
  "response" jsonb not null,
  "committed_state_version" bigint not null,
  "created_at" timestamp with time zone default now() not null
);

alter table gamecast_v503_w9.requests enable row level security;

create table gamecast_v503_w9.sessions (
  "session_id" uuid default gen_random_uuid() not null,
  "public_slug" text not null,
  "owner_user_id" uuid not null,
  "week_key" text not null,
  "engine_version" text not null,
  "data_version" text not null,
  "state" jsonb not null,
  "state_version" bigint default 1 not null,
  "last_advanced_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

alter table gamecast_v503_w9.sessions enable row level security;

alter table gamecast_v503_w9.creation_requests add constraint creation_requests_idempotency_key_check CHECK ((idempotency_key ~ '^[A-Za-z0-9._~-]{16,128}$'::text));

alter table gamecast_v503_w9.creation_requests add constraint creation_requests_pkey PRIMARY KEY (actor_id, idempotency_key);

alter table gamecast_v503_w9.creation_requests add constraint creation_requests_request_hash_check CHECK ((request_hash ~ '^[a-f0-9]{64}$'::text));

alter table gamecast_v503_w9.events add constraint events_event_sequence_check CHECK ((event_sequence >= 0));

alter table gamecast_v503_w9.events add constraint events_event_type_check CHECK ((event_type ~ '^V503_[A-Z0-9_]+$'::text));

alter table gamecast_v503_w9.events add constraint events_pkey PRIMARY KEY (event_id);

alter table gamecast_v503_w9.events add constraint events_session_id_state_version_event_sequence_key UNIQUE (session_id, state_version, event_sequence);

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_away_score_check CHECK (((away_score >= 0) AND (away_score <= 199)));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_check CHECK ((home_team <> away_team));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_check1 CHECK (((jsonb_typeof(display_payload) = 'object'::text) AND ((display_payload ->> 'id'::text) = game_id) AND ((display_payload ->> 'lifecycle'::text) = 'READY'::text) AND ((display_payload ->> 'activity'::text) = 'FINAL'::text)));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_check2 CHECK (((((display_payload ->> 'kickoffOrder'::text))::integer = slate_order) IS TRUE));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_check3 CHECK (((COALESCE((display_payload #>> '{away,name}'::text[]), (display_payload ->> 'away'::text)) = away_team) IS TRUE));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_check4 CHECK (((COALESCE((display_payload #>> '{home,name}'::text[]), (display_payload ->> 'home'::text)) = home_team) IS TRUE));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_display_payload_check CHECK ((((display_payload ->> 'immutableFinal'::text) = 'true'::text) IS TRUE));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_game_id_check CHECK ((game_id ~ '^G[0-9]{4}$'::text));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_home_score_check CHECK (((home_score >= 0) AND (home_score <= 199)));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_import_batch_hash_check CHECK ((import_batch_hash ~ '^[a-f0-9]{64}$'::text));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_pkey PRIMARY KEY (game_id);

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_slate_order_check CHECK (((slate_order >= 1) AND (slate_order <= 52)));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_slate_order_key UNIQUE (slate_order);

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_source_evidence_hash_check CHECK ((source_evidence_hash ~ '^[a-f0-9]{64}$'::text));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_source_release_check CHECK ((source_release = 'GameCast 4.4.2'::text));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_source_session_slug_check CHECK ((source_session_slug ~ '^w7v442-[a-f0-9]{16}$'::text));

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_source_state_version_check CHECK ((source_state_version >= 1));

alter table gamecast_v503_w9.operators add constraint operators_pkey PRIMARY KEY (user_id);

alter table gamecast_v503_w9.operators add constraint operators_role_check CHECK ((role = 'CHAIRMAN'::text));

alter table gamecast_v503_w9.release_control add constraint release_control_pkey PRIMARY KEY (singleton);

alter table gamecast_v503_w9.release_control add constraint release_control_singleton_check CHECK (singleton);

alter table gamecast_v503_w9.requests add constraint requests_idempotency_key_check CHECK ((idempotency_key ~ '^[A-Za-z0-9._~-]{16,128}$'::text));

alter table gamecast_v503_w9.requests add constraint requests_pkey PRIMARY KEY (session_id, actor_id, idempotency_key);

alter table gamecast_v503_w9.requests add constraint requests_request_hash_check CHECK ((request_hash ~ '^[a-f0-9]{64}$'::text));

alter table gamecast_v503_w9.sessions add constraint sessions_engine_version_check CHECK ((engine_version = 'GC-W9-V5.0.3-RC1'::text));

alter table gamecast_v503_w9.sessions add constraint sessions_pkey PRIMARY KEY (session_id);

alter table gamecast_v503_w9.sessions add constraint sessions_public_slug_check CHECK ((public_slug ~ '^w9v503-[a-f0-9]{16}$'::text));

alter table gamecast_v503_w9.sessions add constraint sessions_public_slug_key UNIQUE (public_slug);

alter table gamecast_v503_w9.sessions add constraint sessions_state_check CHECK (((jsonb_typeof(state) = 'array'::text) AND (jsonb_array_length(state) = 52)));

alter table gamecast_v503_w9.sessions add constraint sessions_state_version_check CHECK ((state_version >= 1));

alter table gamecast_v503_w9.sessions add constraint sessions_week_key_check CHECK ((week_key = '2026-W09'::text));

alter table gamecast_v503_w9.creation_requests add constraint creation_requests_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES gamecast_v503_w9.operators(user_id) ON DELETE RESTRICT;

alter table gamecast_v503_w9.events add constraint events_session_id_fkey FOREIGN KEY (session_id) REFERENCES gamecast_v503_w9.sessions(session_id) ON DELETE RESTRICT;

alter table gamecast_v503_w9.final_snapshots add constraint final_snapshots_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES gamecast_v503_w9.operators(user_id) ON DELETE RESTRICT;

alter table gamecast_v503_w9.operators add constraint operators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

alter table gamecast_v503_w9.requests add constraint requests_session_id_fkey FOREIGN KEY (session_id) REFERENCES gamecast_v503_w9.sessions(session_id) ON DELETE RESTRICT;

alter table gamecast_v503_w9.sessions add constraint sessions_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES gamecast_v503_w9.operators(user_id) ON DELETE RESTRICT;

alter table gamecast_v503_w9.sessions add constraint operating_only_state check (jsonb_path_query_array(state, '$[*].qaOnly') = to_jsonb(array_fill(false, ARRAY[jsonb_array_length(state)])));

insert into gamecast_v503_w9.release_control(singleton,writes_enabled) values (true,false);

insert into gamecast_v503_w9.operators select * from gamecast_v502_w8.operators;

alter table gamecast_v503_w9.final_snapshots add constraint no_imported_week9_finals check (false);

CREATE OR REPLACE FUNCTION gamecast_v503_w9.authorize_operator(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'gamecast_v503_w9'
AS $function$
  select exists (
    select 1 from gamecast_v503_w9.operators
    where user_id = p_user_id and role = 'CHAIRMAN' and active
  );
$function$;

revoke all on function gamecast_v503_w9.authorize_operator(p_user_id uuid) from public,anon,authenticated;

grant execute on function gamecast_v503_w9.authorize_operator(p_user_id uuid) to service_role;

-- Candidate only. Preserve CAS, audit events, operator replay and current-state recovery.
CREATE OR REPLACE FUNCTION gamecast_v503_w9.commit_state(p_session_id uuid, p_expected_version bigint, p_state jsonb, p_events jsonb, p_actor_id text, p_idempotency_key text, p_request_hash text, p_stamp timestamp with time zone)
 RETURNS TABLE(response jsonb, replayed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'gamecast_v503_w9'
AS $function$
declare
  current_session gamecast_v503_w9.sessions%rowtype;
  prior_request gamecast_v503_w9.requests%rowtype;
  next_version bigint;
  event jsonb;
  event_sequence integer := 0;
  committed_response jsonb;
  release_writes_enabled boolean;
begin
  if p_actor_id is null or p_actor_id = '' then raise exception 'actor required'; end if;
  if p_actor_id <> 'SCHEDULER' then
    if p_actor_id !~ '^[a-f0-9-]{36}$' or not gamecast_v503_w9.authorize_operator(p_actor_id::uuid) then raise exception 'Chairman forbidden'; end if;
  end if;
  select writes_enabled into release_writes_enabled from gamecast_v503_w9.release_control where singleton for share;
  if release_writes_enabled is distinct from true then raise exception 'release writes disabled'; end if;
  if p_expected_version is null or p_expected_version < 1 then raise exception 'version required'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9._~-]{16,128}$' then raise exception 'invalid idempotency key'; end if;
  if p_request_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid request hash'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'array' or jsonb_array_length(p_state) <> 52 then raise exception 'active state count mismatch'; end if;
  if (select count(distinct game->>'id') from jsonb_array_elements(p_state) game) <> 52 then raise exception 'active game identity mismatch'; end if;
  if (select count(distinct (game->>'kickoffOrder')::integer) from jsonb_array_elements(p_state) game) <> 52 then
    raise exception 'active kickoff order mismatch';
  end if;
  if (select array_agg(game->>'id' order by (game->>'kickoffOrder')::integer) from jsonb_array_elements(p_state) game)
     <> array['G0406','G0408','G0436','G0419','G0396','G0431','G0441','G0445','G0421','G0399','G0400','G0401','G0403','G0404','G0407','G0409','G0410','G0411','G0416','G0418','G0420','G0422','G0424','G0429','G0432','G0434','G0437','G0442','G0413','G0433','G0398','G0415','G0423','G0426','G0443','G0425','G0428','G0438','G0440','G0402','G0394','G0435','G0444','G0412','G0414','G0430','G0439','G0417','G0395','G0405','G0397','G0427']::text[] then
    raise exception 'active game identity/order mismatch';
  end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) = 0 then raise exception 'audit events required'; end if;

  select * into current_session from gamecast_v503_w9.sessions where session_id = p_session_id for update;
  if not found then raise exception 'session not found'; end if;
  if current_session.week_key <> '2026-W09'
     or current_session.engine_version <> 'GC-W9-V5.0.3-RC1'
     or current_session.public_slug !~ '^w9v503-[a-f0-9]{16}$' then
    raise exception 'foreign release/session rejected';
  end if;

  select * into prior_request
  from gamecast_v503_w9.requests
  where session_id = p_session_id and actor_id = p_actor_id and idempotency_key = p_idempotency_key;
  if found then
    if prior_request.request_hash <> p_request_hash then raise exception 'idempotency conflict'; end if;
    response := prior_request.response; replayed := true; return next; return;
  end if;

  if current_session.state_version <> p_expected_version then raise exception 'version conflict'; end if;
  if exists (
    select 1 from jsonb_array_elements(current_session.state) old_game
    join jsonb_array_elements(p_state) new_game on new_game->>'id'=old_game->>'id'
    where old_game#>>'{weather,locked}'='true'
      and old_game->'weather' is distinct from new_game->'weather'
      and not (
        new_game->>'lifecycle'='UNLAUNCHED'
        and new_game->'weather' @> '{"locked":false,"lockedAtZulu":null,"snapshotId":null}'::jsonb
        and ((old_game->'weather')-'locked'::text-'lockedAtZulu'::text-'snapshotId'::text) = ((new_game->'weather')-'locked'::text-'lockedAtZulu'::text-'snapshotId'::text)
        and exists (
          select 1 from jsonb_array_elements(p_events) purge_event
          where purge_event->>'type'='V503_PURGE_NEW_SEED' and purge_event->>'gameId'=old_game->>'id'
        )
      )
  ) then raise exception 'locked weather changed'; end if;
  if (select jsonb_agg(game->'id') from jsonb_array_elements(current_session.state) game)
     is distinct from (select jsonb_agg(game->'id') from jsonb_array_elements(p_state) game) then raise exception 'active game order changed'; end if;
  if p_stamp is null or p_stamp < current_session.last_advanced_at then raise exception 'invalid progression timestamp'; end if;

  next_version := current_session.state_version + 1;
  update gamecast_v503_w9.sessions
     set state = p_state, state_version = next_version, last_advanced_at = p_stamp, updated_at = p_stamp
   where session_id = p_session_id;

  for event in select value from jsonb_array_elements(p_events) loop
    if coalesce(event->>'type','') !~ '^V503_[A-Z0-9_]+$' then raise exception 'invalid event namespace'; end if;
    if event::text ~ '"(seedHex|rngState|pendingRandom|operatorToken|operator_token|operator_token_hash|schedulerSecret)"[[:space:]]*:' then
      raise exception 'private value in event payload';
    end if;
    insert into gamecast_v503_w9.events(session_id,state_version,event_sequence,event_type,game_id,actor_id,payload)
    values (p_session_id,next_version,event_sequence,event->>'type',event->>'gameId',p_actor_id,coalesce(event->'payload','{}'::jsonb));
    event_sequence := event_sequence + 1;
  end loop;

  committed_response := jsonb_build_object(
    'public_slug',current_session.public_slug,
    'engine_version',current_session.engine_version,
    'week_key',current_session.week_key,
    'state_version',next_version,
    'state',p_state
  );
  if p_actor_id = 'SCHEDULER' then
    committed_response := (committed_response - 'state') || jsonb_build_object('receipt_format','scheduler-v1');
  end if;
  insert into gamecast_v503_w9.requests(session_id,actor_id,idempotency_key,request_hash,response,committed_state_version)
  values (p_session_id,p_actor_id,p_idempotency_key,p_request_hash,committed_response,next_version);
  response := committed_response; replayed := false; return next;
end;
$function$;

revoke all on function gamecast_v503_w9.commit_state(p_session_id uuid, p_expected_version bigint, p_state jsonb, p_events jsonb, p_actor_id text, p_idempotency_key text, p_request_hash text, p_stamp timestamp with time zone) from public,anon,authenticated;

grant execute on function gamecast_v503_w9.commit_state(p_session_id uuid, p_expected_version bigint, p_state jsonb, p_events jsonb, p_actor_id text, p_idempotency_key text, p_request_hash text, p_stamp timestamp with time zone) to service_role;

CREATE OR REPLACE FUNCTION gamecast_v503_w9.create_session(p_owner_user_id uuid, p_public_slug text, p_data_version text, p_state jsonb, p_idempotency_key text, p_request_hash text)
 RETURNS TABLE(response jsonb, replayed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'gamecast_v503_w9'
AS $function$
declare
  prior_request gamecast_v503_w9.creation_requests%rowtype;
  new_session_id uuid;
  created_response jsonb;
  release_writes_enabled boolean;
begin
  if not gamecast_v503_w9.authorize_operator(p_owner_user_id) then raise exception 'Chairman forbidden'; end if;
  select writes_enabled into release_writes_enabled from gamecast_v503_w9.release_control where singleton for share;
  if release_writes_enabled is distinct from true then raise exception 'release writes disabled'; end if;
  if p_public_slug !~ '^w9v503-[a-f0-9]{16}$' then raise exception 'invalid release session'; end if;
  if p_data_version <> 'W9-SLATE52+RATINGS121+CSV_dc8160bcfcb2429a+V503' then raise exception 'data version mismatch'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9._~-]{16,128}$' then raise exception 'invalid idempotency key'; end if;
  if p_request_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid request hash'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'array' or jsonb_array_length(p_state) <> 52 then raise exception 'active state count mismatch'; end if;
  if (select count(distinct game->>'id') from jsonb_array_elements(p_state) game) <> 52 then raise exception 'active game identity mismatch'; end if;
  if (select count(distinct (game->>'kickoffOrder')::integer) from jsonb_array_elements(p_state) game) <> 52 then
    raise exception 'active kickoff order mismatch';
  end if;
  if (select array_agg(game->>'id' order by (game->>'kickoffOrder')::integer) from jsonb_array_elements(p_state) game)
     <> array['G0406','G0408','G0436','G0419','G0396','G0431','G0441','G0445','G0421','G0399','G0400','G0401','G0403','G0404','G0407','G0409','G0410','G0411','G0416','G0418','G0420','G0422','G0424','G0429','G0432','G0434','G0437','G0442','G0413','G0433','G0398','G0415','G0423','G0426','G0443','G0425','G0428','G0438','G0440','G0402','G0394','G0435','G0444','G0412','G0414','G0430','G0439','G0417','G0395','G0405','G0397','G0427']::text[] then
    raise exception 'active game identity/order mismatch';
  end if;
  if (select count(*) from gamecast_v503_w9.final_snapshots) <> 0 then raise exception 'Week 9 must not import Week 7 finals'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_state) game
    join gamecast_v503_w9.final_snapshots final on final.game_id = game->>'id'
  ) then raise exception 'final/active game overlap'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_user_id::text || ':' || p_idempotency_key, 0));
  select * into prior_request from gamecast_v503_w9.creation_requests
   where actor_id = p_owner_user_id and idempotency_key = p_idempotency_key;
  if found then
    if prior_request.request_hash <> p_request_hash then raise exception 'idempotency conflict'; end if;
    response := prior_request.response; replayed := true; return next; return;
  end if;

  insert into gamecast_v503_w9.sessions(public_slug,owner_user_id,week_key,engine_version,data_version,state)
  values (p_public_slug,p_owner_user_id,'2026-W09','GC-W9-V5.0.3-RC1',p_data_version,p_state)
  returning session_id into new_session_id;
  created_response := jsonb_build_object(
    'session_id',new_session_id,'public_slug',p_public_slug,'week_key','2026-W09',
    'engine_version','GC-W9-V5.0.3-RC1','data_version',p_data_version,'state_version',1
  );
  insert into gamecast_v503_w9.events(session_id,state_version,event_type,game_id,actor_id,payload)
  values (new_session_id,1,'V503_SESSION_CREATE',null,p_owner_user_id::text,
          jsonb_build_object('data_version',p_data_version,'game_count',52));
  insert into gamecast_v503_w9.creation_requests(actor_id,idempotency_key,request_hash,response)
  values (p_owner_user_id,p_idempotency_key,p_request_hash,created_response);
  response := created_response; replayed := false; return next;
end;
$function$;

revoke all on function gamecast_v503_w9.create_session(p_owner_user_id uuid, p_public_slug text, p_data_version text, p_state jsonb, p_idempotency_key text, p_request_hash text) from public,anon,authenticated;

grant execute on function gamecast_v503_w9.create_session(p_owner_user_id uuid, p_public_slug text, p_data_version text, p_state jsonb, p_idempotency_key text, p_request_hash text) to service_role;

CREATE OR REPLACE FUNCTION gamecast_v503_w9.read_final_snapshots()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'gamecast_v503_w9'
AS $function$
  select coalesce(jsonb_agg(display_payload order by slate_order),'[]'::jsonb)
  from gamecast_v503_w9.final_snapshots;
$function$;

revoke all on function gamecast_v503_w9.read_final_snapshots() from public,anon,authenticated;

grant execute on function gamecast_v503_w9.read_final_snapshots() to service_role;

CREATE OR REPLACE FUNCTION gamecast_v503_w9.read_request(p_session_id uuid, p_actor_id text, p_idempotency_key text, p_request_hash text)
 RETURNS TABLE(response jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'gamecast_v503_w9'
AS $function$
declare prior gamecast_v503_w9.requests%rowtype;
begin
  if p_actor_id is null then raise exception 'actor required'; end if;
  if p_actor_id <> 'SCHEDULER' then
    if p_actor_id !~ '^[a-f0-9-]{36}$' or not gamecast_v503_w9.authorize_operator(p_actor_id::uuid) then raise exception 'Chairman forbidden'; end if;
  end if;
  select * into prior from gamecast_v503_w9.requests where session_id=p_session_id and actor_id=p_actor_id and idempotency_key=p_idempotency_key;
  if found then
    if prior.request_hash is distinct from p_request_hash then raise exception 'idempotency conflict'; end if;
    response:=prior.response;return next;
  end if;
end;
$function$;

revoke all on function gamecast_v503_w9.read_request(p_session_id uuid, p_actor_id text, p_idempotency_key text, p_request_hash text) from public,anon,authenticated;

grant execute on function gamecast_v503_w9.read_request(p_session_id uuid, p_actor_id text, p_idempotency_key text, p_request_hash text) to service_role;

CREATE OR REPLACE FUNCTION gamecast_v503_w9.read_session(p_slug text)
 RETURNS TABLE(session_id uuid, public_slug text, owner_user_id uuid, week_key text, engine_version text, data_version text, state jsonb, state_version bigint, last_advanced_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'gamecast_v503_w9'
AS $function$
  select s.session_id,s.public_slug,s.owner_user_id,s.week_key,s.engine_version,
         s.data_version,s.state,s.state_version,s.last_advanced_at
  from gamecast_v503_w9.sessions s
  where s.public_slug = p_slug
    and p_slug ~ '^w9v503-[a-f0-9]{16}$'
    and s.week_key = '2026-W09'
    and s.engine_version = 'GC-W9-V5.0.3-RC1';
$function$;

revoke all on function gamecast_v503_w9.read_session(p_slug text) from public,anon,authenticated;

grant execute on function gamecast_v503_w9.read_session(p_slug text) to service_role;

CREATE OR REPLACE FUNCTION gamecast_v503_w9.reject_final_snapshot_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'gamecast_v503_w9'
AS $function$
begin
  raise exception 'immutable final snapshots cannot be updated or deleted';
end;
$function$;

revoke all on function gamecast_v503_w9.reject_final_snapshot_mutation() from public,anon,authenticated;

grant execute on function gamecast_v503_w9.reject_final_snapshot_mutation() to service_role;

CREATE OR REPLACE FUNCTION gamecast_v503_w9.scheduler_sessions()
 RETURNS TABLE(public_slug text, state_version bigint, last_advanced_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'gamecast_v503_w9'
AS $function$
  select s.public_slug,s.state_version,s.last_advanced_at from gamecast_v503_w9.sessions s
  where s.engine_version='GC-W9-V5.0.3-RC1' and s.week_key='2026-W09'
    and s.public_slug ~ '^w9v503-[a-f0-9]{16}$'
    and exists(select 1 from jsonb_array_elements(s.state) g where g->>'lifecycle' in ('ACTIVE','EDIT','DELAY')
      or (g->>'lifecycle'='UNLAUNCHED' and g#>>'{deadman,status}' in ('ARMED','BLOCKED')))
  order by s.last_advanced_at,s.session_id;
$function$;

revoke all on function gamecast_v503_w9.scheduler_sessions() from public,anon,authenticated;

grant execute on function gamecast_v503_w9.scheduler_sessions() to service_role;

CREATE TRIGGER final_snapshots_immutable BEFORE DELETE OR UPDATE ON gamecast_v503_w9.final_snapshots FOR EACH ROW EXECUTE FUNCTION gamecast_v503_w9.reject_final_snapshot_mutation();

grant select,insert,update,delete on all tables in schema gamecast_v503_w9 to service_role;

grant usage,select on all sequences in schema gamecast_v503_w9 to service_role;


alter role authenticator set pgrst.db_schemas = 'public, graphql_public, gamecast_v500, gamecast_v501, gamecast_v501_w8, gamecast_v502_w8, gamecast_v503_w9';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
