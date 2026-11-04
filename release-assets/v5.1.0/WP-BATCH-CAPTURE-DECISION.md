# WP committed batch capture decision

Baseline: development/gamecast-v5.1.0 at 8a1a647845d2ab6c05241973239937b6ca1e6ab3. Procedures 04/05 and 02 loaded. Chairman approved margin-derived initial WP and atomic committed-state capture. 5.0.6 remains protected; no runtime or cloud changes made here.

P1 integration gap: createQaController executes up to 112 actions, then commits one final games snapshot. Each action event stores gameId, command and requestHash; no action-level observed state. The source journal is immutable and captures this final snapshot atomically, but does not retain intermediate action states.

Reproduction: tests/v510/database/wp-batch-witness.test.mjs executes edit_begin and edit_cancel together. Revision 8 contains both command events and only ACTIVE/editing=false state. Test PASS establishes the missing capture, not a WP repair. No temporary BLOCKED-state input can be recovered from the persisted snapshot alone. Launch followed by advancement in one batch similarly requires an explicit capture boundary.

Recommended contract extension: record allowlisted post-action snapshots in the same source transaction; publish them to WP only after that transaction commits. Each record carries source revision and action ordinal, distinguishing action sequence from independently committed states. Preserve existing batch atomicity. An aborted transaction yields zero observations. Read-only WP never sees pending outcomes or RNG. The prior freezes at the Launch action within the successfully committed transaction. Actions/football remain unchanged.

Alternative: require separate source commits for WP-relevant actions. This changes batch atomicity and partial-failure semantics and is not recommended.

Chairman decision required: may WP history include transaction-committed action-level captures, identified as such, or must each WP-relevant action become a separately committed revision? This is an authoritative capture semantics clarification, not a request to reapprove the already selected model. No implementation of this extension yet. Not ready for UI integration. No deployment authorization requested.
