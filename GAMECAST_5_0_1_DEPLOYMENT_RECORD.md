# GameCast 5.0.1 deployment record

Status: **isolated QA deployed successfully; production release withheld**.
Application source SHA: d2b8b8c7e436dd7d50a1cb84e683dbe30041baa7.
Branch: release/gamecast-v5.0.1. No production/main merge.

## Interfaces

- Chairman: https://rgbslb11.github.io/Synthcast-Console/v5.0.1/?session=w7v501-0000000000000001
- Public: https://rgbslb11.github.io/Synthcast-Console/v5.0.1/?session=w7v501-0000000000000001&view=public
- Condensed: https://rgbslb11.github.io/Synthcast-Console/v5.0.1/ui1.3/?session=w7v501-0000000000000001

The displayed 41 active-slate slots are QA-only. Accept is intentionally denied in this isolated deployment. The 13 imported finals are immutable reference rows. Do not treat the test board as current approved Week 7 results.

GitHub Pages publication adds /v5.0.1/ to the existing site artifact. It does not switch the 5.0.0 route, replace any of its bytes, redirect it or alter its links. The publisher first verified and copied every one of the 99 prior files. Post-deployment verification at 2026-10-13T23:50:19.645Z confirmed all 99 plus 13 candidate files. A prior 503 aborted safely before publication.

## Backend and database

Supabase project xsvdmcipviejxynkdbhq, separate schema gamecast_v501.

| Function | Deployed version | Retrieved source verification |
|---|---:|---|
| gamecast-week7-v5-0-1-public | 1 | 14 files exact |
| gamecast-week7-v5-0-1-chairman | 2 | 14 files exact |
| gamecast-week7-v5-0-1-scheduler | 1 | 16 files exact |

The Chairman gateway requires a valid JWT, matching the existing 5.0.0 deployment; its handler also checks Supabase Auth and operator authorization. Public and scheduler gateway JWT checks remain disabled for their distinct boundaries: public GET is read only, Chairman authenticates through Supabase Auth and operator authorization, scheduler verifies HMAC or an independently stored cron token. Hosted unauthenticated/unsigned rejection was verified.

Migrations: gamecast_v501_isolated_qa; gamecast_v501_expose_isolated_schema; gamecast_v501_require_explicit_qa_flags; gamecast_v501_isolated_scheduler. SQL is retained in release-assets/v5.0.1. Exposing the schema appended gamecast_v501 to the existing REST schema list, preserving public, graphql_public and gamecast_v500. Anonymous/authenticated table access was not granted. RLS is enabled; service-only access is intentional.

Cron: gamecast_v501_isolated_qa every five seconds. It discovers only candidate sessions and uses a separate Vault token. Source cron was not changed. Bounded load fixtures were stopped; candidate scheduler discovery subsequently returned zero eligible sessions.

Project infrastructure settings are reused explicitly; separate schema/release switch/session identity prevent candidate writes to source sessions. Changing the shared project environment writes switch would affect both releases, so candidate rollback must use its own database release-control row.

Security advisor: RLS-with-no-policy is informational for these service-only tables. Project-wide leaked-password protection is disabled; this pre-existing warning is deferred rather than changing shared Auth during a maintenance release. [Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No secret values were retrieved or committed.

## Final evidence

Workflow 38486420375: verify, deploy and postdeployment all success.
Workflow 38486420332: regression success.
Source 5.0.0 functions remain public v3, Chairman v8, scheduler v5.
Source session v11213 and checksum unchanged. Main and source release branch remain separate.

Hosted authenticated Chairman and complete Deadman acceptance remain BLOCKED. Deployment success does not mean release approval.

Live cloud-browser observation at approximately 2026-10-14T00:02Z: hosted Public showed CLOUD V101 / POWER 41/41 with 54 cards; hosted Condensed showed SAT V101 / WK V101 with 54 cards. Chairman displayed the correct 5.0.1 QA identity and required sign-in. No credentials were inspected or entered.
