const project = 'https://xsvdmcipviejxynkdbhq.supabase.co';
const publishable = 'sb_publishable_5jxF1vOOyWdUvvk3-poZqQ_83gaaUdf';
const endpoint = project + '/functions/v1/gamecast-week13-stat-report';
const form = document.getElementById('report-auth');
const status = document.getElementById('report-status');
const signOut = document.getElementById('report-sign-out');
const rows = new Map();
let token = null;
let corrected = new Set();

const metrics = {
  totalPoints: 'Points', pointsByQuarter: 'Points by quarter', pointsByOvertime: 'Overtime points',
  timeOfPossession: 'Time of possession', offensiveSnaps: 'Offensive snaps', rushingAttempts: 'Rushing attempts',
  rushingYards: 'Rushing yards', yardsPerRush: 'Yards per rush', rushingTouchdowns: 'Rushing touchdowns',
  passingAttempts: 'Passing attempts', completions: 'Completions', completionPercentage: 'Completion rate',
  passingYards: 'Passing yards', yardsPerCompletion: 'Yards per completion', interceptionsThrown: 'Interceptions thrown',
  totalOffense: 'Total offense', yardsPerOffensivePlay: 'Yards per offensive play', firstDowns: 'First downs',
  thirdDownAttempts: 'Third-down attempts', thirdDownConversionsPercentage: 'Third-down conversions',
  fourthDownAttempts: 'Fourth-down attempts', fourthDownConversionsPercentage: 'Fourth-down conversions',
  fumblesLost: 'Fumbles lost', turnovers: 'Turnovers', punts: 'Punts', netPuntYards: 'Recorded net punt yards',
  scoringSummary: 'Scoring events',
};

const failures = {
  CORRECTION_REQUIRES_REVIEW: 'A field, clock, run, or result correction requires manual review.',
  JOURNAL_MISMATCH: 'Recorded plays do not reconcile with the journal.',
  CORRECTION_UNVERIFIED: 'The manual score could not be matched to the correction audit.',
  ACCEPTED_SCORE_MISMATCH: 'Recorded scoring does not reconcile to the accepted score.',
  RESULT_AWAITING_ACCEPTANCE: 'The result is awaiting acceptance.',
};

function clearSession(message) {
  token = null;
  corrected.clear();
  form.hidden = false;
  signOut.hidden = true;
  status.textContent = message;
  for (const row of rows.values()) {
    row.button.hidden = true;
    row.output.replaceChildren();
  }
}

async function requestReport(bearer, game) {
  const url = new URL(endpoint);
  if (game) url.searchParams.set('game', game);
  const response = await fetch(url, {
    headers: { authorization: 'Bearer ' + bearer }, cache: 'no-store',
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  if (!response.ok) throw Object.assign(new Error('Reporting request failed'), { status: response.status });
  return response.json();
}

function updateButton(row) {
  row.button.hidden = !token || !row.accepted;
  row.button.textContent = corrected.has(row.game.id) ? 'Derive Stats' : 'View Stats';
}

function format(key, value) {
  if (value == null) return key === 'timeOfPossession' ? 'BLOCKED' : '—';
  if (key === 'timeOfPossession') return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
  if (key === 'scoringSummary') return Array.isArray(value) ? String(value.length) : 'BLOCKED';
  if (key === 'completionPercentage') return value.toFixed(1) + '%';
  if (key.endsWith('ConversionsPercentage')) return value.made + '/' + value.attempted;
  if (typeof value === 'object') return Object.values(value).join(' / ') || '—';
  return typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : String(value);
}

function showReport(row, result) {
  if (result.status !== 'AVAILABLE' || !Array.isArray(result.stats) || result.stats.length !== 2) {
    row.output.textContent = 'BLOCKED · ' + (failures[result.reason] ?? 'The source could not verify the statistics.');
    return;
  }
  const table = document.createElement('table');
  table.className = 'report-table';
  const caption = table.createCaption();
  const adjustments = result.stats.map(team => team.scoringSummary
    .filter(event => event.source === 'MANUAL').reduce((points, event) => points + event.points, 0));
  caption.textContent = result.corrected
    ? 'Derived box score · Chairman scoring adjustment: ' + adjustments.join(' / ') + ' points (away / home)'
    : 'Box score';
  const head = table.createTHead().insertRow();
  for (const value of ['Statistic', row.game.away.name, row.game.home.name]) {
    const cell = head.appendChild(document.createElement('th'));
    cell.scope = 'col';
    cell.textContent = value;
  }
  const body = table.createTBody();
  for (const [key, label] of Object.entries(metrics)) {
    const tr = body.insertRow();
    const cell = tr.appendChild(document.createElement('th'));
    cell.scope = 'row';
    cell.textContent = label;
    for (const team of result.stats) tr.insertCell().textContent = format(key, team[key]);
  }
  row.output.replaceChildren(table);
}

export function bindReporting(card, game, accepted) {
  const signature = JSON.stringify([game.runId, game.scores, accepted]);
  let row = rows.get(game.id);
  if (!row) {
    row = { game, accepted, signature, button: card.querySelector('[data-report-button]'),
      output: card.querySelector('[data-report-output]') };
    row.button.addEventListener('click', async () => {
      const bearer = token;
      const version = row.signature;
      if (!bearer || !row.accepted) return;
      row.button.disabled = true;
      row.output.textContent = 'Checking committed plays…';
      try {
        const result = await requestReport(bearer, row.game.id);
        if (token !== bearer || row.signature !== version) return;
        if (result.id !== row.game.id || result.run !== row.game.runId) {
          row.output.textContent = 'BLOCKED · The game snapshot changed. Refresh and try again.';
          return;
        }
        if (result.corrected) corrected.add(row.game.id);
        showReport(row, result);
        updateButton(row);
      } catch (error) {
        if (token !== bearer || row.signature !== version) return;
        if ([401, 403].includes(error.status)) clearSession('Sign in again with a GameCast Chairman account.');
        else row.output.textContent = 'BLOCKED · Reporting is unavailable. Try again.';
      } finally {
        row.button.disabled = false;
      }
    });
    rows.set(game.id, row);
  }
  if (row.signature !== signature) row.output.replaceChildren();
  Object.assign(row, { game, accepted, signature });
  updateButton(row);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('report-email');
  const password = document.getElementById('report-password');
  const submit = form.querySelector('button');
  submit.disabled = true;
  status.textContent = 'Signing in…';
  try {
    const response = await fetch(project + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: publishable, 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
      signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!response.ok) throw new Error('Authentication failed');
    const body = await response.json();
    if (typeof body.access_token !== 'string') throw new Error('Authentication failed');
    const access = await requestReport(body.access_token);
    if (!Array.isArray(access.corrected)) throw new Error('Reporting unavailable');
    token = body.access_token;
    corrected = new Set(access.corrected);
    form.hidden = true;
    signOut.hidden = false;
    status.textContent = 'Signed in. Open an accepted matchup to view or derive its stats.';
    for (const row of rows.values()) updateButton(row);
  } catch (error) {
    clearSession(error.status === 503 ? 'Reporting is unavailable. Try again.' : 'Could not sign in for Chairman reporting.');
  } finally {
    password.value = '';
    submit.disabled = false;
  }
});
signOut.addEventListener('click', () => clearSession('Signed out of Chairman reporting.'));
