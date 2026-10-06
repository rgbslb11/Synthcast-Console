-- Negative tests only: each exception rolls back its nested subtransaction.
-- Do not alter any existing release row. No credentials are selected or returned.
do $$
declare candidate gamecast_v12.sessions%rowtype; prior_id uuid; modified jsonb; n bigint;
begin
 select s.* into strict candidate from gamecast_v12.sessions s where s.public_slug='w7v442-2a8270fc23cd9891';
 select s.session_id into strict prior_id from gamecast_v12.sessions s where s.engine_version='GC-W6-V4.4.1-RC1' limit 1;
 begin
  perform public.gamecast_v442_commit(prior_id,1,'[]',now(),'[]','CHAIRMAN');
  raise exception 'Foreign release test was not rejected';
 exception when others then if sqlerrm<>'Foreign release/session rejected' then raise; end if; end;
 select count(*) into n from public.gamecast_v442_commit(candidate.session_id,0,candidate.state,now(),'[{"type":"V442_TEST"}]','CHAIRMAN');
 if n<>0 then raise exception 'Stale-version test failed'; end if;
 begin
  perform public.gamecast_v442_commit(candidate.session_id,candidate.state_version,candidate.state,now(),'[{"type":"V442_TEST"}]','INVALID');
  raise exception 'Actor test was not rejected';
 exception when others then if sqlerrm<>'Invalid actor' then raise; end if; end;
 modified=jsonb_set(candidate.state,'{0,lifecycle}','"READY"'::jsonb);
 begin
  perform public.gamecast_v442_commit(candidate.session_id,candidate.state_version,modified,now(),'[{"type":"V442_TEST"}]','CHAIRMAN');
  raise exception 'QA promotion test was not rejected';
 exception when others then if sqlerrm<>'QA promotion rejected' then raise; end if; end;
 begin
  perform public.gamecast_v442_commit(candidate.session_id,candidate.state_version,candidate.state,now(),'[{"type":"V441_TEST"}]','CHAIRMAN');
  raise exception 'Event namespace test was not rejected';
 exception when others then if sqlerrm<>'Invalid event namespace' then raise; end if; end;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'gamecast_v442_%' and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))) then raise exception 'Public RPC access detected'; end if;
 if exists(select 1 from gamecast_v12.sessions s where s.session_id=candidate.session_id and (s.state is distinct from candidate.state or s.state_version<>candidate.state_version)) then raise exception 'Negative tests mutated candidate'; end if;
end $$;
select jsonb_build_object('classification','TEST RESULT','executed',7,'passed',7,'failed',0,'skipped',0,'checks',jsonb_build_array('foreign release rejected','stale version rejected','invalid actor rejected','QA promotion rejected','foreign event namespace rejected atomically','service-only grants','candidate state/version unchanged')) as result;
