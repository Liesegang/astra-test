from pathlib import Path
root=Path.cwd()
def edit(path,old,new):
    p=root/path;s=p.read_text();assert old in s,f'Missing anchor: {path}: {old[:80]}';p.write_text(s.replace(old,new,1))
(root/'src/audio.mjs').write_text(r'''/** Procedural audio. Quiet rapid feedback leaves headroom for rare, important events. */
class AudioEngine {
  constructor(){this.ctx=null;this.enabled=false;this.master=null;this.noteIndex=0;this.nextNote=0;this.lastEvent={};this.voices=0;}
  async unlock(){
    if(!this.enabled)return;
    try{
      if(!this.ctx){
        const A=globalThis.AudioContext||globalThis.webkitAudioContext;if(!A)return;
        this.ctx=new A({latencyHint:'interactive'});this.master=this.ctx.createGain();this.master.gain.value=.32;
        this.limiter=this.ctx.createDynamicsCompressor();this.limiter.threshold.value=-14;this.limiter.knee.value=12;this.limiter.ratio.value=8;this.limiter.attack.value=.003;this.limiter.release.value=.12;
        this.master.connect(this.limiter);this.limiter.connect(this.ctx.destination);
      }
      if(this.ctx.state==='suspended')await this.ctx.resume();
    }catch{this.enabled=false;}
  }
  setEnabled(on){this.enabled=!!on;if(this.master)this.master.gain.setTargetAtTime(on?.32:0,this.ctx.currentTime,.025);if(on)this.unlock();}
  tone(hz,duration=.15,volume=.08,type='sine',delay=0,endHz=hz){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running'||this.voices>=36)return;
    const t=this.ctx.currentTime+Math.max(0,delay),osc=this.ctx.createOscillator(),g=this.ctx.createGain();this.voices++;
    osc.type=type;osc.frequency.setValueAtTime(hz,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,endHz),t+duration);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+Math.min(.004,duration*.2));g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(g);g.connect(this.master);osc.onended=()=>{this.voices--;osc.disconnect();g.disconnect();};osc.start(t);osc.stop(t+duration+.02);
  }
  event(name){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const now=this.ctx.currentTime,interval={shot:.105,impact:.055,kill:.045,item:.045,graze:.065,break:.1}[name]??.1;
    if(now-(this.lastEvent[name]??-Infinity)<interval)return;this.lastEvent[name]=now;
    switch(name){
      case 'shot':this.tone(880,.035,.019,'triangle',0,540);break;
      case 'impact':this.tone(620,.045,.055,'triangle',0,180);break;
      case 'kill':this.tone(140,.16,.18,'triangle',0,42);this.tone(1200,.085,.075,'sine',0,380);break;
      case 'graze':this.tone(1720,.045,.035,'sine',0,2400);break;
      case 'item':this.tone(1150,.075,.04,'sine',0,1650);break;
      case 'hit':this.tone(180,.28,.20,'sawtooth',0,35);break;
      case 'bomb':this.tone(90,.65,.23,'triangle',0,30);[330,440,660].forEach((f,i)=>this.tone(f,.52,.095,'sine',i*.035,f*1.3));break;
      case 'break':this.tone(100,.5,.22,'triangle',0,28);[523,659,784,1047].forEach((f,i)=>this.tone(f,.4,.075,'sine',i*.055));break;
      case 'phase':[440,523,659,880].forEach((f,i)=>this.tone(f,.42,.055,'triangle',i*.09));break;
      case 'powerup':case 'grazeBonus':[659,784,1047].forEach((f,i)=>this.tone(f,.21,.08,'sine',i*.055));break;
    }
  }
  tick(active){
    if(!active||!this.enabled||!this.ctx||this.ctx.state!=='running'){this.nextNote=0;return;}
    const now=this.ctx.currentTime;if(!this.nextNote||this.nextNote<now-.5)this.nextNote=now+.03;
    const scale=[69,72,76,79,81,79,76,72,67,72,74,79,76,74,72,67,65,69,72,76,77,76,72,69,64,67,71,74,76,74,71,67];
    while(this.nextNote<now+.16){const k=this.noteIndex++,m=scale[k%scale.length],delay=this.nextNote-now;
      this.tone(440*2**((m-69)/12),.42,.044,'triangle',delay);
      if(k%4===0)this.tone(440*2**((scale[(k+4)%scale.length]-24-69)/12),.8,.055,'sine',delay);
      this.nextNote+=.19;
    }
  }
}
export {AudioEngine};
''')
edit('src/renderer.mjs','this.point(boss.x,boss.y,61,boss.color,7);',"this.point(boss.x,boss.y,61,boss.hitFlash>0&&!game.reducedEffects?'#edf2ff':boss.color,7);if(boss.hitFlash>0)this.point(boss.x,boss.y+22,18,'#edf2ff',3,0,.75);")
edit('src/renderer.mjs','for(const e of game.enemies)this.point(e.x,e.y,e.radius*2.6,e.color,6,Math.sin(e.age*7)*.15);',"""for(const e of game.enemies){
      if(e.y>15&&(e.tell??0)<game.config.feel.enemyTell){const progress=(e.tell??0)/Math.max(.001,game.config.feel.enemyTell);this.point(e.x,e.y,65-progress*25,e.color,8,0,.35+progress*.25);}
      this.point(e.x,e.y,e.radius*2.6,e.hitFlash>0&&!game.reducedEffects?'#edf2ff':e.color,6,Math.sin(e.age*7)*.15);
    }""")
edit('src/renderer.mjs','const p=game.player;',"""// Transient feedback is BELOW threats, never painted over incoming bullets.
    for(let i=0;i<game.effects.length;i++){const e=game.effects[i];if(game.reducedEffects&&i%4)continue;this.point(e.x,e.y,e.size*2,e.color,e.collect?2:9,0,Math.max(0,e.life/e.maxLife)*.8);}
    for(const r of game.rings){const progress=1-r.life/r.maxLife;this.point(r.x,r.y,12+progress*r.size,r.color,8,0,(1-progress)*(game.reducedEffects?.16:.5));}
    const p=game.player;
    if(game.muzzle>0&&!game.reducedEffects)this.point(p.x,p.y-22,18,'#b9f8ef',3,0,.55);""")
edit('src/renderer.mjs','    for(const e of game.effects)this.point(e.x,e.y,e.size*2,e.color,9,0,Math.max(0,e.life/e.maxLife));\n','')
edit('src/renderer.mjs',"if(p.focus||game.mode==='preview')","if(p.focus||game.mode==='preview'||game.mode==='story')")
edit('src/renderer.mjs','if(game.bombRing>0){const rad=(1.4-game.bombRing)*430;','if(game.bombRing>0&&!game.reducedEffects){const origin=game.bombOrigin??p,rad=(1.1-game.bombRing)*530;')
edit('src/renderer.mjs',"this.point(p.x+Math.cos(a)*rad,p.y+Math.sin(a)*rad,10,'#d7e7ff',9,0,game.bombRing/1.4);","this.point(origin.x+Math.cos(a)*rad,origin.y+Math.sin(a)*rad,8,'#d7e7ff',9,0,game.bombRing/1.1*.6);")
edit('src/main.mjs','<div class="hp-track"><div class="hp-value"','<div class="hp-track"><div class="hp-chip" id="hp-chip"></div><div class="hp-value"')
edit('src/main.mjs','<span id="dialogue-count"></span><button','<span id="dialogue-count"></span><button class="dialogue-skip" id="dialogue-skip">会話をスキップ</button><button')
edit('src/main.mjs','    <div class="bomb-flash" id="bomb-flash"></div>','    <div class="feel-notice" id="feel-notice" role="status" hidden><strong id="notice-title"></strong><span id="notice-detail"></span></div>\n    <div class="bomb-flash" id="bomb-flash"></div>')
edit('src/main.mjs','<div class="game-bottom"><span','<div class="quick-hud" id="quick-hud"><span id="quick-lives"></span><span id="quick-bombs"></span><span id="quick-score"></span></div>\n  <div class="game-bottom"><span')
edit('src/main.mjs','  <div class="controls"><div','  <label class="check reduce-control"><input type="checkbox" id="reduced-effects"> 演出を控えめに</label>\n  <p class="feel-guide">Shiftでアイテムを吸引 · Rで即リトライ<br>ボス戦では、同じスペルから練習できます。</p>\n  <div class="controls"><div')
edit('src/main.mjs','const audio=new AudioEngine();const game=new Game(config,audio);let renderer;',"""const audio=new AudioEngine();audio.enabled=readStored('moonlit.sound.v1','on')==='on';
const game=new Game(config,audio);game.reducedEffects=readStored('moonlit.effects.v1',matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':'full')==='reduced';
$('#reduced-effects').checked=game.reducedEffects;document.body.classList.toggle('reduced-effects',game.reducedEffects);let renderer;""")
edit('src/main.mjs','moonlit.highscore.v1','moonlit.highscore.v2')
edit('src/main.mjs','function goHome(){',"""function retryRun(){
  try{audio.unlock();releaseInput();game.retry();renderHUD();$('#game').focus({preventScroll:true});}catch(e){runtimeError(e);}
}
function goHome(){""")
edit('src/main.mjs'," const s=game.snapshot();text('#score'",""" const s=game.snapshot();
 text('#quick-lives',`残機 ${s.lives}`);text('#quick-bombs',`ボム ${s.bombs}`);text('#quick-score',String(Math.floor(s.score)).padStart(9,'0'));
 $('#game-frame').classList.toggle('practice-run',s.continued);
 text('#rank-label',game.difficulty.toUpperCase());
 const retryLabel=s.retryPhase===null?'再挑戦 · R':'このスペルから · R';text('#retry',retryLabel);text('#pause-retry',retryLabel);text('#restart-side',retryLabel);
 show($('#feel-notice'),!!s.notice&&!s.dialogue&&!s.choice&&!s.paused&&['story','preview'].includes(s.mode));
 if(s.notice){text('#notice-title',s.notice.title);text('#notice-detail',s.notice.detail);$('#feel-notice').style.opacity=String(Math.min(1,s.notice.remaining*4));}
 document.body.classList.toggle('playing',s.mode==='story');
 text('#score'""")
edit('src/main.mjs',"text('#rank-label',game.difficulty.toUpperCase());text('#pause-label'","text('#rank-label',s.continued?'PRACTICE · 記録対象外':game.difficulty.toUpperCase());text('#pause-label'")
edit('src/main.mjs',"$('#hp-value').style.transform=`scaleX(${s.boss.hp})`;","$('#hp-value').style.transform=`scaleX(${s.boss.hp})`;$('#hp-chip').style.transform=`scaleX(${s.boss.hp})`;")
edit('src/main.mjs','String(game.bombFlash*.32)','String(game.reducedEffects?0:game.bombFlash*.32)')
edit('src/main.mjs',"if(s.score>highScore){highScore=s.score;store('moonlit.highscore.v1',highScore);}","if(!s.continued&&s.mode!=='preview'&&game.failedMode!=='preview'&&s.score>highScore){highScore=s.score;store('moonlit.highscore.v2',highScore);}")
edit('src/main.mjs',"$('#start').onclick=begin;$('#retry').onclick=begin;$('#pause-retry').onclick=begin;$('#restart-side').onclick=begin;","$('#start').onclick=begin;$('#retry').onclick=retryRun;$('#pause-retry').onclick=retryRun;$('#restart-side').onclick=retryRun;")
edit('src/main.mjs',"$('#dialogue-next').onclick=","$('#dialogue-skip').onclick=()=>{try{game.skipDialogue();renderHUD();}catch(e){runtimeError(e);}};\n$('#reduced-effects').onchange=e=>{game.reducedEffects=e.target.checked;store('moonlit.effects.v1',game.reducedEffects?'reduced':'full');document.body.classList.toggle('reduced-effects',game.reducedEffects);};\n$('#dialogue-next').onclick=")
edit('src/main.mjs',"$('#sound').onclick=()=>{audio.setEnabled(!audio.enabled);",'function soundUI(){')
edit('src/main.mjs',"audio.enabled?'サウンドを無効にする':'サウンドを有効にする');};","audio.enabled?'サウンドを無効にする':'サウンドを有効にする');$('#sound').setAttribute('aria-pressed',String(audio.enabled));}\n$('#sound').onclick=()=>{audio.setEnabled(!audio.enabled);store('moonlit.sound.v1',audio.enabled?'on':'off');soundUI();};soundUI();")
edit('src/main.mjs',"'Enter','Escape','KeyP'];","'Enter','Escape','KeyP','KeyR'];")
edit('src/main.mjs',"  else if(k==='KeyX')","  else if(k==='KeyR'&&game.mode!=='title')retryRun();\n  else if(k==='KeyX')")
p=root/'src/style.css';p.write_text(p.read_text()+r'''
/* Moment-to-moment feedback: outside the dodge corridor. */
.hp-track{position:relative;overflow:hidden}.hp-value{position:relative;z-index:1;transition:transform .08s linear}.hp-chip{position:absolute;inset:0;background:#f4d893;transform-origin:left;transition:transform .38s .09s ease-out}
.feel-notice{position:absolute;top:20%;left:12px;right:12px;display:flex;align-items:center;flex-direction:column;gap:5px;pointer-events:none;text-shadow:0 2px 10px #080917;z-index:3}
.feel-notice strong{font:600 19px/1.3 var(--mono);letter-spacing:.14em;color:#f4d893}.feel-notice span{font:11px/1.6 var(--sans);color:#ece4ee}
.dialogue-skip{margin-left:auto;margin-right:12px;background:none;color:#b7aabe;font:10px/1.5 var(--sans);padding:8px 2px;text-decoration:underline;text-underline-offset:3px}
.quick-hud{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 1px 0;font:11px/1.5 var(--mono);font-variant-numeric:tabular-nums;color:#cbbdd5}
#quick-lives{color:#f2a4cf}#quick-bombs{color:#9ae6ed}#quick-score{margin-left:auto;letter-spacing:.08em}.game-bottom{padding-top:4px}
.playing .game-bottom{display:none}.reduce-control{margin-top:11px;cursor:pointer}.feel-guide{font:10px/1.8 var(--sans);color:#a499ad;margin:9px 0 0}
.reduced-effects *{animation:none!important;transition:none!important}
@media(max-width:760px){.reduce-control{grid-column:1/3;grid-row:4;justify-content:flex-start}.feel-guide{grid-column:1/3;margin-top:9px}.mobile-controls{margin-top:9px}.mobile-controls button{min-height:44px;min-width:56px;font-size:12px}.feel-notice strong{font-size:16px}.feel-notice span{font-size:10px}.quick-hud{font-size:11px}.dialogue-skip{font-size:10px;margin-right:8px}.dialogue-next .key{display:none}}
''')
