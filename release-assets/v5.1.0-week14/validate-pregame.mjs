import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const expectedCounts = {
  '2026-11-26': 1,
  '2026-11-27': 14,
  '2026-11-28': 42,
};

function validRating(rating) {
  return ['overall', 'offense', 'defense'].every(key => (
    Number.isInteger(rating?.[key]) && rating[key] >= 0 && rating[key] <= 99
  ));
}

function validKickoff(game) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(game.kickoffET ?? '')) return false;
  const eastern = new Date(`${game.date}T${game.kickoffET}:00-05:00`);
  return Number.isFinite(+eastern) && +eastern === Date.parse(game.kickoffZulu);
}

export function validatePregame(manifest) {
  const errors = [];
  const games = manifest.games ?? [];
  const ratings = manifest.teamRatings ?? {};
  const ids = new Set();
  const teams = new Set();
  const counts = Object.fromEntries(Object.keys(expectedCounts).map(date => [date, 0]));

  if (manifest.week !== '2026-W14' || manifest.kickoffTimeZone !== 'America/New_York') {
    errors.push('Expected the 2026 Week 14 Eastern Time slate');
  }
  for (const game of games) {
    const { id, date, away, awayCode, home, homeCode } = game;
    if (!/^G\d{4}$/.test(id ?? '') || ids.has(id)) errors.push(`Invalid or duplicate game ID: ${id}`);
    ids.add(id);

    if (Object.hasOwn(counts, date)) counts[date]++;
    else errors.push(`${id}: outside Thursday–Saturday slate`);
    if (!validKickoff(game)) errors.push(`${id}: missing or inconsistent ET/Zulu kickoff`);
    if (!game.network?.trim() || game.network === 'TBD') errors.push(`${id}: carriage missing`);
    if (!game.venueName?.trim() || typeof game.neutral !== 'boolean' || typeof game.conferenceGame !== 'boolean') {
      errors.push(`${id}: incomplete venue or game classification`);
    }
    for (const [code, name] of [[awayCode, away], [homeCode, home]]) {
      if (!code || teams.has(code)) errors.push(`${id}: missing or repeated team code ${code}`);
      teams.add(code);
      if (!Object.hasOwn(ratings, name) || !validRating(ratings[name])) {
        errors.push(`${id}: missing or invalid TEAM/OFF/DEF rating for ${name}`);
      }
    }
  }
  for (const [date, expected] of Object.entries(expectedCounts)) {
    if (counts[date] !== expected) errors.push(`${date}: expected ${expected}, found ${counts[date]}`);
  }
  if (games.length !== 57 || ids.size !== 57 || teams.size !== 114) {
    errors.push('Expected 57 unique games and 114 unique participants');
  }
  if (Object.keys(ratings).length !== 121 || !Object.values(ratings).every(validRating)) {
    errors.push('Expected 121 valid team rating rows');
  }
  for (const conflict of manifest.unresolved ?? []) {
    errors.push(`${conflict.id}: unresolved ${conflict.field}`);
  }

  return { counts, gameCount: ids.size, participantCount: teams.size, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error('Usage: node validate-pregame.mjs <manifest.json>');
  const result = validatePregame(JSON.parse(await readFile(inputPath, 'utf8')));
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exitCode = Number(result.errors.length > 0);
}
