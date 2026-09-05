import {PatternInstance,LIMITS} from './patterns.mjs';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const WIDTH=480,HEIGHT=640,FIXED_DT=1/120;
function segmentDistanceSq(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?clamp(((px-ax)*dx+(py-ay)*dy)/l,0,1):0;return (px-ax-dx*t)**2+(py-ay-dy*t)**2;}
class Game {
  constructor(config,audio={event(){}}){this.config=config;this.audio=audio;this.rank=1;this.difficulty='normal';this.practice=true;this.autoShot=true;this.speedScale=1;this.error=null;this.reset('title');}
  reset(mode='story'){
    const c=this.config.player;
    this.mode=mode;this.continued=false;this.failedMode=null;this.paused=false;this.time=0;this.visualTime=0;this.score=0;this.graze=0;this.captures=0;this.misses=0;this.power=1;this.shotClock=0;
    this.player={x:240,y:545,oldX:240,oldY:545,lives:c.lives,bombs:c.bombs,inv:2,focus:false};
    this.bullets=[];this.enemies=[];this.shots=[];this.items=[];this.effects=[];this.children=[];this.waves=[];
    this.boss=null;this.previewOwner=null;this.previewPattern=null;this.commandIndex=0;this.waitUntil=0;this.waiting=null;
    this.dialogue=null;this.dialogueIndex=0;this.choice=null;this.banner=null;this.bombFlash=0;this.bombRing=0;this.phaseFlash=0;this.error=null;this.seed=this.config.meta.seed|0;this.capHit=false;this.input={};
    if(mode==='title')this.setupPreview(Object.keys(this.config.patterns)[0]);
  }
  setConfig(config){this.config=config;this.reset('title');}
  start(difficulty='normal'){
    this.difficulty=difficulty;this.rank={easy:.78,normal:1,hard:1.23}[difficulty]??1;this.reset('story');this.runCommands();
  }
  preview(id){this.rank={easy:.78,normal:1,hard:1.23}[this.difficulty]??1;this.reset('preview');this.player.inv=0;this.setupPreview(id);}
  setupPreview(id){
    const p=this.config.patterns[id];if(!p)throw new Error(`弾幕がありません: ${id}`);
    this.previewPattern=id;this.previewOwner={x:240,y:145,radius:20,color:'#b9a5f8',patterns:[new PatternInstance(p)]};
  }
  random(){let t=this.seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
  instances(refs){return refs.map(r=>new PatternInstance(this.config.patterns[r.use],r.with));}
  togglePause(){if(!['clear','gameover','title'].includes(this.mode))this.paused=!this.paused;}
  advance(){
    if(!this.dialogue||this.paused)return;
    this.dialogueIndex++;
    if(this.dialogueIndex>=this.dialogue.length){this.dialogue=null;this.dialogueIndex=0;this.waiting=null;this.runCommands();}
  }
  choose(index){if(!this.choice||this.paused)return;const o=this.choice.options[index];if(!o)return;this.commandIndex=this.config.labels[o.goto]+1;this.choice=null;this.waiting=null;this.runCommands();}
  runCommands(){
    if(this.mode!=='story'||this.waiting)return;
    let operations=0;
    while(this.commandIndex<this.config.commands.length){
      if(++operations>300)throw new Error('story: 待機のないループを検出しました。goto の循環に wait を入れてください');
      const {type,data}=this.config.commands[this.commandIndex++];
      if(type==='wait'){this.waitUntil=this.time+data;this.waiting='time';return;}
      if(type==='title'){this.banner={...data,until:this.time+data.duration};this.waitUntil=this.time+data.duration;this.waiting='time';return;}
      if(type==='dialogue'){this.dialogue=data;this.dialogueIndex=0;this.waiting='dialogue';return;}
      if(type==='choice'){this.choice=data;this.waiting='choice';return;}
      if(type==='wave'){this.waves.push({...data,start:this.time,next:0});}
      if(type==='clear'){this.clearField(false);this.enemies=[];this.waves=[];}
      if(type==='wait_clear'){this.waiting='enemies';return;}
      if(type==='boss'){this.clearField(false);this.enemies=[];this.waves=[];const def=this.config.bosses[data];this.boss={def,name:def.name,x:240,y:-55,radius:23,index:-1,age:0,color:def.color};this.nextPhase();this.waiting='boss';return;}
      if(type==='goto')this.commandIndex=this.config.labels[data]+1;
      if(type==='end'){this.finish();return;}
    }
    if(!this.waiting&&this.mode==='story')this.finish();
  }
  nextPhase(){
    const b=this.boss;if(!b)return;
    const captured=b.index>=0&&b.hp<=0&&b.clean;
    if(captured){this.captures++;this.score+=15000+Math.floor(b.remaining*300);}
    this.clearField(true);b.index++;
    if(b.index>=b.def.phases.length){this.score+=25000;this.explode(b.x,b.y,b.color,70);this.boss=null;this.waiting=null;this.player.inv=Math.max(this.player.inv,2);this.runCommands();return;}
    b.phase=b.def.phases[b.index];b.hp=b.phase.hp;b.maxHp=b.hp;b.remaining=b.phase.duration;b.phaseAge=0;b.entry=1.6;b.clean=true;b.patterns=this.instances(b.phase.patterns);this.phaseFlash=1.3;this.audio.event('phase');
  }
  finish(){this.clearField(true);this.enemies=[];this.waves=[];this.score+=this.player.lives*5000;this.mode='clear';}
  addBullet(b){if(this.bullets.length>=LIMITS.bullets){this.capHit=true;return false;}this.bullets.push(b);return true;}
  clearField(points){if(points)this.score+=this.bullets.length*5;for(let i=0;i<this.bullets.length;i+=Math.max(1,Math.floor(this.bullets.length/60))){const b=this.bullets[i];this.effects.push({x:b.x,y:b.y,vx:0,vy:-10,life:.45,maxLife:.45,size:3,color:b.color});}this.bullets=[];this.children=[];}
  explode(x,y,color,count=18){for(let i=0;i<count;i++){const a=this.random()*TAU,s=25+this.random()*110;this.effects.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+this.random()*.5,maxLife:.8,size:2+this.random()*3,color});}}
  bomb(){
    if(this.paused||this.dialogue||this.choice||!['story','preview'].includes(this.mode)||this.player.bombs<=0)return false;
    this.player.bombs--;this.bombFlash=.7;this.bombRing=1.4;this.player.inv=3.2;this.clearField(true);this.audio.event('bomb');
    for(const e of this.enemies)e.hp-=300;if(this.boss){this.boss.hp-=260;this.boss.clean=false;}
    return true;
  }
  hit(){
    if(this.player.inv>0||this.mode==='title'||(this.mode==='preview'&&this.practice))return;
    this.player.lives--;this.misses++;this.player.inv=3;this.player.bombs=this.config.player.bombs;this.power=Math.max(1,this.power-.5);this.audio.event('hit');this.explode(this.player.x,this.player.y,'#f2a4cf',36);this.clearField(false);
    if(this.boss)this.boss.clean=false;
    if(this.player.lives<=0){this.failedMode=this.mode;this.mode='gameover';this.shots=[];}
  }
  continueRun(){if(this.mode!=='gameover')return;this.player.lives=this.config.player.lives;this.player.bombs=this.config.player.bombs;this.player.inv=3;this.score=0;this.mode=this.failedMode??'story';this.continued=true;}
  spawnEnemy(w,i){
    if(this.enemies.length>=LIMITS.enemies){this.capHit=true;return;}
    const c={t:this.time,k:0,i,n:w.count,rank:this.rank,x:0,y:0},def=this.config.enemies[w.enemy];
    this.enemies.push({...def,x:clamp(w.x(c),-100,580),y:clamp(w.y(c),-100,740),vx:clamp(w.vx(c),-300,300),vy:clamp(w.vy(c),-300,300),age:0,patterns:this.instances(def.patterns)});
  }
  step(dt,input={}){
    if(this.paused||this.error||['gameover','clear'].includes(this.mode))return;
    this.visualTime+=dt;
    if(this.dialogue||this.choice)return;
    dt*=this.speedScale;this.time+=dt;this.emissionBudget=LIMITS.bulletsPerTick;this.input=input;
    this.bombFlash=Math.max(0,this.bombFlash-dt);this.bombRing=Math.max(0,this.bombRing-dt);this.phaseFlash=Math.max(0,this.phaseFlash-dt);
    if(this.banner&&this.time>this.banner.until)this.banner=null;
    if(this.waiting==='time'&&this.time>=this.waitUntil){this.waiting=null;this.runCommands();}
    if(this.dialogue||this.choice||this.mode==='clear')return;
    const p=this.player;p.oldX=p.x;p.oldY=p.y;p.focus=!!input.focus;p.inv=Math.max(0,p.inv-dt);
    if(this.mode!=='title'){
      let dx=input.x||0,dy=input.y||0;const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}
      const speed=p.focus?this.config.player.focusSpeed:this.config.player.speed;
      if(input.pointer){p.x=clamp(input.pointer.x,12,468);p.y=clamp(input.pointer.y,20,625);}else{p.x=clamp(p.x+dx*speed*dt,12,468);p.y=clamp(p.y+dy*speed*dt,20,625);}
      this.shotClock-=dt;
      if((this.autoShot||input.shoot)&&this.shotClock<=0){this.shotClock=.09;this.shoot();}
    }
    for(const w of this.waves){while(w.next<w.count&&this.time>=w.start+w.next*w.interval){this.spawnEnemy(w,w.next++);}}
    this.waves=this.waves.filter(w=>w.next<w.count);
    if(this.previewOwner){for(const inst of this.previewOwner.patterns)inst.step(dt,this.previewOwner,this);}
    for(const e of this.enemies){e.age+=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;if(e.y>15&&e.y<540)for(const inst of e.patterns)inst.step(dt,e,this);}
    if(this.boss){
      const b=this.boss;b.age+=dt;b.phaseAge+=dt;b.entry=Math.max(0,b.entry-dt);
      const c={t:b.age,k:0,i:0,n:0,x:b.x,y:b.y,rank:this.rank};
      const tx=clamp(b.def.move.x(c),40,440),ty=clamp(b.def.move.y(c),45,290);b.x+=(tx-b.x)*Math.min(1,dt*3);b.y+=(ty-b.y)*Math.min(1,dt*3);
      if(b.entry<=0){b.remaining-=dt;for(const inst of b.patterns)inst.step(dt,b,this);}
    }
    const childPending=[];const survivors=[];
    for(const b of this.bullets){
      const ox=b.x,oy=b.y;b.age+=dt;b.speed=clamp(b.speed+b.accel*dt,0,650);b.angle+=b.turn*dt;b.x+=Math.cos(b.angle)*b.speed*dt;b.y+=Math.sin(b.angle)*b.speed*dt;
      let vanish=false;
      if(b.on&&!b.triggered&&b.age>=b.on.after){b.triggered=true;if(b.depth<3&&this.children.length+childPending.length<LIMITS.children)childPending.push({x:b.x,y:b.y,age:0,inst:new PatternInstance(this.config.patterns[b.on.fire],{},b.depth+1,true)});vanish=b.on.vanish;}
      if(!vanish&&this.mode!=='title'){
        // Relative swept collision: catches fast bullets and player movement without inflating hitboxes.
        const distance=segmentDistanceSq(0,0,ox-p.oldX,oy-p.oldY,b.x-p.x,b.y-p.y);
        if(p.inv<=0&&distance<(this.config.player.hitRadius+b.radius)**2&&!(this.mode==='preview'&&this.practice)){
          this.hit();return; // clearField() invalidates the active bullet array
        }
        if(!b.grazed&&distance<(this.config.player.hitRadius+b.radius+16)**2){b.grazed=true;this.graze++;this.score+=50;this.audio.event('graze');if(this.effects.length<1000)this.effects.push({x:p.x,y:p.y,vx:(this.random()-.5)*30,vy:-20,life:.3,maxLife:.3,size:2,color:'#f4d893'});}
      }
      if(!vanish&&b.age<b.life&&b.x>-80&&b.x<560&&b.y>-100&&b.y<740)survivors.push(b);
    }
    this.bullets=survivors;
    this.children.push(...childPending);
    for(const c of this.children){c.age+=dt;c.inst.step(dt,c,this);}
    this.children=this.children.filter(c=>!c.inst.finished&&c.age<120);
    this.updateShots(dt);
    const living=[];
    for(const e of this.enemies){
      if(e.hp<=0){this.score+=e.score;this.explode(e.x,e.y,e.color);this.items.push({x:e.x,y:e.y,type:'power',age:0},{x:e.x+12,y:e.y+8,type:'point',age:0});}
      else if(e.age<22&&e.x>-80&&e.x<560&&e.y<720&&e.y>-120)living.push(e);
      if(e.hp>0&&p.inv<=0&&(e.x-p.x)**2+(e.y-p.y)**2<(e.radius+this.config.player.hitRadius)**2)this.hit();
    }
    this.enemies=living;
    if(this.boss){const b=this.boss;if(p.inv<=0&&(b.x-p.x)**2+(b.y-p.y)**2<(b.radius+this.config.player.hitRadius)**2)this.hit();if(b.hp<=0||b.remaining<=0)this.nextPhase();}
    this.updateItems(dt);
    for(const e of this.effects){e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;}this.effects=this.effects.filter(e=>e.life>0).slice(-1400);
    if(this.waiting==='enemies'&&this.enemies.length===0&&this.waves.length===0){this.waiting=null;this.runCommands();}
  }
  shoot(){
    const p=this.player,angles=p.focus?[-.018,.018]:[-.035,.035];
    if(this.power>=2)angles.push(p.focus?-.065:-.16,p.focus?.065:.16);
    angles.forEach((a,i)=>this.shots.push({x:p.x+(i%2?6:-6),y:p.y-18,vx:Math.sin(a)*850,vy:-Math.cos(a)*850,damage:this.config.player.damage}));this.audio.event('shot');
  }
  updateShots(dt){
    const keep=[];
    for(const s of this.shots){const ox=s.x,oy=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;let hit=false;
      for(const e of this.enemies){if(e.hp>0&&segmentDistanceSq(e.x,e.y,ox,oy,s.x,s.y)<(e.radius+3)**2){e.hp-=s.damage;hit=true;break;}}
      if(!hit&&this.boss&&this.boss.entry<=0){const b=this.boss;if(segmentDistanceSq(b.x,b.y,ox,oy,s.x,s.y)<(b.radius+3)**2){b.hp-=s.damage;hit=true;}}
      if(!hit&&s.y>-40)keep.push(s);
    }this.shots=keep.slice(-500);
  }
  updateItems(dt){const p=this.player;for(const item of this.items){item.age+=dt;const dx=p.x-item.x,dy=p.y-item.y,d=Math.hypot(dx,dy);
    if(p.y<180||d<80){const speed=310;item.x+=dx/Math.max(d,1)*speed*dt;item.y+=dy/Math.max(d,1)*speed*dt;}else item.y+=55*dt;
    if(d<18){item.dead=true;this.score+=item.type==='power'?200:1000;if(item.type==='power')this.power=Math.min(4,this.power+.25);this.audio.event('item');}
  }this.items=this.items.filter(i=>!i.dead&&i.y<680&&i.age<18);}
  snapshot(){const b=this.boss,p=this.player;return {mode:this.mode,paused:this.paused,score:this.score,graze:this.graze,power:this.power,lives:p.lives,bombs:p.bombs,bullets:this.bullets.length,captures:this.captures,misses:this.misses,time:this.time,dialogue:this.dialogue?.[this.dialogueIndex]??null,dialogueIndex:this.dialogueIndex,dialogueLength:this.dialogue?.length??0,choice:this.choice,banner:this.banner,boss:b?{name:b.name,title:b.def.title,spell:b.phase.name,hp:Math.max(0,b.hp/b.maxHp),remaining:Math.max(0,b.remaining),index:b.index,total:b.def.phases.length,clean:b.clean}:null,previewPattern:this.previewPattern,error:this.error,capHit:this.capHit};}
}

export {WIDTH,segmentDistanceSq,Game,HEIGHT,FIXED_DT};
