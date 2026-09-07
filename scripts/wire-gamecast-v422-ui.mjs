import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const baseApp=path.join(root,'public/v4.2/app.js');
const dstDir=path.join(root,'public/v4.2.2');
const dstApp=path.join(dstDir,'app.js');
const pagePath=path.join(dstDir,'index.html');
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function all(s,from,to,label){if(!s.includes(from))throw new Error(`Missing ${label}`);return s.split(from).join(to)}

if(!fs.existsSync(pagePath))throw new Error('Run build-gamecast-v422.mjs first');
let app=read(baseApp);
app=all(app,"const API='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week3-v4-2',STORE='synthcastGameCast42Operator'","const API='https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week3-v4-2-2',STORE='synthcastGameCast422Operator'",'direct 4.2.2 API/store binding');
app=all(app,"engine='GC-W3-V4.2.0-RC1'","engine='GC-W3-V4.2.2-RC1'",'4.2.2 UI engine identity');
write(dstApp,app);

let page=read(pagePath);
page=page.replace('<script src="shim-422.js"></script><script src="../v4.2/app.js"></script>','<script src="app.js"></script>');
if(page.includes('shim-422.js'))throw new Error('4.2.2 UI still depends on fetch/storage shim');
if(page.includes('../v4.2/app.js'))throw new Error('4.2.2 UI still depends on 4.2 app runtime');
write(pagePath,page);

const check=read(dstApp);
if(!check.includes('gamecast-week3-v4-2-2'))throw new Error('4.2.2 app is not bound to 4.2.2 backend');
if(!check.includes("synthcastGameCast422Operator"))throw new Error('4.2.2 app does not use isolated operator storage');
if(check.includes('gamecast-week3-v4-2\''))throw new Error('4.2 backend endpoint remains in 4.2.2 app');
console.log('GameCast 4.2.2 UI directly wired to isolated backend.');
