SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
LOCK TABLE gamecast_v501.final_snapshots IN ACCESS EXCLUSIVE MODE;
DO $check$ BEGIN
 IF EXISTS(SELECT 1 FROM gamecast_v501.release_control WHERE writes_enabled) THEN RAISE EXCEPTION 'candidate writes must remain off'; END IF;
 IF NOT EXISTS(SELECT 1 FROM gamecast_v501.final_snapshots WHERE game_id='G0331' AND away_team='Kansas' AND home_team='Utah' AND away_score=7 AND home_score=70) THEN RAISE EXCEPTION 'G0331 correction precondition changed'; END IF;
END $check$;
ALTER TABLE gamecast_v501.final_snapshots DISABLE TRIGGER final_snapshots_immutable;
WITH basis AS (
 SELECT s.session_id,s.state_version,COALESCE((SELECT max(e.event_sequence) FROM gamecast_v501.events e WHERE e.session_id=s.session_id AND e.state_version=s.state_version),-1)+1 AS next_sequence
 FROM gamecast_v501.sessions s WHERE s.public_slug='w7v501-0000000000000001'
)
INSERT INTO gamecast_v501.events(session_id,state_version,event_sequence,event_type,game_id,actor_id,payload)
SELECT b.session_id,b.state_version,b.next_sequence,'V501_OWNER_FINAL_REFERENCE_CORRECTION','G0331','OWNER_APPROVED_CORRECTION',
jsonb_build_object('approvedBy','Gary','beforeAway',f.away_score,'beforeHome',f.home_score,'afterAway',24,'afterHome',56,'source','W07_ALAX_APPROVED_SCORE_REGISTER_54.csv','originalSourceEvidenceHash',f.source_evidence_hash,'originalSourceStateVersion',f.source_state_version,'originalImportBatchHash',f.import_batch_hash,'scope','reference final only; engine histories unchanged')
FROM basis b CROSS JOIN gamecast_v501.final_snapshots f WHERE f.game_id='G0331';
UPDATE gamecast_v501.final_snapshots
SET away_score=24,home_score=56,source_state_version=452,
source_evidence_hash='babc5e5be3bc84840f23836d0c9dc6e7a882e7e1fb99ba4815dafe99d9072334',
display_payload=jsonb_set(jsonb_set(display_payload,'{scores}','{"1":[0,7],"2":[7,14],"3":[17,14],"4":[0,21]}'::jsonb),'{lastPlay}',to_jsonb('Final reference corrected by owner approval: Kansas 24, Utah 56'::text))
||jsonb_build_object('referenceCorrection',jsonb_build_object('approvedBy','Gary','source','W07_ALAX_APPROVED_SCORE_REGISTER_54.csv','correctedAt',now(),'previousAwayScore',7,'previousHomeScore',70,'originalImportBatchHash',import_batch_hash,'underlyingPlayStatisticsVerified',false))
WHERE game_id='G0331';
ALTER TABLE gamecast_v501.final_snapshots ENABLE TRIGGER final_snapshots_immutable;
DO $assert$ BEGIN
 IF (SELECT count(*) FROM gamecast_v501.final_snapshots)<>13 OR NOT EXISTS(SELECT 1 FROM gamecast_v501.final_snapshots WHERE game_id='G0331' AND away_score=24 AND home_score=56) THEN RAISE EXCEPTION 'G0331 verification failed'; END IF;
END $assert$;