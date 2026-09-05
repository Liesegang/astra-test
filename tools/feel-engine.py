from pathlib import Path
root=Path.cwd()
def edit(path,old,new):
    p=root/path;s=p.read_text();assert old in s,f'Missing anchor: {path}: {old[:80]}';p.write_text(s.replace(old,new,1))
edit('src/config.mjs',"['version','meta','player','patterns','enemies','bosses','story']","['version','meta','player','feel','patterns','enemies','bosses','story']")
edit('src/config.mjs',"  const srcPatterns=obj(doc.patterns,'patterns');","""  // Game-feel values are optional and bounded; old projects remain valid.
  const feel=Object.assign({shotInterval:.09,hitFlash:.065,bossStop:.12,enemyTell:.4,bombClear:.65,pickupRadius:80,focusPickupRadius:130,autoCollectY:180,grazeStep:25,grazeBonus:1500},doc.feel);
  const ranges={shotInterval:[.045,.3],hitFlash:[0,.15],bossStop:[0,.25],enemyTell:[0,1.5],bombClear:[0,2],pickupRadius:[18,200],focusPickupRadius:[18,240],autoCollectY:[0,300],grazeStep:[1,200],grazeBonus:[0,10000]};
  keys(feel,Object.keys(ranges),'feel');
  for(const [k,[min,max]] of Object.entries(ranges))num(feel[k],`feel.${k}`,min,max);
  if(!Number.isInteger(feel.grazeStep))fail('feel.grazeStep','整数を指定してください');
  const srcPatterns=obj(doc.patterns,'patterns');""")
edit('src/config.mjs','player,patterns,enemies,bosses,commands,labels,source','player,feel,patterns,enemies,bosses,commands,labels,source')
edit('src/engine.mjs',"this.error=null;this.reset('title');","this.error=null;this.seenDialogue=new Set();this.reducedEffects=false;this.reset('title');")
edit('src/engine.mjs','    const c=this.config.player;',"""    const c=this.config.player;
    this.notice=null;this.stopRemaining=0;this.bombClearRemaining=0;this.bombOrigin=null;this.muzzle=0;this.rings=[];this.checkpoint=null;this.retrying=false;this.feedback={hits:0,kills:0,collections:0,powerups:0};""")
edit('src/engine.mjs',"setConfig(config){this.config=config;this.reset('title');}","setConfig(config){this.config=config;this.seenDialogue.clear();this.reset('title');}")
edit('src/engine.mjs','if(this.dialogueIndex>=this.dialogue.length){this.dialogue=null;','if(this.dialogueIndex>=this.dialogue.length){this.seenDialogue.add(JSON.stringify(this.dialogue));this.dialogue=null;')
edit('src/engine.mjs','  choose(index){',"""  skipDialogue(){if(!this.dialogue||this.paused)return;this.dialogueIndex=this.dialogue.length-1;this.advance();}
  retry(){
    if(this.mode==='preview'||this.failedMode==='preview'){this.preview(this.previewPattern??Object.keys(this.config.patterns)[0]);return;}
    const saved=this.checkpoint;
    this.reset('story');this.retrying=true;this.continued=true;
    if(!saved){this.runCommands();return;}
    this.commandIndex=saved.commandIndex;this.time=saved.time;this.score=saved.score;this.power=saved.power;this.captures=saved.captures;this.misses=saved.misses;this.graze=saved.graze;
    this.boss={restoring:true,def:saved.def,name:saved.def.name,x:240,y:95,radius:23,index:saved.index-1,age:0,color:saved.def.color};
    this.nextPhase();this.waiting='boss';this.checkpoint=saved;this.announce('SPELL PRACTICE','このスペルから再挑戦 · 記録対象外');
  }
  announce(title,detail='',duration=1.8){this.notice={title,detail,remaining:duration};}
  ring(x,y,color,size=70,life=.45){this.rings.push({x,y,color,size,life,maxLife:life});if(this.rings.length>32)this.rings.shift();}
  impact(target,shot){
    this.feedback.hits++;target.hitFlash=this.config.feel.hitFlash;
    if((target.sparkUntil??0)>this.time)return;target.sparkUntil=this.time+.045;
    this.audio.event('impact');
    const x=clamp(shot.x,target.x-target.radius,target.x+target.radius),y=target.y+target.radius*.65;
    for(let i=0;i<4;i++)this.effects.push({x,y,vx:(i-1.5)*65,vy:35+i%2*35,life:.12,maxLife:.12,size:2.6,color:'#edf2ff'});
  }
  choose(index){""")
edit('src/engine.mjs',"if(type==='title'){this.banner={...data,until:this.time+data.duration};this.waitUntil=this.time+data.duration;","if(type==='title'){const duration=this.retrying?Math.min(.5,data.duration):data.duration;this.banner={...data,until:this.time+duration};this.waitUntil=this.time+duration;")
edit('src/engine.mjs',"if(type==='dialogue'){this.dialogue=data;","if(type==='dialogue'){if(this.retrying&&this.seenDialogue.has(JSON.stringify(data)))continue;this.dialogue=data;")
edit('src/engine.mjs','    this.clearField(true);b.index++;',"""    const ending=b.index>=0&&!b.restoring;delete b.restoring;
    this.clearField(true);b.index++;
    if(ending){this.stopRemaining=this.config.feel.bossStop;this.player.inv=Math.max(this.player.inv,1);this.ring(b.x,b.y,'#f4d893',180,.8);this.audio.event('break');this.announce(captured?'SPELL CAPTURE':'SPELL CLEAR',captured?'ノーミス・ノーボムで突破':'次の弾幕へ',2.2);}""")
edit('src/engine.mjs',"this.phaseFlash=1.3;this.audio.event('phase');","""this.phaseFlash=1.3;this.audio.event('phase');
    this.checkpoint={def:b.def,index:b.index,commandIndex:this.commandIndex,time:this.time,score:this.score,power:this.power,captures:this.captures,misses:this.misses,graze:this.graze};""")
edit('src/engine.mjs','if(this.bullets.length>=LIMITS.bullets)','if(this.bombClearRemaining>0)return false;if(this.bullets.length>=LIMITS.bullets)')
edit('src/engine.mjs','size:3,color:b.color});}this.bullets=[];','size:3,color:b.color,collect:points});}this.bullets=[];')
edit('src/engine.mjs','this.player.bombs--;this.bombFlash=.7;this.bombRing=1.4;this.player.inv=3.2;','this.player.bombs--;this.bombFlash=.25;this.bombRing=1.1;this.bombOrigin={x:this.player.x,y:this.player.y};this.bombClearRemaining=this.config.feel.bombClear;this.player.inv=3.2;')
edit('src/engine.mjs',"this.clearField(true);this.audio.event('bomb');","this.clearField(true);this.audio.event('bomb');this.ring(this.player.x,this.player.y,'#9ae6ed',220,.75);this.announce('MOONLIGHT BREAK','弾幕を浄化',1.15);")
edit('src/engine.mjs','    this.visualTime+=dt;\n    if(this.dialogue||this.choice)return;',"""    this.visualTime+=dt;
    if(this.notice){this.notice.remaining-=dt;if(this.notice.remaining<=0)this.notice=null;}
    if(this.stopRemaining>0){this.stopRemaining=Math.max(0,this.stopRemaining-dt);return;}
    if(this.dialogue||this.choice)return;""")
edit('src/engine.mjs','this.input=input;','this.input=input;this.bombClearRemaining=Math.max(0,this.bombClearRemaining-dt);this.muzzle=Math.max(0,this.muzzle-dt);')
edit('src/engine.mjs','this.shotClock=.09;','this.shotClock=this.config.feel.shotInterval;')
edit('src/engine.mjs','for(const e of this.enemies){e.age+=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;if(e.y>15&&e.y<540)for(const inst of e.patterns)inst.step(dt,e,this);}',"""for(const e of this.enemies){
      e.age+=dt;e.hitFlash=Math.max(0,(e.hitFlash??0)-dt);e.x+=e.vx*dt;e.y+=e.vy*dt;
      if(e.y>15&&e.y<540){e.tell=(e.tell??0)+dt;if(e.tell>=this.config.feel.enemyTell)for(const inst of e.patterns)inst.step(dt,e,this);}
    }""")
edit('src/engine.mjs','const b=this.boss;b.age+=dt;','const b=this.boss;b.hitFlash=Math.max(0,(b.hitFlash??0)-dt);b.age+=dt;')
edit('src/engine.mjs','if(!b.grazed&&distance<','if(p.inv<=0&&!b.grazed&&distance<')
edit('src/engine.mjs',"this.graze++;this.score+=50;this.audio.event('graze');","""this.graze++;this.score+=50;this.audio.event('graze');
          if(this.graze%this.config.feel.grazeStep===0){this.score+=this.config.feel.grazeBonus;this.audio.event('grazeBonus');this.announce(`${this.graze} GRAZE`,`+${this.config.feel.grazeBonus.toLocaleString()} · かすりボーナス`,1.2);}""")
edit('src/engine.mjs','if(e.hp<=0){this.score+=e.score;this.explode(e.x,e.y,e.color);',"if(e.hp<=0){this.feedback.kills++;this.score+=e.score;this.audio.event('kill');this.ring(e.x,e.y,e.color,65,.36);this.explode(e.x,e.y,e.color);")
edit('src/engine.mjs','for(const e of this.effects){e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;}',"""for(const r of this.rings)r.life-=dt;this.rings=this.rings.filter(r=>r.life>0);
    for(const e of this.effects){e.life-=dt;if(e.collect){const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);const f=Math.min(1,dt*7);e.x+=dx*f;e.y+=dy*f;if(d<12)e.life=0;}else{e.x+=e.vx*dt;e.y+=e.vy*dt;}}""")
p=root/'src/engine.mjs';a=p.read_text();start=a.index('  shoot(){');end=a.index('  updateShots(dt){',start)
a=a[:start]+"""  shoot(){
    const p=this.player,tier=Math.min(4,Math.floor(this.power));this.muzzle=.055;
    for(let pair=0;pair<tier;pair++)for(const side of [-1,1]){
      const spread=p.focus?[.018,.045,.075,.10][pair]:[.035,.12,.22,.32][pair];
      const angle=side*spread;
      this.shots.push({x:p.x+side*(6+pair*3),y:p.y-18,vx:Math.sin(angle)*850,vy:-Math.cos(angle)*850,damage:this.config.player.damage});
    }
    this.audio.event('shot');
  }
"""+a[end:];p.write_text(a)
edit('src/engine.mjs','e.hp-=s.damage;hit=true;','e.hp-=s.damage;this.impact(e,s);hit=true;')
edit('src/engine.mjs','b.hp-=s.damage;hit=true;','b.hp-=s.damage;this.impact(b,s);hit=true;')
a=p.read_text();start=a.index('  updateItems(dt){');end=a.index('  snapshot(){',start)
a=a[:start]+"""  updateItems(dt){
    const p=this.player,f=this.config.feel;
    for(const item of this.items){
      item.age+=dt;const dx=p.x-item.x,dy=p.y-item.y,d=Math.hypot(dx,dy);
      item.magnet ||= p.y<f.autoCollectY||d<(p.focus?f.focusPickupRadius:f.pickupRadius);
      if(item.magnet){const step=Math.min(d,(330+item.age*55)*dt);item.x+=dx/Math.max(d,1)*step;item.y+=dy/Math.max(d,1)*step;}else item.y+=55*dt;
      if(Math.hypot(p.x-item.x,p.y-item.y)<18){
        item.dead=true;this.feedback.collections++;this.score+=item.type==='power'?(this.power>=4?1000:200):1000;
        const oldTier=Math.floor(this.power);
        if(item.type==='power')this.power=Math.min(4,this.power+.25);
        if(Math.floor(this.power)>oldTier){this.feedback.powerups++;this.audio.event('powerup');this.announce(this.power>=4?'FULL POWER':'POWER UP',`${Math.floor(this.power)*2}方向ショット`,1.5);this.ring(p.x,p.y,'#9ae6ed',85,.4);}else this.audio.event('item');
      }
    }
    this.items=this.items.filter(i=>!i.dead&&i.y<680&&i.age<18);
  }
"""+a[end:];p.write_text(a)
edit('src/engine.mjs','return {mode:this.mode,paused',"return {version:'1.1.0',notice:this.notice,continued:this.continued,retrying:this.retrying,retryPhase:this.checkpoint?.index??null,stopRemaining:this.stopRemaining,bombClearRemaining:this.bombClearRemaining,feedback:{...this.feedback},player:{x:p.x,y:p.y,focus:p.focus,inv:p.inv},shots:this.shots.length,items:this.items.length,mode:this.mode,paused")
