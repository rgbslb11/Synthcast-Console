# GameCast 5.0.2 release

Authorization: Chairman requested implementation, testing and deployment of exactly four changes. Existing sessions and accepted results remain on their original release. No main merge or canonical-route replacement.

## Source and procedure

Baseline: `14063041b7d282f1b789042f4cfb016878eaafd3`, release/gamecast-v5.0.1. All 14 deployed Week 8 public dependencies matched repository bytes. The earlier QA baseline has one extra trailing blank line. Router and full procedures 02, 04 and 05 were read from docs/gamecast-codex-router commit `f3e5a811aad9e4431f9d375ffb2e1426656b416f`, and retained in this branch.

## Approved algorithms and contract

1. Remove chain-sustain yardage assistance in generatePlay. Consume the same eligible random draw (positive nonturnover/nonincomplete gain short of the line to gain, positive performance edge), without changing yards. First downs derive from actual generated yards.
2. Prioritize an in-range FG (field position >=62, existing 55-yard maximum): Q4 tied or trailing 1–3, fourth down with <=120 seconds or any down with <=8 seconds; Q2 any down with <=8 seconds. Preserve the tested >=5-second guard, existing kick success probabilities and all other fourth-down decisions. This conservative guard is a known limitation: the engine can finish a snapped play after zero; 1–4-second any-down kicks were not added to the approved policy.
3. Add preSnap {down,distance,fieldPos} and adjudicated {possession,fieldPos,down,distance,points} to newly applied plays/history. Description and yards retain the generated outcome; ruling prefixes remain. Generated yards are not NCAA credited yards capped at the goal line. This is an audit ledger improvement, not a statistics-system rewrite. Historical records are untouched.
4. Q4/period4 positive lead and 0<t<80: preserve safe kneel first; pass rates 5% on downs1–2 and third-and<=2, 15% third-and3–5, 40% third-and>5. Fourth-down decisions unchanged. Nonfumble runs use 2% out-of-bounds probability in this situation versus existing8%. Weather adjustment, defensive timeouts and pre-snap/timing behavior remain unchanged.

Explosive rating sensitivity, turnovers, HFA, ratings, schedule, weather and the three clocks retain their original formulas. No blowout/close-game/comeback controls. Same engine version, inputs and seed remain reproducible. Opening toss already includes engine version in its separate seed stream; comparisons hold that toss fixed to isolate model changes.

Authoritative state remains in the cloud. Existing JSON persistence transports the additive ledger fields; public projection continues to redact private history and seeds. UI changes are release identity, URLs and isolated browser storage only. Auth, command validation, retry/CAS and human acceptance rules remain inherited. Existing-session compatibility is achieved by isolation, not migration.

## Verification

- 42 automated regression groups PASS, including prior-release tests.
- 1,054 scenario/timing checks PASS; 2,988 play generations plus64 atomic applications.
- 8,400 full-game executions across56 matchups: 2,800 release games, 2,800 approved-QA comparisons and2,800 speed/chunk/JSON-recovery reruns. Exact controlled-toss history parity, valid finals and description-yard consistency passed.
- Prior multi-seed distribution evidence is applicable through exact candidate parity; no new tuning. Prior QA had22,400 executions across four variants. Release comparison files preserve per-matchup results.
- Actual new-schema transaction: engine/ledger serialization, commit, identical replay, conflicting replay rejection, stale-version rejection, read/recovery, audit count and RLS PASS. Probe transaction rolled back completely.
- All three deployed backend bundles fetched back and compared: zero differing source files; version1. See backend-receipt.json.
- All129 existing published files fetched and hash-verified before packaging15 new route files.
- Chromium/mobile-sized WebKit and UI publication are gated by deploy-v502 workflow. Native Mobile Safari and long-duration hosted full-load soak are NOT TESTED; no independent certification claimed.

## Deployment and rollback

New schema gamecast_v502_w8, session prefix w8v502-, engine GC-W8-V5.0.2-RC1, separate three Edge functions and /v5.0.2/w8/ routes. The56-game input CSV remains byte-identical. No existing game is migrated, replayed, accepted or published to SEUD.

Rollback: disable only gamecast_v502_w8.release_control.writes_enabled, its scheduler_cron_control.enabled and cron job gamecast_v502_week8. Retain its sessions/events/receipts. Existing5.0.1 routes/functions remain available and unchanged. Do not restore new sessions into an older engine or delete official history.

## Completed publication — October 15, 2026

Application commit: `836356f64ef86e6cfb64e5fb553915e5bb4323fc`, branch release/gamecast-v5.0.2.
Workflow https://github.com/rgbslb11/Synthcast-Console/actions/runs/38781047569: verify, deploy and postdeployment SUCCESS.

The Chairman explicitly authorized public publication of source, deployment configuration and documentation. The initial approval-review block was resolved. The first CI publication attempt failed the frozen CSV checksum because a text transfer normalized CRLF; the original Git blob was restored without changing its data. The successful run retained the original checksum and passed all gates below.

- 42 regression groups, 1,054 decision/timing checks and 8,400 full-game executions passed again in CI.
- Chromium and mobile-sized WebKit: 15 Week 8 UI checks per browser passed, covering Chairman, Public and Condensed using local runtime/API fixtures.
- Postdeployment verified all129 preserved published files and15 new5.0.2 files by SHA-256.
- Hosted Public and Condensed rendered56 games; Condensed Saturday rendered45. Hosted Chairman route and sign-in boundary verified; authenticated hosted Chairman commands were not exercised in this browser. Their local runtime/UI fixtures and actual database transaction tests passed.
- Public API returned GC-W8-V5.0.2-RC1 and56 unlaunched games with private seed/history fields redacted. Foreign-origin Public access rejected403, unauthenticated Chairman401 and scheduler POST403.
- New operating session `w8v502-19b0b56f2fa95cdf`, version1. All56 games UNLAUNCHED, AutoOFF, OnAirOFF, DeadmanUNARMED. No existing game was migrated or accepted.
- Writes, scheduler control and isolated cron are enabled. Authenticated scheduler dispatch returned200, no timeout/error, zero eligible sessions while all games are unlaunched/unarmed.
- Existing5.0.1 session remains bound to GC-W8-V5.0.1-RC1; all prior release source and published routes remain unchanged.

Chairman: https://rgbslb11.github.io/Synthcast-Console/v5.0.2/w8/?session=w8v502-19b0b56f2fa95cdf
Public: https://rgbslb11.github.io/Synthcast-Console/v5.0.2/w8/?session=w8v502-19b0b56f2fa95cdf&view=public
Condensed: https://rgbslb11.github.io/Synthcast-Console/v5.0.2/w8/ui1.3/?session=w8v502-19b0b56f2fa95cdf

Native Mobile Safari, authenticated hosted Chairman command testing and long-duration hosted full-load soak remain NOT TESTED for this release. This is a deployed, bounded-test release, not independent production certification. SEUD remains on hold. Rollback instructions above apply only to5.0.2.
