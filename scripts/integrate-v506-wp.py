"""Apply candidate-only observer integration after baseline regeneration."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'release-assets/v5.0.6-week11/backend'
def edit(name,old,new):
    p=BASE/name
    s=p.read_text()
    if new in s:return
    assert old in s, (name,old)
    p.write_text(s.replace(old,new))
edit('src/release-runtime.mjs',"import * as engine", "import {withProbability} from '../probability/operations.mjs';\nimport * as engine")
edit('src/release-runtime.mjs','operations=createEngineOperations({engine,clock})','operations=withProbability(createEngineOperations({engine,clock}),{clock})')
edit('src/database-store.mjs',"import {SecurityError", "import {assertHistoryPreserved,assertHistoryEvents} from '../probability/history.mjs';\nimport {SecurityError")
edit('src/database-store.mjs',"const next=draft.state.find(g=>g.id===old.id);if", "const next=draft.state.find(g=>g.id===old.id);assertHistoryPreserved(old,next);if")
edit('src/database-store.mjs',"const secrets=new Set([", "const secrets=new Set(['winProbability',")
edit('src/database-store.mjs',"  for(const e of events){", "  assertHistoryEvents(before,draft,events);\n  for(const e of events){")
edit('src/command-preconditions.mjs','delete copy.glSeconds;','delete copy.glSeconds;delete copy.winProbability;')
edit('security/security-core.mjs',"  'seedHex','rngState'", "  'winProbability','seedHex','rngState'")
edit('security/edge-boundaries.mjs',"import {liveStats}","import {probabilityView} from '../probability/history.mjs';\nimport {liveStats}")
edit('security/edge-boundaries.mjs',"      if(action==='stats'){", """      if(action==='probability'){
        const snapshot=await store.snapshot(requireSessionSlug(url.searchParams.get('session')));
        const game=snapshot.state.find(g=>g.id===url.searchParams.get('game'));
        if(!game)throw new SecurityError('GAME_NOT_FOUND',404);
        return json({...probabilityView(game),stateVersion:snapshot.stateVersion},200,origin);
      }
      if(action==='stats'){""")
