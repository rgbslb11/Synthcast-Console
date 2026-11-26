import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { OPERATING_SLATE } from '../release-assets/week14/backend/runtime/week14.mjs';

const base = 'https://rgbslb11.github.io/Synthcast-Console/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const inventory = prefix => walk(prefix).map(file => ({ path: file.slice(7), sha256: hash(fs.readFileSync(file)) }));
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const old = [
  ...json('release-assets/v5.0.8-week13/pages-baseline.json').files,
  ...inventory('public/v5.0.8/w13'),
  ...json('release-assets/week14/pages-stats-baseline.json'),
];
const week14 = inventory('public/week14');
const previousPublisher = 'd82ca6dc26377fdff7717e75cb005ea7b8ad6ace';
const previousWeek14 = execFileSync('git', ['ls-tree', '-r', '--name-only', previousPublisher, 'public/week14'], { encoding: 'utf8' })
  .trim().split('\n').map(file => ({
    path: file.slice(7),
    sha256: hash(execFileSync('git', ['show', `${previousPublisher}:${file}`])),
  }));
assert.equal(old.length, 296);
assert.equal(previousWeek14.length, 15);
assert.equal(week14.length, 16);
assert.equal(new Set([...old, ...week14].map(item => item.path)).size, 312);
const { publicSlug, engine, week } = json('release-assets/week14/operating-session.json');
const api = 'https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-week14-ot-';
const request = { headers: { Origin: new URL(base).origin }, signal: AbortSignal.timeout(25000) };
const response = await fetch(api + 'public?api=read&session=' + publicSlug, request);
assert.equal(response.status, 200);
const board = await response.json();
assert.equal(board.public_slug, publicSlug);
assert.equal(board.engine_version, engine);
assert.equal(board.week_key, week);
assert.equal(board.state.length, 59);
for (let i = 0; i < 59; i++) {
  const game = board.state[i], expected = OPERATING_SLATE[i];
  for (const key of ['id', 'kickoffZulu', 'kickoffOrder', 'network', 'kickoffForecast']) assert.deepEqual(game[key], expected[key]);
  assert.equal(game.away.name, expected.away);
  assert.equal(game.home.name, expected.home);
  assert.equal(game.powerReady, true);
  for (const key of ['rngState', 'seedHex', 'history']) assert.ok(!Object.hasOwn(game, key));
}
const chairman = await fetch(api + 'chairman?api=read&session=' + publicSlug, { ...request, method: 'POST', body: '{}' });
assert.equal(chairman.status, 401);
const mode = process.argv[2];
assert.ok(['prepare', 'verify'].includes(mode));
const items = mode === 'verify' ? [...old, ...week14] : [...old, ...previousWeek14];
for (let i = 0; i < items.length; i += 8) await Promise.all(items.slice(i, i + 8).map(async item => {
  assert.ok(!item.path.startsWith('/') && !item.path.split('/').includes('..'));
  const result = await fetch(new URL(item.path, base), { cache: 'no-store', signal: AbortSignal.timeout(25000) });
  assert.equal(result.status, 200, item.path);
  const bytes = Buffer.from(await result.arrayBuffer());
  assert.equal(hash(bytes), item.sha256, item.path);
  if (mode === 'prepare' && !item.path.startsWith('week14/')) {
    const destination = path.join('out-w14', item.path);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
  }
}));
if (mode === 'prepare') fs.cpSync('public/week14', 'out-w14/week14', { recursive: true });
console.log(JSON.stringify({ mode, priorAssets: old.length, week14Assets: week14.length, verifiedGames: 59 }));
