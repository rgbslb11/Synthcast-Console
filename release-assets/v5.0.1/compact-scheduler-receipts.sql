-- Candidate only. Preserve CAS, audit events, operator replay and current-state recovery.
CREATE OR REPLACE FUNCTION gamecast_v501.commit_state(p_session_id uuid, p_expected_version bigint, p_state jsonb, p_events jsonb, p_actor_id text, p_idempotency_key text, p_request_hash text, p_stamp timestamp with time zone)
 RETURNS TABLE(response jsonb, replayed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'gamecast_v501'
AS $function$
declare
  current_session gamecast_v501.sessions%rowtype;
  prior_request gamecast_v501.requests%rowtype;
  next_version bigint;
  event jsonb;
  event_sequence integer := 0;
  committed_response jsonb;
  release_writes_enabled boolean;
begin
  if p_actor_id is null or p_actor_id = '' then raise exception 'actor required'; end if;
  if p_actor_id <> 'SCHEDULER' then
    if p_actor_id !~ '^[a-f0-9-]{36}$' or not gamecast_v501.authorize_operator(p_actor_id::uuid) then raise exception 'Chairman forbidden'; end if;
  end if;
  select writes_enabled into release_writes_enabled from gamecast_v501.release_control where singleton for share;
  if release_writes_enabled is distinct from true then raise exception 'release writes disabled'; end if;
  if p_expected_version is null or p_expected_version < 1 then raise exception 'version required'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9._~-]{16,128}$' then raise exception 'invalid idempotency key'; end if;
  if p_request_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid request hash'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'array' or jsonb_array_length(p_state) <> 41 then raise exception 'active state count mismatch'; end if;
  if (select count(distinct game->>'id') from jsonb_array_elements(p_state) game) <> 41 then raise exception 'active game identity mismatch'; end if;
  if (select count(distinct (game->>'kickoffOrder')::integer) from jsonb_array_elements(p_state) game) <> 41 then
    raise exception 'active kickoff order mismatch';
  end if;
  if (select array_agg(game->>'id' order by (game->>'kickoffOrder')::integer) from jsonb_array_elements(p_state) game)
     <> array['G0285','G0290','G0295','G0296','G0297','G0308','G0314','G0315','G0316','G0318','G0319','G0322','G0325','G0334','G0337','G0287','G0291','G0302','G0303','G0304','G0306','G0307','G0309','G0311','G0312','G0321','G0326','G0332','G0336','G0305','G0286','G0289','G0310','G0333','G0301','G0317','G0284','G0292','G0323','G0313','G0327']::text[] then
    raise exception 'active game identity/order mismatch';
  end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) = 0 then raise exception 'audit events required'; end if;

  select * into current_session from gamecast_v501.sessions where session_id = p_session_id for update;
  if not found then raise exception 'session not found'; end if;
  if current_session.week_key <> '2026-W07'
     or current_session.engine_version <> 'GC-W7-V5.0.1-RC1'
     or current_session.public_slug !~ '^w7v501-[a-f0-9]{16}$' then
    raise exception 'foreign release/session rejected';
  end if;

  select * into prior_request
  from gamecast_v501.requests
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
          where purge_event->>'type'='V501_PURGE_NEW_SEED' and purge_event->>'gameId'=old_game->>'id'
        )
      )
  ) then raise exception 'locked weather changed'; end if;
  if (select jsonb_agg(game->'id') from jsonb_array_elements(current_session.state) game)
     is distinct from (select jsonb_agg(game->'id') from jsonb_array_elements(p_state) game) then raise exception 'active game order changed'; end if;
  if p_stamp is null or p_stamp < current_session.last_advanced_at then raise exception 'invalid progression timestamp'; end if;

  next_version := current_session.state_version + 1;
  update gamecast_v501.sessions
     set state = p_state, state_version = next_version, last_advanced_at = p_stamp, updated_at = p_stamp
   where session_id = p_session_id;

  for event in select value from jsonb_array_elements(p_events) loop
    if coalesce(event->>'type','') !~ '^V501_[A-Z0-9_]+$' then raise exception 'invalid event namespace'; end if;
    if event::text ~ '"(seedHex|rngState|pendingRandom|operatorToken|operator_token|operator_token_hash|schedulerSecret)"[[:space:]]*:' then
      raise exception 'private value in event payload';
    end if;
    insert into gamecast_v501.events(session_id,state_version,event_sequence,event_type,game_id,actor_id,payload)
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
  insert into gamecast_v501.requests(session_id,actor_id,idempotency_key,request_hash,response,committed_state_version)
  values (p_session_id,p_actor_id,p_idempotency_key,p_request_hash,committed_response,next_version);
  response := committed_response; replayed := false; return next;
end;
$function$
