import { bindReporting } from './reporting.mjs';
const boardUrl = 'https://xsvdmcipviejxynkdbhq.supabase.co/functions/v1/gamecast-week13-v5-0-8-public';
const session = 'w13v508-6ecefa636ecf706e';
const filters = {
  UNLAUNCHED: 'scheduled', ACTIVE: 'live', DELAY: 'live', EDIT: 'live',
  FINAL_PENDING: 'pending', LOCKED: 'pending', FINAL: 'pending', READY: 'final',
};
const clock = (seconds) => Number.isInteger(seconds) && seconds >= 0
  ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  : '—';
const eastern = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});
const easternSeconds = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit',
  timeZoneName: 'short',
});
const formatTime = (format, stamp) => Number.isFinite(Date.parse(stamp))
  ? format.format(new Date(stamp))
  : 'BLOCKED';
const pick = (id) => document.getElementById(id);
const list = pick('games');
const template = pick('game-template');
const cards = new Map();
let board;
let timer;
let reading = false;
let failures = 0;

function statusOf(game) {
  if (game.qaOnly && game.lifecycle === 'READY') return { key: 'pending', label: 'QA only' };
  if (game.lifecycle === 'ACTIVE') {
    const labels = { BREAK: 'Break', HALFTIME: 'Halftime', PAUSED: 'Paused', 'ON AIR': 'On air' };
    return { key: 'live', label: labels[game.activity] ?? 'In progress' };
  }
  const labels = {
    UNLAUNCHED: 'Scheduled', DELAY: 'Delayed', EDIT: 'Chairman edit',
    FINAL_PENDING: 'Awaiting acceptance', LOCKED: 'Locked · awaiting acceptance',
    FINAL: 'Awaiting acceptance', READY: 'Final',
  };
  return { key: filters[game.lifecycle], label: labels[game.lifecycle] };
}

function scoreOf(game) {
  return Object.values(game.scores).reduce(([away, home], line) => [
    away + line[0], home + line[1],
  ], [0, 0]);
}

function verify(data) {
  const games = data?.state;
  if (data?.public_slug !== session || data.week_key !== '2026-W13' ||
      data.engine_version !== 'GC-W13-V5.0.8-RC1' || data.operator !== false ||
      !Number.isSafeInteger(data.state_version) || !Number.isFinite(Date.parse(data.master_zulu)) ||
      !Array.isArray(games) || games.length !== 59 ||
      new Set(games.map((game) => game?.id)).size !== 59 ||
      games.some((game) => !/^G06\d{2}$/.test(game?.id) || Number(game.id.slice(1)) < 618 ||
        Number(game.id.slice(1)) > 676 || !Object.hasOwn(filters, game.lifecycle) ||
        typeof game.away?.name !== 'string' || typeof game.home?.name !== 'string' ||
        !game.scores || !Object.values(game.scores).every((line) =>
          Array.isArray(line) && line.length === 2 && line.every((points) =>
            Number.isSafeInteger(points) && points >= 0)))) {
    throw new Error('Unrecognized Week 13 snapshot');
  }
  if (board && data.state_version < board.state_version) throw new Error('Older board revision');
  return data;
}

function renderGame(card, game, status) {
  const set = (name, value) => { card.querySelector(`[data-${name}]`).textContent = value; };
  card.dataset.state = status.key;
  set('away', game.away.name);
  set('home', game.home.name);
  set('id', game.id);
  set('kickoff', formatTime(eastern, game.kickoffZulu));
  set('network', game.network || 'BLOCKED');
  set('score', status.key === 'scheduled' ? '—' : scoreOf(game).join(' – '));
  set('badge', status.label);
  set('clock', status.key === 'live' ? `${game.period || '—'} · ${clock(game.scoreboardSeconds)}` : '');
  card.querySelector('[data-stats]').hidden = status.key === 'scheduled';
  const note = {
    scheduled: 'Stats appear after launch.',
    live: 'Latest committed game state.',
    pending: 'Result awaiting Chairman acceptance.',
    final: `Game ended ${formatTime(eastern, game.completedAt)}.`,
  };
  set('note', game.qaOnly ? 'QA result.' : note[status.key]);
  set('snaps', game.teamPlayCount?.map((value) => Number.isInteger(value) && value >= 0 ? value : '—').join(' / ') ?? 'BLOCKED');
  set('possession', game.teamTopSeconds?.map(clock).join(' / ') ?? 'BLOCKED');
  set('coverage', status.key === 'scheduled' ? '' : 'Stats are listed away / home.');
  bindReporting(card, game, status.key === 'final');
}

function render() {
  if (!board) return;
  const search = pick('search').value.trim().toLowerCase();
  const filter = pick('status').value;
  let count = 0;

  for (const game of board.state) {
    const status = statusOf(game);
    let card = cards.get(game.id);
    if (!card) {
      card = template.content.firstElementChild.cloneNode(true);
      cards.set(game.id, card);
      list.append(card);
    }
    card.hidden = (filter !== 'all' && filter !== status.key) ||
      !`${game.id} ${game.away.name} ${game.home.name}`.toLowerCase().includes(search);
    if (!card.hidden) count++;
    renderGame(card, game, status);
  }
  pick('result-count').textContent = `${count} of ${board.state.length} games`;
  pick('empty').hidden = count !== 0;
}

function schedule() {
  clearTimeout(timer);
  if (document.hidden) return;
  const states = board?.state.map((game) => statusOf(game).key) ?? [];
  if (!failures && states.length && states.every((state) => state === 'final')) return;
  const interval = states.includes('live') || states.includes('pending') ? 10_000 : 30_000;
  const backoff = failures ? Math.min(120_000, interval * 2 ** Math.min(failures, 4)) : interval;
  timer = setTimeout(refresh, backoff);
}

async function refresh() {
  if (reading || document.hidden) return;
  clearTimeout(timer);
  reading = true;
  pick('refresh').disabled = true;
  try {
    const url = new URL(boardUrl);
    url.search = new URLSearchParams({ api: 'read', session });
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = verify(await response.json());
    const changed = board?.state_version !== data.state_version;
    board = data;
    failures = 0;
    if (changed) render();
    pick('connection').textContent = board.state.every((game) => statusOf(game).key === 'final')
      ? 'All results accepted' : 'Connected to GameCast';
    pick('snapshot').textContent = `Snapshot read ${formatTime(easternSeconds, board.master_zulu)} · Rev ${board.state_version}`;
  } catch {
    failures++;
    pick('connection').textContent = board ? 'Connection interrupted. Showing last snapshot.' : 'BLOCKED · GameCast snapshot unavailable.';
  } finally {
    pick('connection').parentElement.dataset.stale = failures ? 'true' : 'false';
    reading = false;
    pick('refresh').disabled = false;
    schedule();
  }
}

pick('refresh').addEventListener('click', refresh);
pick('search').addEventListener('input', render);
pick('status').addEventListener('change', render);
document.addEventListener('visibilitychange', () => document.hidden ? clearTimeout(timer) : refresh());
refresh();
