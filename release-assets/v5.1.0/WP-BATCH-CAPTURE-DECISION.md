# WP committed batch capture decision — resolved

Baseline: development/gamecast-v5.1.0 at 8a1a647845d2ab6c05241973239937b6ca1e6ab3.

The Chairman approved transaction-committed action-level captures. The controller now records allowlisted post-action snapshots in the same atomic source transaction. WP consumes them only after commit, identified by source version and action ordinal. An aborted batch produces zero observations. Football actions and batch atomicity remain unchanged.

The original gap was that Edit/Cancel in one batch persisted only its final game snapshot. The updated wp-batch-witness test now checks both intermediate states and failed-batch rollback. Launch freezes the pregame prior at its captured action boundary; retry/recovery uses the original committed captures.

Implementation, local evidence, limitations and the UI contract are documented in [WP-UI-HANDOFF.md](WP-UI-HANDOFF.md). UI development against fixtures is ready. Hosted integration and production certification remain outstanding. No 5.0.6 files or deployed services were changed.
