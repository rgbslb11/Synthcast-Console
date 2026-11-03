/** Dependency-free SVG renderer. Input = ordered persisted observation records. */
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function splitAt50(a,b){
 if(![a.x,a.y,b.x,b.y].every(Number.isFinite))throw new Error('Nonfinite chart point');
 const color=y=>y>=50?'#1267b1':'#d32f3b';
 if((a.y<50&&b.y>50)||(a.y>50&&b.y<50)){
  const c={x:a.x+(b.x-a.x)*(50-a.y)/(b.y-a.y),y:50};
  return [{a,b:c,color:color(a.y)},{a:c,b,color:color(b.y)}];
 }
 return [{a,b,color:color((a.y+b.y)/2)}];
}
export function renderChart(points,{title='Favorite Win Probability',favoriteLabel='Favorite'}={}){
 const W=1120,H=560,L=82,R=42,top=84,bottom=86,pw=W-L-R,ph=H-top-bottom;
 const px=x=>L+x*pw,py=y=>top+(100-y)*ph/100;
 const blocked=points.at(-1)?.status==='BLOCKED';
 const n=points.length,reg=points.find(p=>p.trace?.T)?.trace.T??2400;
 const ot=points.some(p=>p.reason==='OVERTIME_MODEL_UNAVAILABLE'||p.status==='ot_unavailable');
 const fraction=p=>p.trace?.t!==undefined?(reg-p.trace.t)/reg:p.status==='terminal'||p.status==='FINAL'?1:p.input?1-((4-p.input.period)*p.input.quarterSeconds+p.input.clockSeconds)/(4*p.input.quarterSeconds):null;
 // Regulation is time-proportional. OT uses sequence progression with labeled markers.
 const mapped=points.map((p,i)=>({p,x:ot?i/Math.max(1,n-1):fraction(p),y:p.probability===null?null:100*p.probability}));
 let out=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}" style="width:100%;height:auto;font-family:system-ui,sans-serif;background:white">`,
 `<title>${esc(title)}</title><desc>Fixed pregame favorite. Blue at or above 50 percent, red below. Lines connect observations, not additional estimates.</desc>`,
 `<text x="${L}" y="30" font-size="23" font-weight="700" fill="#17344d">${esc(title)}</text>`,
 `<text x="${L}" y="55" font-size="14" fill="#596570">${esc(favoriteLabel)} · Blue ≥ 50% · Red &lt; 50%</text>`];
 if(blocked)out.push(`<text x="${W-R}" y="55" text-anchor="end" fill="#808080" font-weight="700">BLOCKED</text>`);
 for(let y=0;y<=100;y+=10){out.push(`<line x1="${L}" y1="${py(y)}" x2="${W-R}" y2="${py(y)}" stroke="${y===50?'#89949f':'#e4e9ed'}" ${y===50?'stroke-dasharray="6 4"':''}/><text x="${L-12}" y="${py(y)+4}" text-anchor="end" font-size="12">${y}%</text>`);}
 const ticks=ot?mapped.filter((r,i)=>i===0||i===n-1||i>0&&r.p.period!==mapped[i-1].p.period).map(r=>[r.x,r.p.status==='terminal'?'Final':r.p.kind==='kickoff'?'Kickoff':String(r.p.period)]):[[0,'Kickoff · 1Q'],[.25,'End 1Q'],[.5,'Halftime'],[.75,'End 3Q'],[1,'Final / end regulation']];
 for(const [x,label] of ticks){out.push(`<line x1="${px(x)}" x2="${px(x)}" y1="${top}" y2="${top+ph}" stroke="#d4dce2"/><text x="${px(x)}" y="${top+ph+25}" text-anchor="middle" font-size="12">${esc(label)}</text>`);}
 for(let i=1;i<n;i++){
  const a=mapped[i-1],b=mapped[i];
  // Corrections and clock rewinds break the visual path; do not rewrite or sort history.
  if(a.y===null||b.y===null||a.x===null||b.x===null||b.x<a.x||b.p.kind==='correction'||b.p.gapBefore)continue;
  for(const s of splitAt50(a,b))out.push(`<line x1="${px(s.a.x)}" y1="${py(s.a.y)}" x2="${px(s.b.x)}" y2="${py(s.b.y)}" stroke="${blocked?'#808080':s.color}" stroke-width="3"/>`);
 }
 for(const r of mapped){if(r.y===null||r.x===null)continue;const p=r.p;
 out.push(`<circle cx="${px(r.x)}" cy="${py(r.y)}" r="4.5" fill="${blocked?'#808080':r.y>=50?'#1267b1':'#d32f3b'}" stroke="white"><title>${esc(`${p.eventId} | ${p.period} | clock ${p.clockSeconds}s | ${p.favoriteScore}-${p.otherScore} | ${r.y.toFixed(2)}%`)}</title></circle>`);}
 out.push(`<text x="${L+pw/2}" y="${H-29}" text-anchor="middle" font-size="14">Game Progression</text><text transform="translate(21 ${top+ph/2}) rotate(-90)" text-anchor="middle" font-size="14">Favorite Win %</text><text x="${L}" y="${H-7}" font-size="11" fill="#596570">${ot?'OT estimates unavailable; gaps preserved. Horizontal spacing follows observation order.':'Horizontal spacing follows regulation scoreboard time. Dots are stored observations.'}</text></svg>`);
 return out.join('');
}
