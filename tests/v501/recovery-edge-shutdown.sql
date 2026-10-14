BEGIN;
UPDATE gc501_restore_20261014_r2.probe_control SET enabled=false WHERE singleton;
UPDATE gc501_restore_20261014_r2.release_control SET writes_enabled=false WHERE singleton;
REVOKE ALL ON FUNCTION gamecast_v501.recovery_probe_rpc(text,text,jsonb) FROM service_role;
COMMIT;
-- Redeploy the verifier with recovery-edge-closed.ts as index.ts and verify_jwt=true.
-- Verify an authenticated request returns 410 and never touches the database.
