export const NORMAL_GAME_TIMING = 'NORMAL GAME TIMING';
export const POSTSEASON_GAME_TIMING = 'POST-SEASON GAME TIMING';
export const POSTSEASON_TEAM_TIMEOUT_SECONDS = 90;
export const POSTSEASON_HALFTIME_SECONDS = 1650;
export const POSTSEASON_COMMERCIAL_SECONDS = 180;

const postseasonTypes = new Set(['CONFERENCE_CHAMPIONSHIP', 'BOWL', 'PLAYOFF']);
const commercialWindows = [
  [0.90, 0.70, 0.50, 0.30],
  [0.90, 0.70, 0.45],
  [0.90, 0.70, 0.50, 0.30],
  [0.90, 0.72, 0.55, 0.37],
];
const eligibleStoppages = new Set(['CHANGE_OF_POSSESSION', 'TEAM_TIMEOUT', 'REPLAY', 'OFFICIAL_REVIEW', 'INJURY']);

export function timingProfileFor(gameType) {
  return postseasonTypes.has(gameType) ? POSTSEASON_GAME_TIMING : NORMAL_GAME_TIMING;
}

export function usesPostseasonTiming(game) {
  return game.timingProfile === POSTSEASON_GAME_TIMING;
}

export function nextPostseasonBreak(game, reason) {
  if (game.overtime || game.scoreboardSeconds <= 0 || game.breakSeconds > 0) return;
  const { quarter, scoreboardSeconds, quarterLengthSeconds, tvBreaksTaken } = game;
  const key = label => `Q${quarter}-${label}`;
  if (reason === 'TWO_MINUTE_TIMEOUT') {
    const slot = key('TWO-MINUTE');
    if (hasTwoMinuteTimeout(game) && scoreboardSeconds <= 120) return slot;
    return;
  }
  if (!eligibleStoppages.has(reason)) return;
  const windows = commercialWindows[quarter - 1] ?? [];
  return windows.map((fraction, index) => ({
    slot: key(`TV-${index + 1}`),
    opensAt: Math.round(quarterLengthSeconds * fraction),
  })).find(({ slot, opensAt }) => scoreboardSeconds <= opensAt && !tvBreaksTaken.includes(slot))?.slot;
}

export function hasTwoMinuteTimeout(game) {
  return (game.quarter === 2 || game.quarter === 4) &&
    !game.tvBreaksTaken.includes(`Q${game.quarter}-TWO-MINUTE`);
}
