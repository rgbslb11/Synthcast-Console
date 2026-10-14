-- Proposed safeguard. LOCAL REHEARSAL ONLY until Gary approves operational cleanup.
-- Retired keys reject both identical and changed requests; their exact old responses
-- remain recoverable from the checksum-verified private archive.
CREATE SCHEMA gamecast_v501_cleanup;
REVOKE ALL ON SCHEMA gamecast_v501_cleanup FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE gamecast_v501_cleanup.retired_scheduler_requests (
 session_id uuid NOT NULL REFERENCES gamecast_v500.sessions(session_id),
 actor_id text NOT NULL CHECK(actor_id='SCHEDULER'),
 idempotency_key text NOT NULL,
 request_hash text NOT NULL,
 committed_state_version bigint NOT NULL,
 response_sha256 text NOT NULL,
 archive_manifest_sha256 text NOT NULL,
 retired_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(session_id,actor_id,idempotency_key)
);
ALTER TABLE gamecast_v501_cleanup.retired_scheduler_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON gamecast_v501_cleanup.retired_scheduler_requests FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION gamecast_v501_cleanup.reject_retired_receipt() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,gamecast_v501_cleanup AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM gamecast_v501_cleanup.retired_scheduler_requests r
   WHERE r.session_id=NEW.session_id AND r.actor_id=NEW.actor_id AND r.idempotency_key=NEW.idempotency_key)
 THEN RAISE EXCEPTION 'idempotency conflict: retired scheduler receipt'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION gamecast_v501_cleanup.reject_retired_receipt() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER reject_retired_scheduler_receipt BEFORE INSERT ON gamecast_v500.requests
 FOR EACH ROW EXECUTE FUNCTION gamecast_v501_cleanup.reject_retired_receipt();
