import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createReleaseRuntime } from '../../release-assets/v5.0.8.5-week13/backend/src/release-runtime.mjs';
import { schedulerSignature } from '../../release-assets/v5.0.8.5-week13/backend/security/security-core.mjs';

const dist = process.env.PGLITE_DIST;
assert.ok(dist, 'Set PGLITE_DIST to the local @electric-sql/pglite dist directory');
const { PGlite } = await import(pathToFileURL(join(dist, 'index.js')));
const { pgcrypto } = await import(pathToFileURL(join(dist, 'contrib/pgcrypto.js')));
const db = await PGlite.create({ extensions: { pgcrypto } });
const actor = '05080508-0508-4508-8508-050805080508';
const origin = 'http://localhost:5085';
const schedulerSecret = 'in-memory-preview-only';
let clockMs = Date.now();

try {
  // Supply local fixtures for the shared Chairman roster and Supabase platform services.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema gamecast_v506_w11;
    create table gamecast_v506_w11.operators(user_id uuid primary key);
    insert into gamecast_v506_w11.operators values ('${actor}');
    create function gamecast_v506_w11.authorize_operator(p_user_id uuid) returns boolean
      language sql security definer as $$select exists(select 1 from gamecast_v506_w11.operators where user_id=p_user_id)$$;
    grant usage on schema gamecast_v506_w11 to service_role;
    grant execute on function gamecast_v506_w11.authorize_operator(uuid) to service_role;
    create schema extensions;
    create extension pgcrypto with schema extensions;
    create schema vault;
    create table vault.decrypted_secrets(id uuid default gen_random_uuid(),decrypted_secret text,name text,created_at timestamptz default now());
    create function vault.create_secret(secret text,name text,description text) returns uuid
      language sql as $$insert into vault.decrypted_secrets(decrypted_secret,name) values(secret,name) returning id$$;
    create schema net;
    create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint
      language sql as $$select 1::bigint$$;
    create schema cron;
    create table cron.job(jobid bigint generated always as identity,jobname text,active boolean);
    create function cron.schedule(job_name text,schedule text,command text) returns bigint
      language sql as $$insert into cron.job(jobname,active) values(job_name,true) returning jobid$$;
    create function cron.alter_job(job_id bigint,active boolean) returns void
      language sql as $$update cron.job set active=$2 where jobid=$1$$;
  `);
  await db.exec(readFileSync('release-assets/v5.0.8-week13/week13-schema.sql', 'utf8'));
  const originalPreview = await db.query('select * from gamecast_v508_w13.release_control');
  await db.exec(readFileSync('release-assets/v5.0.8.5-week13/week13-schema.sql', 'utf8'));
  assert.deepEqual((await db.query('select jobname, active from cron.job order by jobname')).rows, [
    { jobname: 'gamecast_v5085_week13', active: false },
    { jobname: 'gamecast_v508_week13', active: false },
  ]);
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.transaction(async tx => {
      await tx.exec('set local role ' + role);
      await tx.query("select public.gc5085_w13_rpc('scheduler_sessions')");
    }), /permission denied/);
  }
  const rpc = (name, args) => db.transaction(async tx => {
    await tx.exec('set local role service_role');
    return (await tx.query('select public.gc5085_w13_rpc($1,$2::jsonb) as result',
      [name, JSON.stringify(args)])).rows[0].result;
  });
  const runtime = createReleaseRuntime({
    clock: () => new Date(clockMs).toISOString(), allowedOrigins: [origin], schedulerSecret,
    transport: { rpc, authenticate: async () => ({ id: actor }),
      authorize: async () => ({ userId: actor, role: 'CHAIRMAN', active: true }) },
  });
  const headers = { origin, authorization: 'Bearer preview-fixture', 'content-type': 'application/json' };
  const chairman = (action, slug = '', key = 'preview-create-5085') => runtime.chairmanHandler(
    new Request(origin + '/?api=' + action + '&session=' + slug, {
      method: 'POST', headers: { ...headers, 'idempotency-key': key }, body: '{}',
    }),
  );
  assert.equal((await chairman('create')).status, 500); // SQL preview adapter surfaces the write guard as an exception.
  await db.exec('update gamecast_v5085_w13.release_control set writes_enabled=true where singleton');
  const create = await chairman('create');
  assert.equal(create.status, 201, await create.clone().text());
  const { public_slug: slug, engine_version: engineVersion } = await create.json();
  assert.match(slug, /^w13v5085-[a-f0-9]{16}$/);
  assert.equal(engineVersion, 'GC-W13-V5.0.8.5-RC1');
  assert.equal((await chairman('create')).status, 200);
  assert.deepEqual(await rpc('read_session', { p_slug: 'w13v508-' + '0'.repeat(16) }), []);
  const read = async () => (await rpc('read_session', { p_slug: slug }))[0];
  const row = await read();
  const game = row.state.find(item => item.id === 'G0635');
  assert.equal(row.state.length, 59);
  Object.assign(game, {
    lifecycle: 'ACTIVE', activity: 'LIVE', auto: true,
    quarter: 4, activePeriod: '4', period: '4th', scoreboardSeconds: 10,
    scores: { ...runtime.engine.blankScores(), 4: [31, 30] }, possession: 1, fieldPos: 70,
    down: 1, distance: 10, homeTimeouts: 1, awayTimeouts: 0, rngState: [3444563770, 1, 1, 1],
    pendingPlay: { phase: 'POST', team: 1, deadSec: 35, runoffSec: 0, remaining: 25 },
  });
  await db.query('update gamecast_v5085_w13.sessions set state=$1::jsonb where public_slug=$2',
    [JSON.stringify(row.state), slug]);
  clockMs = Date.parse((await read()).last_advanced_at);

  const advance = (version, step) => {
    const body = { session: slug, expected_version: version };
    const nonce = 'endgame-preview-5085-' + step;
    const timestamp = Date.now();
    const signature = schedulerSignature(schedulerSecret, { timestamp, nonce, body });
    return runtime.schedulerHandler(new Request(origin + '/scheduler', {
      method: 'POST', body: JSON.stringify(body),
      headers: { 'x-gamecast-timestamp': String(timestamp), 'x-gamecast-nonce': nonce, 'x-gamecast-signature': signature },
    }));
  };
  clockMs += 1_000;
  const first = await advance(1, 1);
  assert.equal(first.status, 201, await first.clone().text());
  const stored = (await read()).state.find(item => item.id === 'G0635');
  assert.equal(stored.endgameOffensiveTimeoutTeam, 1);
  assert.equal(stored.scoreboardSeconds, 10);
  const publicRead = () => runtime.publicHandler(new Request(origin + '/?api=read&session=' + slug, { headers: { origin } }));
  for (const response of [await publicRead(), await chairman('read', slug)]) {
    assert.equal(response.status, 200, await response.clone().text());
    const payload = await response.json();
    assert.equal(Object.hasOwn(payload.state.find(item => item.id === 'G0635'), 'endgameOffensiveTimeoutTeam'), false);
  }
  assert.equal((await read()).state_version, 2);

  clockMs += 29_000;
  const second = await advance(2, 2);
  assert.equal(second.status, 201, await second.clone().text());
  const retry = await advance(2, 2);
  assert.equal(retry.status, 200, await retry.clone().text());
  assert.equal((await retry.json()).replayed, true);
  const updated = await read();
  assert.equal(updated.state_version, 3);
  const after = updated.state.find(item => item.id === 'G0635');
  assert.equal(after.scoreboardSeconds, 5);
  assert.equal(after.homeTimeouts, 1);
  assert.match(after.lastPlay, /47-yard field goal/);
  const records = await db.query("select payload from gamecast_v5085_w13.events where game_id='G0635' and payload ? 'desc'");
  assert.equal(records.rows.length, 1);
  assert.match(records.rows[0].payload.desc, /^47-yard field goal/);
  const finalPublic = await (await publicRead()).json();
  assert.equal(finalPublic.state.find(item => item.id === 'G0635').lastPlay, after.lastPlay);
  assert.deepEqual((await db.query('select * from gamecast_v508_w13.release_control')).rows, originalPreview.rows);
  await db.exec(readFileSync('release-assets/v5.0.8.5-week13/rollback.sql', 'utf8'));
  assert.equal((await db.query('select writes_enabled from gamecast_v5085_w13.release_control')).rows[0].writes_enabled, false);
  assert.equal((await read()).state_version, 3);
  console.log('PASS isolated PostgreSQL preview: authorization, release isolation, timeout persistence, signed scheduler, exact retry, Chairman/public reads, rollback.');
} finally {
  await db.close();
}
