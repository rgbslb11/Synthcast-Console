-- Read-only export. Replace :lower_version and :upper_version with validated integers.
SET statement_timeout='50s';
WITH ranged AS MATERIALIZED (
 SELECT r.committed_state_version,r.response,
        lag(r.response) OVER(ORDER BY r.committed_state_version) AS prev_response,
        jsonb_build_object('session_id',r.session_id,'actor_id',r.actor_id,
          'idempotency_key',r.idempotency_key,'request_hash',r.request_hash,
          'committed_state_version',r.committed_state_version,'created_at',r.created_at) AS metadata,
        encode(extensions.digest(r.response::text,'sha256'),'hex') AS response_sha256,
        encode(extensions.digest(to_jsonb(r)::text,'sha256'),'hex') AS row_sha256
 FROM gamecast_v500.requests r
 WHERE session_id=(SELECT session_id FROM gamecast_v500.sessions WHERE public_slug='w7v500-17e1dde75f5b1cba')
   AND committed_state_version BETWEEN :lower_version-1 AND :upper_version
)
SELECT metadata AS row,response_sha256,row_sha256,
 CASE WHEN prev_response IS NULL THEN jsonb_build_array('=',response)
 ELSE gamecast_v501_recovery_stage.delta(prev_response,response) END AS delta
FROM ranged WHERE committed_state_version>=:lower_version ORDER BY committed_state_version;
