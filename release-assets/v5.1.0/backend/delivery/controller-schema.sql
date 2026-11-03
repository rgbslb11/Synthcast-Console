begin;
create function gamecast_v510.lookup_source_request(p_session_id text,p_request_id text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('stateVersion',state_version,'requestHash',events->0->>'requestHash') from gamecast_v510.source_commits where session_id=p_session_id and request_id=p_request_id;
$$;
create function gamecast_v510.qa_grant(p_session_id text,p_user_id uuid,p_active boolean) returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_session_id !~ '^qa-v510-[a-z0-9-]{1,64}$' or not exists(select 1 from gamecast_v510.source_heads where session_id=p_session_id) or p_active is null then raise exception 'QA_SCOPE_REQUIRED'; end if;
 insert into gamecast_v510.reporting_grants values(p_session_id,p_user_id,p_active) on conflict(session_id,user_id) do update set active=excluded.active;
end $$;
revoke all on function gamecast_v510.lookup_source_request(text,text),gamecast_v510.qa_grant(text,uuid,boolean) from public;
grant execute on function gamecast_v510.lookup_source_request(text,text),gamecast_v510.qa_grant(text,uuid,boolean) to service_role;
grant insert,update on gamecast_v510.reporting_grants to service_role;
commit;
begin;
-- Service-only bridge avoids changing globally exposed PostgREST schemas.
create or replace function public.gamecast_v510_gateway(p_operation text,p_args jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 case p_operation
 when 'lookup_source_request' then return gamecast_v510.lookup_source_request(p_args->>'p_session_id',p_args->>'p_request_id');
 when 'qa_grant' then perform gamecast_v510.qa_grant(p_args->>'p_session_id',(p_args->>'p_user_id')::uuid,(p_args->>'p_active')::boolean);return 'true'::jsonb;
 when 'authorize_reporting' then return to_jsonb(gamecast_v510.authorize_reporting((p_args->>'p_user_id')::uuid,p_args->>'p_session_id'));
 when 'read_reporting' then return gamecast_v510.read_reporting((p_args->>'p_user_id')::uuid,p_args->>'p_session_id',p_args->>'p_game_id',(p_args->>'p_after')::int,(p_args->>'p_limit')::int,p_args->>'p_run',(p_args->>'p_version')::bigint,(p_args->>'p_source_version')::bigint);
 when 'source_version' then return to_jsonb(gamecast_v510.source_version(p_args->>'p_session_id',p_args->>'p_game_id'));
 when 'load_source' then return gamecast_v510.load_source(p_args->>'p_session_id',(p_args->>'p_version')::bigint);
 when 'pending_source' then return to_jsonb(gamecast_v510.pending_source(p_args->>'p_session_id'));
 when 'commit_source' then return gamecast_v510.commit_source(p_args->>'p_session_id',(p_args->>'p_expected_version')::bigint,p_args->>'p_engine_version',p_args->'p_games',p_args->'p_events',p_args->>'p_request_id');
 when 'commit_reporting' then return gamecast_v510.commit_reporting(p_args->'p_packet');
 else raise exception 'OPERATION_DENIED'; end case;
end $$;
revoke all on function public.gamecast_v510_gateway(text,jsonb) from public,anon,authenticated;
grant execute on function public.gamecast_v510_gateway(text,jsonb) to service_role;
commit;
