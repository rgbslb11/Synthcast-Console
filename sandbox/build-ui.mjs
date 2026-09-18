import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir=new URL('./ui/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
function read(p){return fs.readFileSync(new URL('../public/'+p,import.meta.url),'utf8');}
function write(p,s){fs.writeFileSync(new URL(p,dir),s);}
let app=read('v4.3.1/app.js');
assert.ok(app.includes('https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week4-v4-3-1'));
app=app.replace('https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week4-v4-3-1','/sandbox/api').replaceAll('synthcastGameCast431Operator','synthcastGameCast431Receiver1Operator').replaceAll('GC-W4-V4.3.1-RC1','GC-W4-V4.3.1-RC1-SANDBOX-RECEIVER1');
app+=`\n// Sandbox presentation guards; server independently rejects prohibited commands.\nconst originalFinalCtl=finalCtl;\nfinalCtl=function(g){return originalFinalCtl(g).replace(/<button[^>]*>ACCEPT<\\/button>/g,'<button disabled>QA ONLY · ACCEPT DISABLED</button>')};\ndocument.getElementById('loadPower').disabled=true;\ndocument.querySelector('details.power').hidden=true;\nif(slug&&!/^qa-receiver1-[a-f0-9]{16}$/.test(slug)){slug='';token='';status('FOREIGN SESSION REJECTED',true);}\n`;
write('app.js',app);
let html=read('v4.3.1/index.html').replace('../v4.2/app.css','app.css').replace('../v4.2/patch-rc2.js','patch-rc2.js').replace('../v4.2.2/patch-422.js','patch-422.js').replace('<title>','<title>QA ONLY — ').replace('<body>','<body><div role="status" style="padding:12px;background:#5c3900;color:white;font-weight:bold">SANDBOX · QA ONLY · NONOFFICIAL · NO STANDINGS / RATINGS / PUBLICATION</div>').replace(/<a href="..\/v4.2.1\/review.html">.*?<\/a>/,'').replace('Read-only cloud view.','Read-only local QA view.').replace('CREATE OPERATING SLATE','CREATE QA SLATE').replace('Create or resume a GameCast cloud session.','Create or resume a local QA-only session.');
write('index.html',html);write('app.css',read('v4.2/app.css'));
write('patch-rc2.js',read('v4.2/patch-rc2.js'));write('patch-422.js',read('v4.2.2/patch-422.js'));write('patch-431.js',"engine='GC-W4-V4.3.1-RC1-SANDBOX-RECEIVER1';\n");
assert.ok(!app.includes('supabase.co'));
console.log('Sandbox UI bound exclusively to /sandbox/api; separate browser storage; dark theme preserved.');
