from pathlib import Path
import csv, io, json, hashlib, math, re
from datetime import datetime
from zoneinfo import ZoneInfo

root=Path(__file__).resolve().parent.parent
assets=root/'release-assets/gamecast-v4.4.2'
out=root/'outputs/v442'; out.mkdir(parents=True,exist_ok=True)
def sha(b): return hashlib.sha256(b).hexdigest()
def unique(pairs):
    result={}
    for k,v in pairs:
        if k in result: raise ValueError('Duplicate JSON key: '+k)
        result[k]=v
    return result
rating_name='W7_APPROVED_ENGINE_121.json'; game_name='W7_RECONCILED_SLATE_54.csv'
rb=(assets/'inputs'/rating_name).read_bytes(); gb=(assets/'inputs'/game_name).read_bytes()
assert sha(rb)=='17d9e89e108e2528232a6f6ef18cddb8739653b38e87db67ad01165bb13911e0'
assert sha(gb)=='481ed077d734dce9fd9aa25517fb5b5ea073ababdf77f55fdca650034dabbd4a'
baseline=(root/'supabase/functions/gamecast-week6-v4-4-1/power.ts').read_bytes()
assert sha(baseline)=='34e4ef1bc881d8a3492bee0c0a01cdce58aa82dd36bb43ad77d54175cd9447e1'
canonical={s.split('|')[0] for s in baseline.decode().split('const RAW=`\n')[1].split('`.trim()')[0].strip().splitlines()}
payload=json.loads(rb,object_pairs_hook=unique); ratings=payload['ratings']
games=list(csv.DictReader(io.StringIO(gb.decode('utf-8-sig'))))
assert len(ratings)==121 and set(ratings)==canonical
for name,r in ratings.items():
    assert set(r)=={'overall','offense','defense'},name
    for value in r.values():assert not isinstance(value,bool) and isinstance(value,(int,float)) and math.isfinite(value) and 60<=value<=99,name
assert len(games)==54
def rank(value):
    n=float(value);assert math.isfinite(n) and n.is_integer() and 1<=n<=25
    return int(n)
ids=set();pairs=set();teams=set();codes={};orders=set();slate=[]
for g in games:
    for f in ['game_id','week','date_ET','time_ET','kickoff_ET','kickoff_UTC','kickoff_CT','network','away','home','away_code','home_code','neutral','timezone_basis']:assert g[f],(g['game_id'],f)
    assert re.fullmatch(r'G\d{4}',g['game_id']) and g['game_id'] not in ids
    ids.add(g['game_id']); pair=tuple(sorted([g['away'],g['home']]))+(g['date_ET'],)
    assert pair not in pairs;pairs.add(pair)
    assert g['week']=='2026-W07' and g['away']!=g['home'] and g['neutral'] in ['True','False']
    if 'neutral site' in g['notes'].lower():assert g['neutral']=='True'
    order=int(g['slate_order']);assert order not in orders;orders.add(order)
    for side in ['away','home']:
        name=g[side];assert name in canonical and name in ratings;teams.add(name)
        code=g[side+'_code'];assert code not in codes or codes[code]==name;codes[code]=name
        for src,dst in [('TEAM','overall'),('OFF','offense'),('DEF','defense')]:assert math.isfinite(float(g[side+'_'+src])) and float(g[side+'_'+src])==ratings[name][dst]
    et=datetime.fromisoformat(g['kickoff_ET']);utc=datetime.fromisoformat(g['kickoff_UTC']);ct=datetime.fromisoformat(g['kickoff_CT'])
    assert et.tzinfo and utc.tzinfo and ct.tzinfo and et==utc==ct
    assert utc.astimezone(ZoneInfo('America/New_York')).isoformat()==et.isoformat()
    assert utc.astimezone(ZoneInfo('America/Chicago')).isoformat()==ct.isoformat()
    assert et.strftime('%Y-%m-%d')==g['date_ET'] and et.strftime('%I:%M %p').lstrip('0')==g['time_ET']
    slate.append(dict(id=g['game_id'],date=g['date_ET'],dateLabel=et.strftime('%a ')+str(et.month)+'/'+str(et.day),kickoff=g['time_ET'],network=g['network'],matchup=g['away']+(' vs. ' if g['neutral']=='True' else ' at ')+g['home'],away=g['away'],home=g['home'],awayCode=g['away_code'],homeCode=g['home_code'],awayRecord=g['away_accepted_record'],homeRecord=g['home_accepted_record'],awayRank=rank(g['away_coaches_rank']) if g['away_coaches_rank'] else None,homeRank=rank(g['home_coaches_rank']) if g['home_coaches_rank'] else None,neutral=g['neutral']=='True',kickoffOrder=order,canonicalWeek='W7',kickoffZulu=utc.isoformat().replace('+00:00','Z'),tvStartZulu=None,notes=g['notes']))
slate.sort(key=lambda g:(g['kickoffOrder'],g['id']))
assert len(teams)==108 and [g['id'] for g in slate if g['neutral']]==['G0315']
manifest={'classification':'TEST RESULT','status':'PASS','logicalInputs':2,'inputs':[
 dict(filename=rating_name,archive_member=rating_name,size_bytes=len(rb),sha256=sha(rb),format='JSON',schema=['overall','offense','defense'],expected_rows=121,actual_rows=121,accepted_rows=121,rejected_rows=0,unique_teams=121,rating_records=121,game_count=0,activation_status='NOT ACTIVATED'),
 dict(filename=game_name,archive_member=game_name,size_bytes=len(gb),sha256=sha(gb),format='CSV',schema=list(games[0]),expected_rows=54,actual_rows=54,accepted_rows=54,rejected_rows=0,unique_teams=108,rating_records=0,game_count=54,activation_status='NOT ACTIVATED')],
 'errors':[],'warnings':['Baseline-approved exact canonical names are join keys. Short codes are preserved for display/search only.','No FCS fallback used.','Venue name and input lifecycle are not required by the inspected baseline schema.','Georgia 97/96/99 approved exception preserved.'],'canonical_teams':121,'rating_values':363,'scheduled_team_appearances':108,'scheduled_unique_teams':108,'scheduled_rating_coverage':108,'neutral_games':['G0315']}
(out/'w7-validation.json').write_text(json.dumps(manifest,indent=2)+'\n')
(out/'w7-slate.json').write_text(json.dumps(slate,indent=2)+'\n')
(out/'W7_ACTIVATION_PREVIEW.md').write_text('# W7 activation preview — NOT ACTIVATED\n\n121 ratings; 54 games; 108 scheduled teams.\n\n| Game | Date ET | Time ET | Away | Home | Network | Neutral |\n|---|---|---|---|---|---|---|\n'+'\n'.join('| '+' | '.join(g[k] for k in ['game_id','date_ET','time_ET','away','home','network','neutral'])+' |' for g in games)+'\n')
print(json.dumps({'status':'PASS','logicalInputs':2,'ratings':121,'ratingValues':363,'games':54,'teams':108,'rejected':0}))
