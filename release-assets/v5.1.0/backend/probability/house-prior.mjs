import { captureGame } from './capture.mjs';
import { validatePrior } from './observer.mjs';

export function bindHousePrior(entry, game, checkpoint) {
 if(game.lifecycle!=='UNLAUNCHED')throw Error('PREGAME_FROZEN');
 if(entry.gameId!==game.id||entry.awayTeamId!==game.awayCode||entry.homeTeamId!==game.homeCode||entry.kickoffZulu!==game.kickoffZulu)throw Error('PRIOR_MATCHUP_MISMATCH');
 const capture=captureGame(game,{...checkpoint,actionOrdinal:0,command:'pregame'});
 const {favoriteTeamId,otherTeamId,pregameMargin,pickEm,source}=entry;
 if(source?.kind!=='CHAIRMAN_APPROVED_HOUSE')throw Error('PRIOR_SOURCE_REQUIRED');
 return validatePrior({favoriteTeamId,otherTeamId,pregameMargin,pickEm,source:{...source,contextHash:capture.contextHash}},capture);
}
