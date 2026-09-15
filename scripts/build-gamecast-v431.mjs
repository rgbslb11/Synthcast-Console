// Preserve the prior 4.3.1 generator byte-for-byte; overlay only authorized Week 4 power and provenance.
import './build-gamecast-v431-base.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const fn='supabase/functions/gamecast-week4-v4-3-1';
const ui='public/v4.3.1';
const powerFile='release-assets/gamecast-v4.3.1/power.ts';
const power=fs.readFileSync(powerFile);
const blobSha=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
assert.equal(blobSha(power),'6eb58cdc1bce4f5a63b8c62e23f72a397c2f8f55','Approved GameCast-ready v1.1 power artifact changed');
fs.copyFileSync(powerFile,`${fn}/power.ts`);
function once(text,from,to){assert.equal(text.split(from).length,2,`Expected unique source fragment: ${from}`);return text.replace(from,to);}
const indexPath=`${fn}/index.ts`;
let index=fs.readFileSync(indexPath,'utf8');
index=once(index,'W4-55+SCHEDULE_V5+TV54_EXACT_1_BLOCKED+POWER_W4_POST_W3_121_60_99+V431_UI_RESET','W4-55+SCHEDULE_V5+TV54_EXACT_1_BLOCKED+POWER_W4_POST_W3_121_60_99+GAMECAST_V1_1_FCS60+V431_UI_RESET');
fs.writeFileSync(indexPath,index);
assert.equal(blobSha(fs.readFileSync(`${fn}/week4.ts`)),'9a4095335fd1b440017641c9cc514b2a01510739','Schedule v5 must remain byte-identical');
let page=fs.readFileSync(`${ui}/index.html`,'utf8');
page=once(page,'Four schedule-only FCS opponents remain governed sidecars under the Chairman 0.10x rule','Four schedule-only FCS opponents have TEAM, OFF and DEF fixed at 60 by the Chairman');
page=once(page,'Four Schedule-v5 FCS opponents use the Chairman 0.10x-above-floor rule.','The loaded ratings source is the approved GameCast-ready TEAM/OFF/DEF v1.1 workbook.');
page=once(page,'Fresh 4.3.1 sessions are preloaded with the governed 121-team post-Week-3 Week 4 60–99 power package plus four schedule-only FCS sidecars.','Fresh 4.3.1 sessions are preloaded with the approved 121-team GameCast-ready v1.1 Week 4 TEAM/OFF/DEF package plus four FCS opponents at 60/60/60. Existing sessions retain their original rating snapshots; use PURGE UI + NEW SESSION to start with this package without altering prior cloud history.');
assert.ok(!page.includes('0.10x'));
fs.writeFileSync(`${ui}/index.html`,page);
console.log('GameCast 4.3.1 power overlay: approved v1.1, 121 canonical teams + 4 fixed-60 FCS opponents; schedule and football mechanics preserved.');
