SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '45s';
DO $retire$
DECLARE candidate_before text; candidate_after text;
BEGIN
 IF EXISTS(SELECT 1 FROM gamecast_v500.release_control WHERE writes_enabled)
 OR EXISTS(SELECT 1 FROM gamecast_v500.scheduler_cron_control WHERE enabled)
 OR EXISTS(SELECT 1 FROM cron.job WHERE jobname='gamecast-v500-scheduler-5s' AND active)
 THEN RAISE EXCEPTION '5.0.0 must be stopped before authorized retirement'; END IF;
 IF (SELECT count(*) FROM gamecast_v500.sessions) <> 1
 OR (SELECT count(*) FROM gamecast_v500.events) <> 17328
 OR (SELECT count(*) FROM gamecast_v500.requests) <> 11211
 OR (SELECT count(*) FROM gamecast_v500.creation_requests) <> 1
 OR (SELECT count(*) FROM gamecast_v500.final_snapshots) <> 13
 THEN RAISE EXCEPTION '5.0.0 retirement inventory changed'; END IF;
 SELECT md5(coalesce(string_agg(state::text || state_version::text, '|' ORDER BY public_slug),'')) INTO candidate_before FROM gamecast_v501.sessions;
 TRUNCATE TABLE gamecast_v500.events,gamecast_v500.requests,gamecast_v500.creation_requests,gamecast_v500.final_snapshots,gamecast_v500.sessions CONTINUE IDENTITY RESTRICT;
 SELECT md5(coalesce(string_agg(state::text || state_version::text, '|' ORDER BY public_slug),'')) INTO candidate_after FROM gamecast_v501.sessions;
 IF candidate_before IS DISTINCT FROM candidate_after
 OR (SELECT count(*) FROM gamecast_v501.sessions) <> 6
 OR (SELECT count(*) FROM gamecast_v501.events) <> 13615
 OR (SELECT count(*) FROM gamecast_v501.requests) <> 1171
 OR (SELECT count(*) FROM gamecast_v501.final_snapshots) <> 13
 THEN RAISE EXCEPTION '5.0.1 preservation check failed'; END IF;
END $retire$;