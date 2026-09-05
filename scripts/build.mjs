/** Project-specific static ESM bundler. No runtime eval, compression loader or CDN. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const samples={};for(const id of ['stage','minimal','branching'])samples[id]=await readFile(path.join(root,`content/${id}.yaml`),'utf8');
await writeFile(path.join(root,'src/content.mjs'),`export const SAMPLES = ${JSON.stringify(samples)};\n`);
const registry=new Map(),blocks=[];
async function bundle(file){
  if(registry.has(file))return registry.get(file);
  let source=await readFile(file,'utf8');const name=`__m${registry.size}`;registry.set(file,name);
  const imports=[...source.matchAll(/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm)];
  for(const m of imports){const dep=await bundle(path.resolve(path.dirname(file),m[2]));source=source.replace(m[0],()=>`const {${m[1]}}=${dep};`);}
  const exported=[];
  for(const m of source.matchAll(/\bexport\s+(?:const|let|var|function|class)\s+(\w+)/g))exported.push(m[1]);
  source=source.replace(/^export\s*\{([^}]+)\};?\s*$/gm,(_,names)=>{exported.push(...names.split(',').map(n=>n.trim()));return '';});
  if(file.endsWith('vendor/yaml.mjs'))exported.push('loadAll','dump','CORE_SCHEMA');
  if(file.endsWith('engine.mjs'))exported.push('HEIGHT','FIXED_DT');
  source=source.replace(/\bexport\s+(?=const|let|var|function|class)/g,'');
  blocks.push(`const ${name}=(()=>{\n${source}\nreturn {${[...new Set(exported)].join(',')}};\n})();`);return name;
}
await bundle(path.join(root,'src/main.mjs'));
let html=await readFile(path.join(root,'index.html'),'utf8');const css=await readFile(path.join(root,'src/style.css'),'utf8');
if(!html.includes('MIT License')){
  const licenses=await readFile(path.join(root,'LICENSE'),'utf8')+'\n\nThird-party software:\n'+await readFile(path.join(root,'vendor/LICENSE-js-yaml.txt'),'utf8');
  html=html.replace('<head>',()=>`<head>\n<!--\n${licenses.replace(/--/g,'- -')}\n-->`);
}
html=html.replace('<link rel="stylesheet" href="src/style.css">',()=>`<style>\n${css}\n</style>`);
const js=blocks.join('\n').replace(/<\/script/gi,'<\\/script');
html=html.replace('<script type="module" src="src/main.mjs"></script>',()=>`<script>\n'use strict';\n${js}\n</script>`);
if(/<script[^>]*\ssrc=/.test(html))throw new Error('Unexpected external runtime dependency');
await mkdir(path.join(root,'dist'),{recursive:true});
for(const name of ['index.html','moonlit-stg.html'])await writeFile(path.join(root,'dist',name),html);
console.log(`Built standalone dist/index.html (${Math.round(Buffer.byteLength(html)/1024)} KiB).`);
