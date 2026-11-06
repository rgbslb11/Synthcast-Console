# GC-WP-FINAL-FRESHNESS-1 — additive read verification

The hosted QA browser check exposed an unchanged final observation at revision 23
being rejected against session/reporting revision 24. Final observations correctly
stop sampling; unrelated later session commits must not rewrite their history.

The history GET adds `verifiedSourceVersion` only on a successful, authorized,
caught-up database snapshot. It identifies the session source revision validated
by that read. `summary.stateVersion` and every historical point remain unchanged.
Pending source responses do not carry this proof. The existing board envelope
already supplies `sourceVersion` and `wpVersion` for equivalent validation.

The UI permits an older observation only when status is FINAL, probability is 0
or 1, session/game/run identity matches, and the server-verified source revision
equals the current details revision. Active estimates and blocked states retain
the existing exact-revision rule. A board with mismatched progress, missing game,
different run, or stale fetch cannot authorize this exception.

No formula, historical event, frozen prior, journal, score or lifecycle changes.
This is an additive transport verification field; GC-STATS-1 is unchanged.
Regression covers all 56 finals surviving a later no-op source revision without
changing any summary or history, plus identity, pending-source and non-final denial.
