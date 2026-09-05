/** Minimal same-origin dev server; changes to content/*.yaml are read on reload. */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const port=Number(process.env.PORT||5173),host=process.env.HOST||'127.0.0.1';
const mime={'.html':'text/html; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.yaml':'text/yaml; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};
http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end('Method not allowed');}
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
  let data;
  if(pathname==='/src/content.mjs'){
   const samples={};
   for(const id of ['stage','minimal','branching'])samples[id]=await readFile(path.join(root,`content/${id}.yaml`),'utf8');
   data=`export const SAMPLES = ${JSON.stringify(samples)};\n`;
  }else data=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
}).on('error',e=>{console.error(`Server error: ${e.message}`);process.exitCode=1;}).listen(port,host,()=>console.log(`Moonlit Archive: http://${host}:${port}`));
