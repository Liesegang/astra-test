/** Original procedural soundtrack; no downloaded music or audio assets. */
class AudioEngine {
  constructor(){this.ctx=null;this.enabled=false;this.master=null;this.noteIndex=0;this.nextNote=0;this.lastShot=0;}
  async unlock(){
    if(!this.enabled)return;
    try{if(!this.ctx){const A=globalThis.AudioContext||globalThis.webkitAudioContext;if(!A)return;this.ctx=new A();this.master=this.ctx.createGain();this.master.gain.value=.2;this.master.connect(this.ctx.destination);}if(this.ctx.state==='suspended')await this.ctx.resume();}catch{this.enabled=false;}
  }
  setEnabled(on){this.enabled=on;if(this.master)this.master.gain.setTargetAtTime(on?.2:0,this.ctx.currentTime,.05);if(on)this.unlock();}
  tone(hz,duration=.15,volume=.08,type='sine',delay=0,endHz=hz){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const t=this.ctx.currentTime+delay,osc=this.ctx.createOscillator(),g=this.ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(hz,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,endHz),t+duration);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);
    osc.connect(g);g.connect(this.master);osc.start(t);osc.stop(t+duration+.02);osc.onended=()=>{osc.disconnect();g.disconnect();};
  }
  event(name){
    if(name==='shot'){if(this.ctx&&this.ctx.currentTime-this.lastShot>.13){this.lastShot=this.ctx.currentTime;this.tone(980,.045,.025,'triangle',0,760);}}
    if(name==='graze')this.tone(2000,.04,.025);
    if(name==='hit'){this.tone(190,.3,.16,'sawtooth',0,40);}
    if(name==='bomb'){[220,330,440,660].forEach((f,i)=>this.tone(f,.9,.12,'sine',i*.045,f*1.5));}
    if(name==='phase'){[440,523.25,659.25,880].forEach((f,i)=>this.tone(f,.7,.09,'triangle',i*.09));}
    if(name==='item')this.tone(1300,.07,.025);
  }
  tick(active){
    if(!active||!this.enabled||!this.ctx||this.ctx.state!=='running'){this.nextNote=0;return;}
    const now=this.ctx.currentTime;if(!this.nextNote||this.nextNote<now-.5)this.nextNote=now+.03;
    const scale=[69,72,76,79,81,79,76,72,67,72,74,79,76,74,72,67,65,69,72,76,77,76,72,69,64,67,71,74,76,74,71,67];
    while(this.nextNote<now+.16){const k=this.noteIndex++,m=scale[k%scale.length],delay=this.nextNote-now;
      this.tone(440*2**((m-69)/12),.55,.07,'triangle',delay);
      if(k%4===0)this.tone(440*2**((scale[(k+4)%scale.length]-24-69)/12),.95,.08,'sine',delay);
      this.nextNote+=.19;
    }
  }
}

export {AudioEngine};
