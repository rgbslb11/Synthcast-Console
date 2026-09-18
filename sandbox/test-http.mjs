import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import http from 'node:http';
function request(path,headers){return new Promise((resolve,reject)=>{const req=http.request('http://127.0.0.1:4312'+path,{headers},res=>{let data='';res.on('data',s=>data+=s);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text:data}));});req.on('error',reject);req.end();});}
const server=spawn(process.execPath,[new URL('./server.mjs',import.meta.url).pathname],{env:{...process.env,GAMECAST_SANDBOX_PORT:'4312'},stdio:['ignore','pipe','pipe']});
const checks=[];
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timeout')),10000);server.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});server.stdout.on('data',chunk=>{if(chunk.toString().includes('listening')){clearTimeout(timer);resolve();}});});
 for(const [name,path,headers,status] of [
  ['Sandbox route and CSP','/sandbox/',{},200],
  ['Old UI unavailable','/v4.3.1/',{},404],
  ['Foreign Host rejected','/sandbox/',{host:'example.com'},403],
  ['Foreign Origin rejected','/sandbox/api?api=read',{origin:'https://example.com'},403],
  ['Cross-site rejected','/sandbox/api?api=read',{'sec-fetch-site':'cross-site'},403],
  ['Publication disabled','/sandbox/api?api=publish',{},403],
  ['Live namespace rejected','/sandbox/api?api=read&session=w4v431-0000000000000000',{},403]
 ]){
  const r=await request(path,headers);assert.equal(r.status,status,name);
  if(name==='Sandbox route and CSP'){assert.ok(r.headers['content-security-policy'].includes("connect-src 'self'"));assert.ok(r.text.includes('QA ONLY'));}
  checks.push({name,status:'PASS',httpStatus:status});
 }
 for(const file of ['app.js','patch-431.js']){
  const r=await fetch('http://127.0.0.1:4312/sandbox/'+file);assert.equal(r.status,200);const s=await r.text();assert.ok(!s.includes('supabase.co'));assert.ok(s.includes('SANDBOX'));
 }
 checks.push({name:'Served UI sandbox API/identity bindings',status:'PASS'});
 fs.writeFileSync(new URL('./evidence/http-results.json',import.meta.url),JSON.stringify({qaOnly:true,checks},null,2)+'\n');
 console.log(JSON.stringify(checks,null,2));
}finally{server.kill('SIGTERM');await once(server,'exit');}
