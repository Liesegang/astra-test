const LIMITS=Object.freeze({bullets:12000,enemies:120,emitters:400,bulletsPerTick:1000,children:160});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
/** Each pattern instance owns its own time and shot index. */
class PatternInstance {
  constructor(pattern, overrides={}, depth=0, once=false){
    this.pattern=pattern;this.params={...pattern.params,...overrides};this.age=0;this.depth=depth;
    this.emitters=pattern.emitters.map(def=>({def,next:def.delay,k:0,limit:once?1:def.times}));
  }
  get finished(){return this.emitters.every(e=>e.k>=e.limit);}
  step(dt,owner,game){
    this.age+=dt;
    for(const e of this.emitters){
      let safety=0;
      while(this.age+1e-8>=e.next&&e.k<e.limit&&safety++<6){
        if(game.emissionBudget<=0)break;
        this.fire(e,owner,game);e.k++;e.next+=e.def.every;
      }
    }
  }
  fire(e,owner,game){
    const d=e.def,c={...this.params,t:e.next,k:e.k,i:0,n:0,x:owner.x,y:owner.y,rank:game.rank};
    const count=Math.floor(d.count(c));if(count<1||count>256)throw new Error(`${d.path}.count: 発射弾数は1〜256にしてください（現在 ${count}）`);c.n=count;
    const aimAngle=d.aim==='player'?Math.atan2(game.player.y-owner.y,game.player.x-owner.x)*180/Math.PI:0;
    const spread=clamp(d.spread(c),-360,360),full=Math.abs(spread)>=359.99;
    for(let i=0;i<count&&game.emissionBudget>0;i++){
      c.i=i;const a=(d.angle(c)+aimAngle+(full?i*spread/count:(count===1?0:(i/(count-1)-.5)*spread)))*Math.PI/180;
      const size=clamp(d.size(c),4,32),radius=clamp(d.hitRadius(c),0.5,size*.43);
      const b={x:owner.x+clamp(d.offsetX(c),-800,800),y:owner.y+clamp(d.offsetY(c),-800,800),angle:a,speed:clamp(d.speed(c),0,650),accel:clamp(d.accel(c),-500,500),turn:clamp(d.turn(c),-360,360)*Math.PI/180,size,radius,color:d.color,shape:d.shape,life:clamp(d.life(c),0.1,25),age:0,grazed:false,on:d.on,triggered:false,depth:this.depth};
      game.addBullet(b);game.emissionBudget--;
    }
  }
}

export {LIMITS,PatternInstance};
