# GC-BOARD-1 — authenticated QA session board

Additive read-only route: `GET gamecast-v5-1-0-qa-wp?session=qa-v510-...&view=roster`.

1. Existing allowed-origin, validated bearer, active Chairman session-grant checks apply. Authorization is repeated inside the same SQL snapshot as the read.
2. No write, simulation advance, sampling, result acceptance, or official publication occurs.
3. Response identity: contractVersion GC-BOARD-1, sessionId, nonnegative integer stateVersion, generatedAt (source commit UTC).
4. games contains all 1–56 distinct source game IDs in authoritative source order. No inferred or invented roster entries.
5. Each row includes id, runId, lifecycle, nullable away/home names and records, network, kickoffZulu, week, and availability.
6. Lifecycle comes directly from the committed engine source. FINAL_PENDING is displayed as final, not accepted. DELAY and EDIT remain in the in-progress lane.
7. Scoreboard and two totalPoints summaries are returned only when reporting matches source version/run, is not corrected, and availability is AVAILABLE.
8. Pending projection returns BLOCKED / SOURCE_PENDING. Corrected reporting returns BLOCKED / CHAIRMAN_CORRECTION. Neither includes statistics.
9. Source history, seed, RNG, commands, controls, play history and priors are excluded. Full game details and WP history retain their existing separate contracts.
10. Method errors return 405; invalid QA scope 400; authentication 401; authorization 403; backend or invalid source 503 with existing redaction.
11. UI defaults to all session games. An optional explicit ID subset may narrow the board but cannot introduce games outside the authorized roster. A failed board request clears displayed data.
12. One SQL statement provides a consistent read. Client credentials remain in memory. This is a QA feature, not production certification.

Rollback: restore the preceding QA UI asset inventory and WP Edge bundle v15. Existing WP board/history routes and reporting contracts are unchanged.
