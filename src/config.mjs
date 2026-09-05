import {load, CORE_SCHEMA} from '../vendor/yaml.mjs';
import {compileExpression, VARIABLES} from './expression.mjs';
const COLORS=Object.freeze({pink:'#f2a4cf', ice:'#9ae6ed', violet:'#b9a5f8', gold:'#f4d893', red:'#ff8297', white:'#edf2ff', green:'#a8efc1'});
const SHAPES=Object.freeze({orb:0,rice:1,diamond:2,star:3,petal:4});
const reserved=new Set([...VARIABLES,'pi','tau','__proto__','prototype','constructor']);
const fail=(p,m)=>{throw new Error(`${p}: ${m}`);};
const obj=(v,p)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(p,'マッピングが必要です');return v;};
const arr=(v,p,min=0,max=512)=>{if(!Array.isArray(v)||v.length<min||v.length>max)fail(p,`${min}〜${max}件の配列が必要です`);return v;};
const str=(v,p,max=2000)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail(p,`1〜${max}文字の文字列が必要です`);return v;};
const num=(v,p,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(p,`${min}〜${max}の数値が必要です`);return v;};
function keys(v,allowed,p){obj(v,p);for(const k of Object.keys(v))if(!allowed.includes(k))fail(`${p}.${k}`,'未定義の項目です（スペルを確認してください）');}
function expr(v,p,extra=[]){try{return compileExpression(v,[...VARIABLES,...extra]);}catch(e){fail(p,e.message);}}
function id(s,p){str(s,p,80);if(!/^[A-Za-z_][\w-]*$/.test(s)||reserved.has(s))fail(p,'英字で始まる安全なIDが必要です');return s;}
function color(v,p='color'){if(Object.hasOwn(COLORS,v))return COLORS[v];if(typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v))return v;fail(p,'pink / ice / violet / gold / red / white / green / "#RRGGBB" を指定してください');}
function safeTree(v,seen=new Set(),depth=0){
  if(depth>40)fail('YAML','入れ子は40段までです');
  if(v&&typeof v==='object'){
    if(seen.has(v))fail('YAML','アンカー・エイリアスによるオブジェクトの再利用は非対応です。params / use を使ってください');seen.add(v);
    for(const k of Object.keys(v)){if(['__proto__','prototype','constructor','<<'].includes(k))fail('YAML',`禁止されたキー: ${k}`);safeTree(v[k],seen,depth+1);}
  }
}
function parseProject(source){
  if(typeof source!=='string'||source.length>200000)fail('YAML','ファイルは200,000文字以内にしてください');
  let depth=0,doc;
  try{doc=load(source,{schema:CORE_SCHEMA,listener:event=>{if(event==='open'&&++depth>40)throw new Error('YAMLの入れ子は40段までです');if(event==='close')depth--;}});}catch(e){throw new Error(e.mark?`YAML ${e.mark.line+1}行 ${e.mark.column+1}列: ${e.reason}`:e.message);}
  safeTree(doc);keys(doc,['version','meta','player','feel','patterns','enemies','bosses','story'],'root');
  if(doc.version!==1)fail('version','1 を指定してください');
  const meta=doc.meta??{};keys(meta,['title','subtitle','stage','seed'],'meta');
  for(const k of ['title','subtitle','stage'])if(meta[k]!==undefined)str(meta[k],`meta.${k}`,200);
  if(meta.seed!==undefined)num(meta.seed,'meta.seed',0,4294967295);
  const player=Object.assign({speed:260,focusSpeed:105,hitRadius:2.5,lives:3,bombs:3,damage:7},doc.player);
  keys(player,['speed','focusSpeed','hitRadius','lives','bombs','damage'],'player');
  for(const k of ['speed','focusSpeed'])num(player[k],`player.${k}`,20,1000);
  num(player.hitRadius,'player.hitRadius',1,6);num(player.damage,'player.damage',1,100);
  for(const k of ['lives','bombs']){num(player[k],`player.${k}`,1,9);if(!Number.isInteger(player[k]))fail(`player.${k}`,'整数を指定してください');}
  // Game-feel values are optional and bounded; old projects remain valid.
  const feel=Object.assign({shotInterval:.09,hitFlash:.065,bossStop:.12,enemyTell:.4,bombClear:.65,pickupRadius:80,focusPickupRadius:130,autoCollectY:180,grazeStep:25,grazeBonus:1500},doc.feel);
  const ranges={shotInterval:[.045,.3],hitFlash:[0,.15],bossStop:[0,.25],enemyTell:[0,1.5],bombClear:[0,2],pickupRadius:[18,200],focusPickupRadius:[18,240],autoCollectY:[0,300],grazeStep:[1,200],grazeBonus:[0,10000]};
  keys(feel,Object.keys(ranges),'feel');
  for(const [k,[min,max]] of Object.entries(ranges))num(feel[k],`feel.${k}`,min,max);
  if(!Number.isInteger(feel.grazeStep))fail('feel.grazeStep','整数を指定してください');
  const srcPatterns=obj(doc.patterns,'patterns');if(Object.keys(srcPatterns).length<1||Object.keys(srcPatterns).length>64)fail('patterns','1〜64個のパターンが必要です');
  const patterns={};
  for(const [key,p]of Object.entries(srcPatterns)){
    id(key,`patterns.${key}`);keys(p,['name','description','params','emitters'],`patterns.${key}`);
    const path=`patterns.${key}`;const params=p.params??{};obj(params,`${path}.params`);
    if(Object.keys(params).length>24)fail(`${path}.params`,'パラメータは24個までです');
    for(const [k,v]of Object.entries(params)){id(k,`${path}.params.${k}`);num(v,`${path}.params.${k}`,-10000,10000);}
    const emitters=arr(p.emitters,`${path}.emitters`,1,16).map((e,j)=>{
      const ep=`${path}.emitters[${j}]`;
      keys(e,['every','delay','times','count','angle','spread','aim','speed','accel','turn','size','hitRadius','life','color','shape','offsetX','offsetY','on'],ep);
      const out={path:ep,every:num(e.every??0.5,`${ep}.every`,0.025,60),delay:num(e.delay??0,`${ep}.delay`,0,120),times:num(e.times??100000,`${ep}.times`,1,100000),aim:e.aim??'fixed',color:color(e.color??'pink',`${ep}.color`),shape:e.shape??'orb'};
      if(!Number.isInteger(out.times))fail(`${ep}.times`,'整数が必要です');
      if(!['fixed','player'].includes(out.aim))fail(`${ep}.aim`,'fixed または player を指定してください');
      if(!Object.hasOwn(SHAPES,out.shape))fail(`${ep}.shape`,'orb / rice / diamond / star / petal を指定してください');
      const defaults={count:12,angle:0,spread:360,speed:100,accel:0,turn:0,size:8,hitRadius:2.8,life:10,offsetX:0,offsetY:0};
      for(const [k,v]of Object.entries(defaults))out[k]=expr(e[k]??v,`${ep}.${k}`,Object.keys(params));
      if(e.on!==undefined){keys(e.on,['after','fire','vanish'],`${ep}.on`);out.on={after:num(e.on.after,`${ep}.on.after`,0.05,60),fire:id(e.on.fire,`${ep}.on.fire`),vanish:e.on.vanish??true};if(typeof out.on.vanish!=='boolean')fail(`${ep}.on.vanish`,'true または false を指定してください');}
      return out;
    });
    patterns[key]={id:key,name:p.name===undefined?key:str(p.name,`${path}.name`,120),description:p.description===undefined?'':str(p.description,`${path}.description`,300),params,emitters};
  }
  // Reject recursive spawning graphs at load time, before a single bullet is made.
  const depths=new Map(),visiting=new Set();
  function visit(key){
    if(!Object.hasOwn(patterns,key))fail('patterns',`参照先がありません: ${key}`);
    if(visiting.has(key))fail('patterns',`分裂パターンが循環しています: ${key}`);
    if(depths.has(key))return depths.get(key);
    visiting.add(key);let height=0;
    for(const e of patterns[key].emitters)if(e.on)height=Math.max(height,1+visit(e.on.fire));
    visiting.delete(key);if(height>3)fail('patterns','分裂は3段までです');depths.set(key,height);return height;
  }
  for(const k of Object.keys(patterns))visit(k);
  function refs(list,p){return arr(list,p,0,16).map((r,i)=>{
    const rp=`${p}[${i}]`;if(typeof r==='string')r={use:r};keys(r,['use','with'],rp);
    if(!Object.hasOwn(patterns,r.use))fail(rp,`参照先の弾幕がありません: ${r.use}`);const overrides=r.with??{};obj(overrides,`${rp}.with`);
    for(const[k,v]of Object.entries(overrides)){if(!Object.hasOwn(patterns[r.use].params,k))fail(`${rp}.with.${k}`,'定義されていないパラメータです');num(v,`${rp}.with.${k}`,-10000,10000);}
    return {use:r.use,with:overrides};
  });}
  const enemies={};obj(doc.enemies??{},'enemies');
  for(const[key,e]of Object.entries(doc.enemies??{})){
    const p=`enemies.${key}`;id(key,p);keys(e,['hp','radius','score','color','patterns'],p);
    enemies[key]={hp:num(e.hp??30,`${p}.hp`,1,100000),radius:num(e.radius??16,`${p}.radius`,4,40),score:num(e.score??500,`${p}.score`,0,100000),color:color(e.color??'pink',`${p}.color`),patterns:refs(e.patterns??[],`${p}.patterns`)};
  }
  const bosses={};obj(doc.bosses??{},'bosses');
  for(const[key,b]of Object.entries(doc.bosses??{})){
    const p=`bosses.${key}`;id(key,p);keys(b,['name','title','color','move','phases'],p);
    const move=b.move??{x:'240 + 80 * sin(t * 0.7)',y:'118 + 15 * sin(t * 0.5)'};keys(move,['x','y'],`${p}.move`);
    bosses[key]={name:b.name===undefined?key:str(b.name,`${p}.name`,100),title:b.title===undefined?'':str(b.title,`${p}.title`,120),color:color(b.color??'violet',`${p}.color`),move:{x:expr(move.x??240,`${p}.move.x`),y:expr(move.y??118,`${p}.move.y`)},phases:arr(b.phases,`${p}.phases`,1,16).map((s,i)=>{
      const sp=`${p}.phases[${i}]`;keys(s,['name','hp','duration','patterns'],sp);return{name:str(s.name,`${sp}.name`,120),hp:num(s.hp??1200,`${sp}.hp`,1,100000),duration:num(s.duration??30,`${sp}.duration`,1,180),patterns:refs(s.patterns,`${sp}.patterns`)};
    })};
  }
  const commands=[];
  function story(steps,p,level=0){
    if(level>4)fail(p,'repeatの入れ子は4段までです');
    for(const[sIndex,s]of arr(steps,p,1,400).entries()){
      const sp=`${p}[${sIndex}]`;obj(s,sp);
      if(s.repeat!==undefined){keys(s,['repeat','steps'],sp);num(s.repeat,`${sp}.repeat`,1,30);if(!Number.isInteger(s.repeat))fail(sp,'repeatは整数にしてください');for(let j=0;j<s.repeat;j++)story(s.steps,`${sp}.steps`,level+1);continue;}
      if(Object.keys(s).length!==1)fail(sp,'1行につきコマンドは1種類です');const type=Object.keys(s)[0],v=s[type];let data=v;
      if(type==='wait')num(v,sp,0,180);
      else if(type==='dialogue'){data=arr(v,sp,1,60).map((d,i)=>{keys(d,['speaker','text'],`${sp}[${i}]`);return {speaker:str(d.speaker,`${sp}[${i}].speaker`,60),text:str(d.text,`${sp}[${i}].text`,1500).replace(/\\n/g,'\n')};});}
      else if(type==='title'){keys(v,['text','subtitle','duration'],sp);data={text:str(v.text,`${sp}.text`,100),subtitle:v.subtitle??'',duration:num(v.duration??2.5,`${sp}.duration`,0.5,15)};if(typeof data.subtitle!=='string')fail(sp,'subtitleは文字列です');}
      else if(type==='wave'){
        keys(v,['enemy','count','interval','x','y','vx','vy'],sp);if(!Object.hasOwn(enemies,v.enemy))fail(sp,`敵がありません: ${v.enemy}`);
        data={enemy:v.enemy,count:num(v.count??1,`${sp}.count`,1,100),interval:num(v.interval??0.5,`${sp}.interval`,0.05,20)};if(!Number.isInteger(data.count))fail(sp,'countは整数です');
        for(const[k,d]of Object.entries({x:240,y:-25,vx:0,vy:60}))data[k]=expr(v[k]??d,`${sp}.${k}`);
      }else if(type==='boss'){if(!Object.hasOwn(bosses,v))fail(sp,`ボスがありません: ${v}`);}
      else if(type==='label'||type==='goto')id(v,sp);
      else if(type==='clear'||type==='end'||type==='wait_clear'){if(v!==true)fail(sp,'true を指定してください');}
      else if(type==='choice'){
        keys(v,['prompt','options'],sp);data={prompt:str(v.prompt,`${sp}.prompt`,300),options:arr(v.options,`${sp}.options`,2,6).map((o,i)=>{keys(o,['text','goto'],`${sp}.options[${i}]`);return{text:str(o.text,sp,120),goto:id(o.goto,sp)};})};
      }else fail(sp,`未定義のコマンド: ${type}`);
      commands.push({type,data});if(commands.length>1500)fail('story','展開後のコマンド数は1500件までです');
    }
  }
  story(doc.story,'story');const labels={};commands.forEach((c,i)=>{if(c.type==='label'){if(Object.hasOwn(labels,c.data))fail('story',`ラベルが重複: ${c.data}`);labels[c.data]=i;}});
  commands.forEach(c=>{const refs=c.type==='goto'?[c.data]:c.type==='choice'?c.data.options.map(o=>o.goto):[];for(const l of refs)if(!Object.hasOwn(labels,l))fail('story',`ラベルがありません: ${l}`);});
  return {meta:{title:'月影異聞',subtitle:'月が隠した、もうひとつの夜。',stage:'花の降る参道',seed:7319,...meta},player,feel,patterns,enemies,bosses,commands,labels,source};
}

export {COLORS,SHAPES,color,parseProject};
