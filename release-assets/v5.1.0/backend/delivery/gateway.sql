begin;
-- Service-only bridge avoids changing globally exposed PostgREST schemas.
create function public.gamecast_v510_gateway(p_operation text,p_args jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 case p_operation
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
