import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// No deployment entrypoints, SQL, network calls or production writes.
const source='release-assets/v5.0.6-week11/backend';
const target='release-assets/v5.0.7-week12';
const slate=JSON.parse(fs.readFileSync(target+'/qa-week12-slate.json'));
const manifest=JSON.parse(fs.readFileSync(target+'/input-manifest.json'));
assert.equal(createHash('sha256').update(fs.readFileSync(target+'/qa-week12-slate.json')).digest('hex'),manifest.slateSha256);
const canonical=JSON.parse(fs.readFileSync(target+'/canonical-week12-identity-map.json'));
assert.equal(canonical.length,60);
for(const g of slate){const identity=canonical.find(r=>r.away===g.awayCode&&r.home===g.homeCode);assert.ok(identity,g.matchup);assert.equal(identity.game_id,g.id);assert.equal(identity.site,g.venueDesignation);}
const csv=fs.readFileSync(target+'/ratings.csv','utf8');
assert.equal(createHash('sha256').update(csv).digest('hex'),manifest.ratingSha256);
const [header,...lines]=csv.trimEnd().split(/\r?\n/).map(line=>line.split(','));
const ratings=lines.map(values=>Object.fromEntries(header.map((key,i)=>[key,values[i]])));
assert.equal(ratings.length,122);assert.equal(slate.length,60);
assert.equal(new Set(ratings.map(r=>r.team_id)).size,122);
const replacements=[['week11.mjs','week12.mjs'],['GC-W11-V5.0.6-RC1','GC-W12-V5.0.7-QA1'],['2026-W11','2026-W12'],['w11v506-','qa-w12v507-'],['V506','V507'],['gamecast_v506_w11','gamecast_v507_qa_w12'],['gamecast-week11-v5-0-6','gamecast-week12-v5-0-7-qa'],['W11_OPERATOR','W12_QA_ONLY'],['/v5.0.6/w11/','/v5.0.7/w12/']];
const rebind=text=>replacements.reduce((s,[a,b])=>s.replaceAll(a,b),text);
for(const dir of ['runtime','src','security']){
 fs.mkdirSync(`${target}/backend/${dir}`,{recursive:true});
 for(const entry of fs.readdirSync(`${source}/${dir}`)){
  if(!entry.endsWith('.mjs')||['week11.mjs','power.mjs'].includes(entry))continue;
  let text=rebind(fs.readFileSync(`${source}/${dir}/${entry}`,'utf8'));
  // Board cardinality changes only in this isolated Week 12 copy.
  if(dir!=='runtime')text=text.replace(/\b56\b/g,'60');
  if(entry==='security-core.mjs')text=text.replace(/export const ACTIVE_GAME_IDS=Object.freeze\([^\n]+\);/,'export const ACTIVE_GAME_IDS=Object.freeze('+JSON.stringify(slate.map(g=>g.id))+');');
  if(entry==='release-runtime.mjs')text=text.replace('qaOnly:false','qaOnly:true');
  if(entry==='edge-boundaries.mjs')text=text.replace('activation_inputs_ready:true','activation_inputs_ready:false').replace('canonical_games:60','canonical_games:60,qa_games:60');
  if(entry==='engine.mjs'){
   text=text.replace(/const DATA_VERSION = "[^"]+";/,`const DATA_VERSION = "W12-CANONICAL60+CHAIRMAN_RATINGS122+CSV_${manifest.ratingSha256.slice(0,16)}+V507_PUNT_TOUCHBACK_QA";`);
   const before='else if (p.punt) { const land = clamp(1, old + p.yards, 99); flip(g, 100 - land); }';
   const after=`else if (p.punt) {
    // Resolve the uncapped endpoint before applying ordinary field limits.
    const endpoint = old + p.yards;
    if (endpoint >= 100) {
      p.ruling = "PUNT_TOUCHBACK"; p.originalDescription = p.desc;
      p.desc = "PUNT TOUCHBACK · " + p.desc;
      flip(g, 20);
    } else { const land = clamp(1, endpoint, 99); flip(g, 100 - land); }
  }`;
   assert.equal(text.split(before).length,2,'exact baseline punt witness required');
   text=text.replace(before,after);
   // This candidate is always QA. Same safety, probability, timing and RNG code.
   text=text.replace('strategyMode: "NORMAL", lastPlay: "Ready for launch",','qaOnly: true, strategyMode: "NORMAL", lastPlay: "Ready for launch",');
  }
  fs.writeFileSync(`${target}/backend/${dir}/${entry}`,text);
 }
}
fs.writeFileSync(target+'/backend/runtime/week12.mjs','// Verified canonical identities and latest Chairman carriage; QA-only execution.\nexport const OPERATING_SLATE = '+JSON.stringify(slate,null,2)+';\n');
const powers=Object.fromEntries(ratings.map(r=>[r.team,{overall:Number(r.gamecast_team),offense:Number(r.gamecast_offense),defense:Number(r.gamecast_defense),specialTeams:null,tempo:null,sourceVersion:'W12-CHAIRMAN-APPROVED-2026-11-09',flag:null,opponentBasis:null}]));
for(const g of slate)for(const name of [g.away,g.home])assert.ok(powers[name],name);
fs.writeFileSync(target+'/backend/runtime/power.mjs','export const POWER_SOURCE_VERSION="W12-CHAIRMAN-APPROVED-2026-11-09";\nexport const SCHEDULED_TEAM_COUNT=120;\nexport const TEAM_POWER = '+JSON.stringify(powers,null,2)+';\n');
console.log('Built QA-only v5.0.7: 60 games; 120 participants; preserved safety adjudication.');
// Retained interfaces with release/board bindings only. Same-origin QA API;
// no Supabase endpoint, publishable key, deployment step or production fallback.
const uiSource='public/v5.0.6/w11',uiTarget='public/v5.0.7/w12';
fs.mkdirSync(uiTarget,{recursive:true});
for(const entry of fs.readdirSync(uiSource,{recursive:true})){
 const from=path.join(uiSource,entry);if(!fs.statSync(from).isFile())continue;
 const to=path.join(uiTarget,entry);fs.mkdirSync(path.dirname(to),{recursive:true});
 let text=rebind(fs.readFileSync(from,'utf8')).replaceAll('5.0.6','5.0.7').replaceAll('synthcastGameCast506','synthcastGameCast507').replaceAll('WEEK 11','WEEK 12').replaceAll('Week 11','Week 12').replace(/\bW11\b/g,'W12').replace(/\b56\b/g,'60').replace('SATURDAY · 41 GAMES','SATURDAY · 49 GAMES').replace('121 final Chairman','122 final Chairman');
 if(entry==='release-config.js')text="globalThis.GAMECAST_V507_CONFIG=Object.freeze({projectUrl:location.origin,publishableKey:'qa-only',publicApi:location.origin+'/qa/v507/public',chairmanApi:location.origin+'/qa/v507/chairman'});\n";
 if(entry==='index.html')text=text.replace('WEEK 12 · 60 GAMES · SEUD IMPORT ON HOLD','WEEK 12 · 60 GAMES · QA ONLY · DEPLOYMENT HELD');
 fs.writeFileSync(to,text);
}
