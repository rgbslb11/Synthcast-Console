// Lossless archive decoder. Archive-only; never used by the running application.
export function applyDelta(base,delta){
  if(delta===null)return base;
  if(!Array.isArray(delta))throw Error('Invalid archive delta');
  const [tag,value,extra]=delta;
  if(tag==='=')return structuredClone(value);
  if(tag==='o'){
    if(base===null||Array.isArray(base)||typeof base!=='object')throw Error('Object base required');
    const out={...base};for(const k of extra)delete out[k];
    for(const [k,d] of Object.entries(value))Object.defineProperty(out,k,{value:applyDelta(base[k],d),enumerable:true,writable:true,configurable:true});
    return out;
  }
  if(tag==='a'){
    if(!Array.isArray(base)||!Number.isInteger(value)||value<0)throw Error('Array base required');
    const out=base.slice(0,value);out.length=value;
    for(const [k,d] of Object.entries(extra)){const i=Number(k);if(!Number.isInteger(i)||i<0||i>=value)throw Error('Bad array index');out[i]=applyDelta(base[i],d);}
    for(let i=0;i<value;i++)if(!(i in out))throw Error('Unresolved array value');
    return out;
  }
  throw Error('Unknown archive delta');
}
