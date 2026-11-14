import fs from 'node:fs';import {createHash} from 'node:crypto';
const root='release-assets/v5.0.7.1',patch=JSON.parse(fs.readFileSync(root+'/schedule-patch.json'));
const hash=createHash('sha256').update(JSON.stringify(patch)).digest('hex');
const sql=`-- Chairman-approved SILENT FALL schedule only. No new arms, engine change,
-- launch, pause, new session, or historical correction. Existing cron stays on.
begin;
do $schedule$
declare
 s gamecast_v507_w12.sessions%rowtype;
 p jsonb := $patch$${JSON.stringify(patch)}$patch$::jsonb;
 revised jsonb; item jsonb; old_game jsonb; proposed jsonb; prior_hash text;
 allowed text[] := array['date','dateLabel','kickoff','kickoffZulu','kickoffTimeZone','network','carriageOrder','scheduleRevision','scheduleStatus','actualKickoffZulu','actualKickoffStatus','actualGameDateStatus','scheduleNote'];
begin
 select * into strict s from gamecast_v507_w12.sessions where public_slug='w12v507-506ff58ba0cfb7a5' for update;
 if s.engine_version<>'GC-W12-V5.0.7-RC1' or s.week_key<>'2026-W12' then raise exception 'Wrong operating release'; end if;
 select request_hash into prior_hash from gamecast_v507_w12.requests where session_id=s.session_id and actor_id=s.owner_user_id::text and idempotency_key='w12-silent-fall-5071-r1';
 if found then
  if prior_hash<>'${hash}' then raise exception 'Schedule idempotency conflict'; end if;
  return;
 end if;
 if jsonb_array_length(p)<>49 or (select count(distinct c->>'id') from jsonb_array_elements(p) c)<>49 then raise exception '49 unique amendments required';end if;
 revised:=s.state;
 for item in select value from jsonb_array_elements(p) loop
  select g into strict old_game from jsonb_array_elements(revised) g where g->>'id'=item->>'id';
  if old_game->>'lifecycle'<>'UNLAUNCHED' then raise exception 'Game % is protected',item->>'id';end if;
  if old_game#>>'{away,name}'<>item->>'away' or old_game#>>'{home,name}'<>item->>'home' then raise exception 'Team identity conflict';end if;
  if exists(select 1 from jsonb_object_keys(item->'patch') k where not(k=any(allowed))) then raise exception 'Non-schedule mutation rejected';end if;
  proposed:=old_game||(item->'patch');
  if (old_game-allowed) is distinct from (proposed-allowed) then raise exception 'Football state changed';end if;
  if old_game#>>'{deadman,status}'='ARMED' and old_game->>'kickoffZulu'<>proposed->>'kickoffZulu' then raise exception 'Armed kickoff change requires explicit trigger reconciliation';end if;
  select jsonb_agg(case when g->>'id'=item->>'id' then proposed else g end order by ord) into revised from jsonb_array_elements(revised) with ordinality as e(g,ord);
 end loop;
 if exists(select 1 from jsonb_array_elements(s.state) old join jsonb_array_elements(revised) new on old->>'id'=new->>'id' where (old-allowed) is distinct from (new-allowed)) then raise exception 'Protected state changed';end if;
 -- Preserve the progression checkpoint. Schedule maintenance must not consume
 -- elapsed time belonging to the live scheduler. CAS/versioning remains intact.
 perform * from gamecast_v507_w12.commit_state(s.session_id,s.state_version,revised,jsonb_build_array(jsonb_build_object('type','V507_SCHEDULE_REVISION','gameId',null,'payload',jsonb_build_object('revision','W12-SILENT-FALL-R1','uiRelease','5.0.7.1','sourceSha256','${hash}','amendedGames',49,'placeholderGames',jsonb_build_array('G0591','G0601'),'masterZulu',clock_timestamp()))),s.owner_user_id::text,'w12-silent-fall-5071-r1','${hash}',s.last_advanced_at);
end $schedule$;
commit;
`;
fs.writeFileSync(root+'/apply-schedule.sql',sql);
console.log('Prepared atomic 49-game amendment; existing progression timestamp and all non-schedule fields preserved.');
