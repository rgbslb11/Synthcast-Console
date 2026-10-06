'use strict';
// Display filtering only. Canonical input joins are separately validated.
function gc442TeamMatches(game,query){
  const q=String(query??'').trim().toLowerCase();
  if(!q)return true;
  return [game.away?.name,game.home?.name,game.awayCode,game.homeCode,
    game.away?.abbreviation,game.home?.abbreviation].some(value=>String(value??'').toLowerCase().includes(q));
}
function gc442NeedsAction(game){return game.lifecycle==='FINAL_PENDING'||game.lifecycle==='LOCKED';}
