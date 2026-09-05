/** Procedural audio. Quiet rapid feedback leaves headroom for rare, important events. */
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
