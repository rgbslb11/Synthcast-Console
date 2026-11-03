# Week 11 rollover

Authorized November 3, 2026: preserve 5.0.5 behavior and all three interfaces; substitute approved Week11 inputs and isolated release bindings. Detailed Stats and WP remain on separate development branches.

Baseline 9d13c585. Fourteen deployed public bundle files match. Local rollover suite: 54/54 pass. Opening toss includes engine identity; cross-version seeds are not guaranteed identical tosses. Active checkpoint mechanics compare equal.

Rollback: disable only new schema writes and cron using rollback.sql; retain existing releases. No automatic launch or acceptance.
