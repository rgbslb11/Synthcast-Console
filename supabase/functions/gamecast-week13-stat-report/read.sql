-- Read-only reporting for the operating Week 13 board. Execute only through the Edge function.
create function public.gc508_w13_stat_report(p_actor uuid, p_game text default null)
returns jsonb language sql stable security invoker
set search_path = pg_catalog, gamecast_v508_w13
as $report$
  with board as materialized (
    select s.session_id, s.state, s.state_version, s.engine_version
    from gamecast_v508_w13.sessions s
    where s.public_slug = 'w13v508-6ecefa636ecf706e'
      and s.engine_version = 'GC-W13-V5.0.8-RC1'
      and gamecast_v508_w13.authorize_operator(p_actor)
  ), selected as (
    select b.*, g.item
    from board b cross join lateral jsonb_array_elements(b.state) g(item)
    where g.item->>'id' = p_game
  ), audit as (
    select e.event_type, e.state_version, e.event_sequence, e.payload
    from gamecast_v508_w13.events e join selected s using (session_id)
    where e.game_id = p_game and e.state_version <= s.state_version
  )
  select case when p_game is null then (
    select jsonb_build_object('corrected', coalesce((
      select jsonb_agg(distinct e.game_id)
      from gamecast_v508_w13.events e
      where e.session_id=b.session_id and e.state_version<=b.state_version
        and e.event_type in ('V508_SCORE','V508_CLOCK_SET','V508_EDIT_COMMIT','V508_END','V508_REOPEN_LIVE')
    ),'[]'::jsonb)) from board b
  ) else (
    select jsonb_build_object(
      'version',s.state_version,'engine',s.engine_version,
      'game',jsonb_build_object('id',s.item->'id','runId',s.item->'runId',
        'lifecycle',s.item->'lifecycle','qaOnly',s.item->'qaOnly','scores',s.item->'scores',
        'history',s.item->'history','teamPlayCount',s.item->'teamPlayCount',
        'teamTopSeconds',s.item->'teamTopSeconds','quarterLengthSeconds',s.item->'quarterLengthSeconds'),
      'audit', coalesce((select jsonb_agg(jsonb_build_object(
        'type',a.event_type,'run',a.payload->'runId','score',a.payload->'score','stamp',a.payload->'masterZulu'
      ) order by a.state_version,a.event_sequence) from audit a where a.event_type in
        ('V508_SCORE','V508_CLOCK_SET','V508_EDIT_COMMIT','V508_END','V508_REOPEN_LIVE','V508_ACCEPT',
         'V508_PURGE_NEW_SEED','V508_RESTART_SAME_SEED')),'[]'::jsonb),
      'journalMatches', coalesce((select jsonb_agg(a.payload order by a.state_version,a.event_sequence)
        from audit a where a.event_type='V508_FOOTBALL_RECORD'),'[]'::jsonb) =
        coalesce((select jsonb_agg(h.item order by h.position)
        from jsonb_array_elements(s.item->'history') with ordinality h(item,position)
        where h.item->>'source' is distinct from 'MANUAL'),'[]'::jsonb)
    ) from selected s
  ) end;
$report$;
revoke all on function public.gc508_w13_stat_report(uuid,text) from public,anon,authenticated;
grant execute on function public.gc508_w13_stat_report(uuid,text) to service_role;
notify pgrst,'reload schema';
