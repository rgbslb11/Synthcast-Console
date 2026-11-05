# WP concurrent load gate — failed run

Fresh qa-v510-wp-load-r3, existing approved engine with isolated copied genesis and QA-only priors. Intended six rounds of 56 reads, batches of eight concurrent reads while source advances, followed by sampling and five-second waits.

Request 371456 returned a test report: temporary Auth identity/login/56-game launch passed; first three eight-read batches passed (24 reads). Then fetch raised: Rate limit exceeded for trace 01a1aa1d7730709487f5ef6e761b88d5. Retry after 48727ms. No endpoint HTTP status captured for the exception. Log search for trace returned no result. Attribution BLOCKED — NOT PROVEN; not evidence of a GameCast capacity ceiling. The intended load test FAILED to complete; no sustained-load pass claimed.

Source and WP progress both revision 2. Temporary identity logout 204/delete 200; SQL confirms zero test accounts. Temporary load function retired to JWT-required HTTP 410 v2. No rate-limit bypass. Other endpoints unchanged. UI, football model and production unchanged.

Next: instrument fetch exception with endpoint pathname/status when available and execute the same accepted workload in an authorized runner with sufficient quota. Preserve this failed test and isolated history. Browser integration and load acceptance remain outstanding.
