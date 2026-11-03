"""Reproducible QA-only preparation. No network, database, or deployment calls."""
from pathlib import Path
import csv, json, hashlib, shutil, re
from datetime import datetime
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'release-assets/v5.0.6-week11'
OLD=ROOT/'release-assets/v5.0.5-week10/backend'
ratings=list(csv.DictReader((OUT/'ratings.csv').open()))
assert len(ratings)==121 and len({r['Team_ID'] for r in ratings})==121
by_name={r['Team']:r for r in ratings}
slate=[]
for i,line in enumerate((OUT/'carriage.tsv').read_text().strip().splitlines()):
    gid,day,kick,network,away,home=line.split('\t')
    dt=datetime.strptime(f'2026-11-{day} {kick}', '%Y-%m-%d %H:%M').replace(tzinfo=ZoneInfo('America/New_York'))
    slate.append(dict(id=gid,date=dt.strftime('%Y-%m-%d'),dateLabel=f'{dt:%a} 11/{int(day)}',kickoff='Noon' if kick=='12:00' else dt.strftime('%I:%M %p').lstrip('0'),network=network,matchup=f'{away} at {home}',away=away,home=home,awayCode=by_name[away]['Team_ID'],homeCode=by_name[home]['Team_ID'],kickoffOrder=i+1,canonicalWeek='W11',kickoffTimeZone='America/New_York',kickoffZulu=dt.astimezone(ZoneInfo('UTC')).isoformat().replace('+00:00','Z'),neutral=False,venueDesignation='HOME',qaOnly=True))
assert len(slate)==56 and len({g['id'] for g in slate})==56
assert len({g[t] for g in slate for t in ('away','home')})==112
def version(s):
    for a,b in [('5.0.5','5.0.6'),('v5-0-5','v5-0-6'),('V505','V506'),('v505','v506'),('W10','W11'),('w10','w11'),('week10','week11')]:s=s.replace(a,b)
    return s
for folder in ['runtime','src','security']:
    for p in (OLD/folder).glob('*.mjs'):
        dest=OUT/'backend'/folder/version(p.name)
        dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.name=='live-stats.mjs':continue
        dest.write_text(version(p.read_text()))
power={r['Team']:dict(overall=float(r['TEAM']),offense=float(r['OFF']),defense=float(r['DEF']),specialTeams=None,tempo=None,sourceVersion='W11-CANONICAL-R2',flag=None,opponentBasis=None) for r in ratings}
assert all(60<=v<=99 for r in power.values() for k,v in r.items() if k in ['overall','offense','defense'])
(OUT/'backend/runtime/week11.mjs').write_text('export const OPERATING_SLATE = '+json.dumps(slate,indent=2)+';\n')
(OUT/'backend/runtime/power.mjs').write_text('export const POWER_SOURCE_VERSION="W11-CANONICAL-R2";\nexport const SCHEDULED_TEAM_COUNT=112;\nexport const TEAM_POWER = '+json.dumps(power,indent=2)+';\n')
sha=hashlib.sha256((OUT/'ratings.csv').read_bytes()).hexdigest()
p=OUT/'backend/runtime/engine.mjs'
p.write_text(re.sub(r'const DATA_VERSION = .*?;',f'const DATA_VERSION = "W11-SLATE56+CANONICAL_R2+CSV_{sha[:16]}+V506_QA";',p.read_text()))
p=OUT/'backend/security/security-core.mjs'
p.write_text(re.sub(r'export const ACTIVE_GAME_IDS=Object.freeze\(.*?\);','export const ACTIVE_GAME_IDS=Object.freeze('+json.dumps([g['id'] for g in slate])+');',p.read_text()))
p=OUT/'backend/src/release-runtime.mjs'
p.write_text(p.read_text().replace('qaOnly:false','qaOnly:true').replace('writesEnabled=()=>true','writesEnabled=()=>false'))
p=OUT/'backend/security/edge-boundaries.mjs'
s="import {liveStats} from '../src/live-stats.mjs';\n"+p.read_text()
needle="      if(action!=='read')throw new SecurityError('UNSUPPORTED_ACTION',400);"
s=s.replace(needle,"""      if(action==='stats'){
        const snapshot=await store.read(requireSessionSlug(url.searchParams.get('session')),{operator:true});
        const game=snapshot.state.find(g=>g.id===url.searchParams.get('game'));
        if(!game)throw new SecurityError('GAME_NOT_FOUND',404);
        return json(liveStats(game,snapshot.state_version),200,origin);
      }
"""+needle)
p.write_text(s)
(OUT/'slate.json').write_text(json.dumps(slate,indent=2)+'\n')
(OUT/'input-manifest.json').write_text(json.dumps(dict(baseline='9d13c58548072f4e8ba9cd8f8c9ebcb5cd0f4bd8',status='QA_ONLY_NOT_DEPLOYABLE',games=56,teams=121,scheduledTeams=112,ratingFields=363,ratingsSha256=sha,source='Chairman supplied W11 carriage, game IDs and R2 CSV',pending=['Presentation metadata (records, poll ranks, announcers) retained in Chairman thread; not yet serialized here','Venue IDs and conference classification not supplied; absent, not inferred','Final screens, cloud provisioning and release approval']),indent=2)+'\n')
import runpy
runpy.run_path(str(ROOT/'scripts/integrate-v506-wp.py'))
print(json.dumps(dict(games=len(slate),ratings=len(power),ratingFields=3*len(power),ratingsSha256=sha)))
