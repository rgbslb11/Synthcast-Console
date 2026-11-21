import { derive } from './report.mjs';
const origin = 'https://rgbslb11.github.io';
const project = Deno.env.get('SUPABASE_URL');
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const publishable = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  || JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}').default
  || Deno.env.get('SUPABASE_ANON_KEY');

Deno.serve(async (request) => {
  const allowed = request.headers.get('origin') === origin;
  const headers = {
    'cache-control': 'no-store',
    'vary': 'origin',
    'content-type': 'application/json',
    ...(allowed ? { 'access-control-allow-origin': origin } : {}),
  };
  const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
  if (!allowed) return reply({ error: 'ORIGIN_DENIED' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, {
    status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'authorization' },
  });
  if (request.method !== 'GET') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ') || authorization.length > 8192) return reply({ error: 'AUTHENTICATION_REQUIRED' }, 401);
  const id = new URL(request.url).searchParams.get('game');
  if (id !== null && !/^G0(?:61[89]|6[2-6]\d|67[0-6])$/.test(id)) return reply({ error: 'INVALID_GAME' }, 400);
  try {
    if (!project || !service || !publishable) return reply({ error: 'REPORT_UNAVAILABLE' }, 503);
    const user = await fetch(project + '/auth/v1/user', {
      headers: { authorization, apikey: publishable }, signal: AbortSignal.timeout(5000), redirect: 'error',
    });
    if (!user.ok) return reply({ error: 'AUTHENTICATION_REQUIRED' }, 401);
    const actor = await user.json();
    if (actor.is_anonymous || !/^[a-f0-9-]{36}$/i.test(actor.id ?? '')) return reply({ error: 'AUTHENTICATION_REQUIRED' }, 401);
    const result = await fetch(project + '/rest/v1/rpc/gc508_w13_stat_report', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + service, apikey: service, 'content-type': 'application/json' },
      body: JSON.stringify({ p_actor: actor.id, p_game: id }),
      signal: AbortSignal.timeout(7000), redirect: 'error',
    });
    if (!result.ok) return reply({ error: 'REPORT_UNAVAILABLE' }, 503);
    const packet = await result.json();
    if (!packet) return reply({ error: 'CHAIRMAN_ACCESS_REQUIRED' }, 403);
    return reply(id === null ? packet : derive(packet));
  } catch {
    return reply({ error: 'REPORT_UNAVAILABLE' }, 503);
  }
});
