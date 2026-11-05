# QA load runner diagnostic retry — approval required

Prepared 2026-11-05. No deployment performed. Automatic approval review rejected reactivation of gamecast-v5-1-0-qa-wp-load because it would restore privileged database/auth operations with platform verify_jwt=false, using its own Vault-backed worker token instead. The deployed runner remains retired v2 (410), verify_jwt=true.

The prepared revision retains the existing fixed qa-v510-wp-load-r3 scope and private token check. It adds per-endpoint HTTP status, elapsed time, Retry-After and sanitized transport exception evidence. It resumes from the actual source revision and does not rerun prior setup or launch. Six rounds each read 56 games in batches of eight while one 60-second QA advance commits, with five seconds between rounds. It creates a temporary QA identity, verifies password login, grants only the fixed test session, and attempts grant removal/logout/identity deletion in finally. Cleanup must be independently verified after any run. This is a bounded integration workload, not a 2-hour soak or production certification.

Chairman approval is required to reactivate this exact private QA runner for one bounded run and retire it immediately afterward. No production endpoint, result acceptance, tuning or prior release is involved. Do not bypass the rejected deployment through SQL or an alternate endpoint.
