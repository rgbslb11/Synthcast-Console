# Load and full replay QA

Baseline 14e6aa7. Procedures 02 and 05 and router read. Dedicated branch development/gamecast-v5.1.0-load. No engine or production changes.

1. Rate-limit investigation: instrumented each fetch with status, elapsed time, Retry-After, and Supabase request ID. 29 HTTP 200 responses followed by three fetch exceptions in 0–1 ms, with no HTTP response and a trace-scoped rate-limit message. The test stopped without bypassing the limit. The enforcing component remains unproven; this is not evidence of a GameCast HTTP 429.
2. Sustained 56-game QA: BLOCKED by that request-path limit. Planned three rounds of all 56 games, concurrency four, one-second inter-batch spacing and ten-second inter-round spacing. Only 32 attempts in the first round completed: 29 responses, three exceptions; 24 games not attempted. All successful responses were revision 4, including the expected correction-blocked game. No sustained-load certification. Raw evidence: evidence/hosted-load-20261104.json.
3. Full replay: PASS for BOTH G0508 (148 records) and G0531 (140 records). Hosted advancement returned HTTP 200 at source revision 7. SQL compared complete histories at revisions 3 and 7, excluding only masterZulu. Both original/replay lifecycles FINAL_PENDING. No accepted/official result.

Cleanup: logout 204, test identity deletion 200, grants revoked. Harness replaced with JWT-protected HTTP 410 handler version 10. No pending projection for either current QA session; zero active grants. 5.0.6 and Week 11 untouched. Production: DO NOT APPROVE while load and other integration gates remain open.

Next: run the same instrumented load plan through an approved test runner whose request budget supports the planned load, or obtain the documented limit for the current runner. Do not raise production limits or claim capacity from this incomplete run.
