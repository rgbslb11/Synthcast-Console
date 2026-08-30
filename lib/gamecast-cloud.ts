export const GAMECAST_CLOUD_API = "https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-v12";

export type CloudSession<T> = {
  public_slug: string;
  week_key: string;
  engine_version: string;
  data_version: string;
  lifecycle: string;
  state: T;
  state_version: number;
  last_advanced_at: string;
  updated_at: string;
  server_now: string;
  projected_through?: string;
  projected_seconds?: number;
  catchup_capped?: boolean;
};

export type CreatedCloudSession = {
  public_slug: string;
  state_version: number;
  last_advanced_at: string;
  created_at: string;
  operator_token: string;
  operator_url_hint: string;
  public_url_hint: string;
};

export class CloudConflictError extends Error {
  currentVersion?: number;
  constructor(message: string, currentVersion?: number) {
    super(message);
    this.name = "CloudConflictError";
    this.currentVersion = currentVersion;
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${GAMECAST_CLOUD_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 409) throw new CloudConflictError(body?.error ?? "version conflict", body?.current_version);
    throw new Error(body?.error ?? `Cloud request failed (${response.status})`);
  }
  return body as T;
};

export const createCloudSession = <T>(state: T, metadata?: { week_key?: string; engine_version?: string; data_version?: string }) =>
  request<CreatedCloudSession>("/sessions", {
    method: "POST",
    body: JSON.stringify({ state, ...metadata }),
  });

export const readCloudSession = <T>(slug: string) =>
  request<CloudSession<T>>(`/sessions/${encodeURIComponent(slug)}`);

export const checkpointCloudSession = <T>(slug: string, operatorToken: string, expectedVersion: number, state: T, eventType = "CHECKPOINT", gameId?: string) =>
  request<CloudSession<T>>(`/sessions/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: { "x-operator-token": operatorToken },
    body: JSON.stringify({ state, expected_version: expectedVersion, event_type: eventType, game_id: gameId ?? null }),
  });

export const cloudCatchupSeconds = (lastAdvancedAt: string, serverNow: string, maxSeconds = 21600) => {
  const elapsed = Math.floor((Date.parse(serverNow) - Date.parse(lastAdvancedAt)) / 1000);
  return Math.max(0, Math.min(maxSeconds, Number.isFinite(elapsed) ? elapsed : 0));
};

export const sessionFromLocation = () => {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("session");
};

export const isPublicView = () => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("view") === "public";
};

export const operatorTokenFromLocation = () => {
  if (typeof window === "undefined") return "";
  return window.location.hash.startsWith("#operator=") ? window.location.hash.slice("#operator=".length) : "";
};

export const operatorTokenKey = (slug: string) => `gamecast-v12-operator:${slug}`;
