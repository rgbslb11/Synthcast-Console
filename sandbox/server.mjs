import http from 'node:http';
import fs from 'node:fs';
import {createRuntime} from './runtime.mjs';
import './build-ui.mjs';
const port=Number(process.env.GAMECAST_SANDBOX_PORT||4311);
const runtime=createRuntime({receiver:true,file:new URL('./data/qa-receiver1-sessions.json',import.meta.url)});
const assets=new Set(['index.html','app.js','app.css','patch-rc2.js','patch-422.js','patch-431.js']);
const csp="default-src 'none'; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',csp);res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const host=req.headers.host;
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host)){res.writeHead(403);return res.end('Host rejected');}
  const origin=`http://${host}`;
  if(req.headers.origin&&req.headers.origin!==origin){res.writeHead(403);return res.end('Origin rejected');}
  if(req.headers['sec-fetch-site']==='cross-site'){res.writeHead(403);return res.end('Cross-site request rejected');}
  const u=new URL(req.url,origin);
  try{
    if(u.pathname==='/sandbox/api'){
      let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>1024*1024){res.writeHead(413);return res.end('Request too large');}chunks.push(chunk);}
      const body=Buffer.concat(chunks);
      const request=new Request(u,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body}:{} )});
      const result=await runtime.handle(request);res.writeHead(result.status,Object.fromEntries(result.headers));return res.end(await result.text());
    }
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    const asset=u.pathname==='/sandbox/'?'index.html':u.pathname.startsWith('/sandbox/')?u.pathname.slice(9):'';
    if(!assets.has(asset)){res.writeHead(404);return res.end('Sandbox route only');}
    res.setHeader('Content-Type',asset.endsWith('.js')?'text/javascript':asset.endsWith('.css')?'text/css':'text/html');
    return res.end(fs.readFileSync(new URL('./ui/'+asset,import.meta.url)));
  }catch(error){console.error(error.message);res.writeHead(500);res.end('Sandbox request failed');}
});
server.listen(port,'127.0.0.1',()=>console.log(`QA_ONLY sandbox listening at http://127.0.0.1:${port}/sandbox/`));
