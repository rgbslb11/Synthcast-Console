// Canonical source record for the staging Supabase Edge Function deployed from
// feature/v1.2.0-cloud-sessions. Production v1.1.1 does not reference this file.
//
// Runtime deployment: gamecast-v12 version 2
// Staging project ref: percrnamjzetzjjuxuuw
//
// The deployed function owns:
// - POST /sessions: create an isolated cloud session and operator token.
// - GET /sessions/:slug: return a deterministic server-time projection from the
//   last authoritative checkpoint without mutating the stored state/version.
// - PUT /sessions/:slug: authenticated optimistic-lock checkpoint + event record.
//
// The simulation projection deliberately mirrors the deterministic v1.1.1
// tickGame/tickAutoSecond/clock-decision logic. This source marker exists so
// deployment provenance remains visible in GitHub while the full runtime source
// is retained by the Supabase Edge Function version history.
export const GAMECAST_V12_EDGE_FUNCTION_VERSION = 2;
export const GAMECAST_V12_ENGINE_MODE = "SERVER_PROJECTED_DETERMINISTIC";
export const GAMECAST_V12_MAX_CATCHUP_SECONDS = 21600;
