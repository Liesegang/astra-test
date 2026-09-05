import {WIDTH,HEIGHT} from './engine.mjs';
import {SHAPES} from './config.mjs';
const VS_BG=`attribute vec2 a_position; varying vec2 uv; void main(){uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
const FS_BG=`precision highp float;
varying vec2 uv; uniform float u_time; uniform float u_boss;
float line(vec2 p,vec2 a,vec2 b,float w){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return 1.-smoothstep(w,w+1.,length(pa-ba*h));}
float box(vec2 p,vec2 c,vec2 b){vec2 d=abs(p-c)-b;return 1.-smoothstep(0.,1.,max(d.x,d.y));}
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
void main(){
 vec2 p=vec2(uv.x*480.,(1.-uv.y)*640.);float time=u_time;
 vec3 col=mix(vec3(.031,.044,.085),vec3(.092,.083,.16),uv.y);
 col+=vec3(.025,.044,.052)*exp(-length((p-vec2(230.,255.))/vec2(270.,180.)));
 // Thin mist, not a luminous overlay: bullets always retain the brightest values.
 float mist=sin(p.y*.022+sin(p.x*.008+time*.07)*1.5)*.5+.5;
 col+=vec3(.016,.021,.031)*pow(mist,5.);
 vec2 m=p-vec2(352.,104.);float moon=1.-smoothstep(39.,40.5,length(m));
 float crater=sin(m.x*.19)*sin(m.y*.23)*.022;col=mix(col,vec3(.47+crater,.53+crater,.65+crater),moon*.58);
 col+=vec3(.06,.07,.12)*exp(-length(m)*.023);
 for(int i=0;i<46;i++){float fi=float(i);vec2 st=vec2(hash(fi+1.)*480.,hash(fi+82.)*460.);float d=length(p-st);float tw=.5+.5*sin(time*.45+fi*3.);col+=vec3(.24,.30,.40)*(1.-smoothstep(.2,1.,d))*(.25+tw*.6);}
 // Distant mountain silhouettes.
 float hill=268.+35.*sin(p.x*.012)+18.*sin(p.x*.03);
 col=mix(col,vec3(.038,.058,.090),smoothstep(hill,hill+2.,p.y)*.75);
 float hill2=355.+32.*sin(p.x*.014+2.)+26.*cos(p.x*.028);
 col=mix(col,vec3(.025,.043,.066),smoothstep(hill2,hill2+2.,p.y)*.65);
 // Lantern-lit shrine gate, receding stone approach.
 float ground=smoothstep(290.,640.,p.y);float halfPath=24.+(p.y-285.)*.28;
 float path=(1.-smoothstep(halfPath,halfPath+1.5,abs(p.x-240.)))*step(300.,p.y);
 col=mix(col,vec3(.065,.070,.105),path*.8);
 float joints=pow(.5+.5*sin(sqrt(max(0.,p.y-296.))*4.-time*.23),30.);
 col+=path*joints*.021;col+=path*line(p,vec2(240.,310.),vec2(240.,640.),.45)*.023;
 float gate=0.;
 gate=max(gate,line(p,vec2(158.,192.),vec2(175.,339.),5.));gate=max(gate,line(p,vec2(322.,192.),vec2(305.,339.),5.));
 gate=max(gate,box(p,vec2(240.,208.),vec2(102.,5.)));gate=max(gate,box(p,vec2(240.,181.),vec2(110.,7.)));
 gate=max(gate,line(p,vec2(130.,181.),vec2(117.,173.),5.));gate=max(gate,line(p,vec2(350.,181.),vec2(363.,173.),5.));
 gate=max(gate,box(p,vec2(240.,192.),vec2(5.,15.)));
 col=mix(col,vec3(.15,.105,.16),gate*.8);
 col+=line(p,vec2(132.,173.),vec2(350.,173.),.5)*vec3(.12,.09,.12);
 // Two low stone lanterns.
 for(int i=0;i<2;i++){float x=i==0?122.:358.;vec2 q=p-vec2(x,395.);
 float stand=box(q,vec2(0.,25.),vec2(5.,20.));stand=max(stand,box(q,vec2(0.,4.),vec2(11.,12.)));
 float roof=step(abs(q.x),max(0.,21.+q.y*1.6))*step(-13.,q.y)*step(q.y,-4.);stand=max(stand,roof);
 col=mix(col,vec3(.067,.075,.105),stand);float light=box(q,vec2(0.,2.),vec2(5.,6.));col+=vec3(.62,.35,.15)*light*.5;
 col+=vec3(.085,.045,.025)*exp(-length(q)*.044);}
 // Cropped branches at the outer edges frame the playfield.
 float branch=0.;branch=max(branch,line(p,vec2(-18.,36.),vec2(101.,122.),3.));branch=max(branch,line(p,vec2(42.,81.),vec2(112.,68.),1.4));
 branch=max(branch,line(p,vec2(64.,95.),vec2(82.,146.),1.3));branch=max(branch,line(p,vec2(508.,296.),vec2(401.,369.),2.4));
 col=mix(col,vec3(.047,.043,.072),branch);
 for(int i=0;i<25;i++){float fi=float(i);vec2 b=vec2(hash(fi+301.)*100.,46.+hash(fi+202.)*93.);float pet=1.-smoothstep(1.8,3.7,length(p-b));col=mix(col,vec3(.28,.16,.25),pet*.38);}
 for(int i=0;i<16;i++){float fi=float(i);vec2 c=vec2(mod(hash(fi+30.)*530.+sin(time*.2+fi)*19.,530.)-25.,mod(hash(fi+67.)*690.+time*(7.+hash(fi)*9.),690.)-25.);vec2 d=p-c;float a=time*.3+fi;d=mat2(cos(a),-sin(a),sin(a),cos(a))*d;float pet=1.-smoothstep(1.5,2.8,length(d*vec2(.65,1.6)));col+=vec3(.22,.12,.19)*pet;}
 col*=1.-.30*pow(length((uv-.5)*vec2(1.2,.8)),1.7);
 gl_FragColor=vec4(col,1.);
}`;
const FS_COPY=`precision mediump float; varying vec2 uv; uniform sampler2D u_texture; void main(){gl_FragColor=texture2D(u_texture,uv);}`;
const VS_SPRITE=`attribute vec2 a_pos;attribute float a_size;attribute float a_angle;attribute vec4 a_color;attribute float a_shape;uniform vec2 u_view;uniform float u_scale;uniform float u_maxPoint;varying vec4 v_color;varying float v_angle;varying float v_shape;
void main(){gl_Position=vec4(a_pos.x/u_view.x*2.-1.,1.-a_pos.y/u_view.y*2.,0.,1.);gl_PointSize=min(a_size*u_scale,u_maxPoint);v_color=a_color;v_angle=a_angle;v_shape=a_shape;}`;
const FS_SPRITE=`precision mediump float;varying vec4 v_color;varying float v_angle;varying float v_shape;
float box(vec2 p,vec2 c,vec2 b){vec2 d=abs(p-c)-b;return 1.-smoothstep(0.,.045,max(d.x,d.y));}
float ellipse(vec2 p,vec2 c,vec2 r){return 1.-smoothstep(.9,1.0,length((p-c)/r));}
void main(){vec2 q=(gl_PointCoord-.5)*2.;float a=v_angle;vec2 r=mat2(cos(a),-sin(a),sin(a),cos(a))*q;float d=length(q),alpha=0.;vec3 rgb=v_color.rgb;float kind=v_shape;
if(kind<.5){float body=1.-smoothstep(.60,.78,d);float core=1.-smoothstep(.08,.40,length(q+vec2(.13,.16)));alpha=max(body,exp(-d*4.)*.22);rgb=mix(rgb,vec3(1.),core*.9);rgb=mix(rgb*.48,rgb,(1.-smoothstep(.58,.79,d)));}
else if(kind<1.5){float e=length(r*vec2(1.,2.0));alpha=1.-smoothstep(.64,.92,e);float core=1.-smoothstep(.15,.6,e);rgb=mix(rgb,vec3(1.),core*.88);}
else if(kind<2.5){float e=abs(r.x)+abs(r.y);alpha=1.-smoothstep(.68,.94,e);rgb=mix(rgb,vec3(1.),(1.-smoothstep(.1,.58,e))*.8);}
else if(kind<3.5){float e=length(q);float ang=atan(q.y,q.x);float edge=.52+.25*cos(ang*5.);alpha=1.-smoothstep(edge,edge+.07,e);rgb=mix(rgb,vec3(1.),(1.-smoothstep(.02,.4,e))*.8);}
else if(kind<4.5){float e=length(r*vec2(1.4,.8));alpha=1.-smoothstep(.62,.9,e);rgb=mix(rgb,vec3(1.),(1.-smoothstep(.15,.5,e))*.6);}
else if(kind<5.5){ // Original tiny robed player, rendered by the WebGL fragment shader.
 alpha=0.;rgb=vec3(0.);float robe=step(abs(q.x),.18+max(0.,q.y)*.52)*step(-.02,q.y)*step(q.y,.77);
 rgb=mix(rgb,vec3(.25,.61,.72),robe);alpha=max(alpha,robe);
 float hem=robe*step(.60,q.y);rgb=mix(rgb,vec3(.76,.90,.94),hem);
 float sleeve=ellipse(q,vec2(-.40,.19),vec2(.22,.17));sleeve=max(sleeve,ellipse(q,vec2(.40,.19),vec2(.22,.17)));rgb=mix(rgb,vec3(.76,.85,.93),sleeve);alpha=max(alpha,sleeve);
 float hair=ellipse(q,vec2(0.,-.32),vec2(.28,.34));rgb=mix(rgb,vec3(.12,.10,.18),hair);alpha=max(alpha,hair);
 float face=ellipse(q,vec2(0.,-.25),vec2(.18,.17));rgb=mix(rgb,vec3(.97,.81,.73),face);alpha=max(alpha,face);
 float bow=ellipse(q,vec2(-.23,-.56),vec2(.16,.09));bow=max(bow,ellipse(q,vec2(.23,-.56),vec2(.16,.09)));rgb=mix(rgb,vec3(.95,.43,.63),bow);alpha=max(alpha,bow);
 float sash=box(q,vec2(0.,.24),vec2(.22,.05));rgb=mix(rgb,vec3(.94,.55,.65),sash);alpha=max(alpha,sash);
 float leg=box(q,vec2(-.1,.82),vec2(.05,.07));leg=max(leg,box(q,vec2(.1,.82),vec2(.05,.07)));rgb=mix(rgb,vec3(.8,.88,.95),leg);alpha=max(alpha,leg);
}
else if(kind<6.5){float wings=ellipse(q,vec2(-.39,0.),vec2(.32,.58));wings=max(wings,ellipse(q,vec2(.39,0.),vec2(.32,.58)));float body=ellipse(q,vec2(0.,0.),vec2(.14,.6));alpha=max(wings*.7,body);rgb=mix(rgb,vec3(1.),body*.9);}
else if(kind<7.5){ // Original lunar guardian with silver hair and layered violet robes.
 float hair=ellipse(q,vec2(0.,-.13),vec2(.43,.69));rgb=vec3(.66,.70,.85);alpha=hair;
 float dress=step(abs(q.x),.18+max(0.,q.y)*.64)*step(-.03,q.y)*step(q.y,.80);rgb=mix(rgb,vec3(.46,.31,.66),dress);alpha=max(alpha,dress);
 float sleeve=ellipse(q,vec2(-.48,.22),vec2(.24,.26));sleeve=max(sleeve,ellipse(q,vec2(.48,.22),vec2(.24,.26)));rgb=mix(rgb,vec3(.67,.56,.85),sleeve);alpha=max(alpha,sleeve);
 float face=ellipse(q,vec2(0.,-.30),vec2(.19,.2));rgb=mix(rgb,vec3(.97,.84,.80),face);
 float fringe=ellipse(q,vec2(-.05,-.51),vec2(.25,.13));rgb=mix(rgb,vec3(.82,.85,.96),fringe);alpha=max(alpha,fringe);
 float crown=box(q,vec2(0.,-.73),vec2(.14,.035));rgb=mix(rgb,vec3(.97,.81,.49),crown);alpha=max(alpha,crown);
 float sash=box(q,vec2(0.,.23),vec2(.24,.055));rgb=mix(rgb,vec3(.96,.74,.66),sash);
}
else if(kind<8.5){alpha=(1.-smoothstep(.83,.92,d))*smoothstep(.73,.80,d);}
else if(kind<9.5){alpha=1.-smoothstep(.10,.9,length(q));rgb=mix(rgb,vec3(1.),(1.-smoothstep(.0,.4,d))*.7);}
else if(kind<10.5){float e=length(q*vec2(4.2,.95));alpha=1.-smoothstep(.55,.9,e);rgb=mix(rgb,vec3(1.),.75);}
else if(kind<11.5){alpha=box(q,vec2(0.),vec2(.60));rgb=mix(rgb,vec3(1.),box(q,vec2(0.),vec2(.23))*.75);}
else{alpha=1.-smoothstep(.6,.95,d);rgb=vec3(1.);}
if(alpha<.008)discard;gl_FragColor=vec4(rgb,alpha*v_color.a);
}`;
class Renderer {
  constructor(canvas){
    this.canvas=canvas;const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});
    if(!gl)throw new Error('WebGLを初期化できません。ブラウザのハードウェアアクセラレーションを確認してください。');
    this.gl=gl;this.bg=this.program(VS_BG,FS_BG);this.copy=this.program(VS_BG,FS_COPY);this.sprite=this.program(VS_SPRITE,FS_SPRITE);
    // A low-resolution background cache avoids running decorative shaders at device DPR.
    this.bgTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.bgTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,240,320,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.bgFbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.bgFbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.bgTexture,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('背景の描画バッファを作成できませんでした');gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    this.bgLastTime=-Infinity;this.copyPos=gl.getAttribLocation(this.copy,'a_position');this.copyTexture=gl.getUniformLocation(this.copy,'u_texture');
    this.bgBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.bgBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    this.spriteBuffer=gl.createBuffer();this.data=new Float32Array(9*18000);this.count=0;this.colors=new Map();
    this.maxPoint=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
    this.bgLocations={pos:gl.getAttribLocation(this.bg,'a_position'),time:gl.getUniformLocation(this.bg,'u_time'),boss:gl.getUniformLocation(this.bg,'u_boss')};
    this.loc={};for(const k of ['a_pos','a_size','a_angle','a_color','a_shape'])this.loc[k]=gl.getAttribLocation(this.sprite,k);
    this.uView=gl.getUniformLocation(this.sprite,'u_view');this.uScale=gl.getUniformLocation(this.sprite,'u_scale');this.uMaxPoint=gl.getUniformLocation(this.sprite,'u_maxPoint');
    this.lost=false;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;canvas.dispatchEvent(new CustomEvent('renderer-error',{detail:'WebGLコンテキストが失われました。ページを再読み込みしてください。'}));});
    this.resize();
  }
  program(v,f){const gl=this.gl;const shaders=[this.shader(gl.VERTEX_SHADER,v),this.shader(gl.FRAGMENT_SHADER,f)],p=gl.createProgram();for(const s of shaders)gl.attachShader(p,s);gl.linkProgram(p);for(const s of shaders)gl.deleteShader(s);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
  shader(type,source){const gl=this.gl,s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const info=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(`WebGL shader: ${info}`);}return s;}
  resize(){const dpr=Math.min(globalThis.devicePixelRatio||1,2),rect=this.canvas.getBoundingClientRect();const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(w&&h&&(this.canvas.width!==w||this.canvas.height!==h)){this.canvas.width=w;this.canvas.height=h;}this.scale=this.canvas.width/WIDTH;}
  point(x,y,size,color,shape=0,angle=0,alpha=1){
    if(this.count>=18000)return;let rgb=this.colors.get(color);if(!rgb){const n=parseInt(color.slice(1),16);rgb=[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];this.colors.set(color,rgb);}
    const offset=this.count++*9;this.data[offset]=x;this.data[offset+1]=y;this.data[offset+2]=size;this.data[offset+3]=angle;
    this.data[offset+4]=rgb[0];this.data[offset+5]=rgb[1];this.data[offset+6]=rgb[2];this.data[offset+7]=alpha;this.data[offset+8]=shape;
  }
  render(game){
    if(this.lost)return;
    const gl=this.gl;this.resize();gl.disable(gl.BLEND);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.bgBuffer);
    if(game.visualTime-this.bgLastTime>=1/20||game.visualTime<this.bgLastTime){
      gl.bindFramebuffer(gl.FRAMEBUFFER,this.bgFbo);gl.viewport(0,0,240,320);gl.useProgram(this.bg);gl.enableVertexAttribArray(this.bgLocations.pos);gl.vertexAttribPointer(this.bgLocations.pos,2,gl.FLOAT,false,0,0);gl.uniform1f(this.bgLocations.time,game.visualTime);gl.uniform1f(this.bgLocations.boss,game.boss?1:0);gl.drawArrays(gl.TRIANGLES,0,3);gl.disableVertexAttribArray(this.bgLocations.pos);this.bgLastTime=game.visualTime;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(this.copy);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.bgTexture);gl.uniform1i(this.copyTexture,0);gl.enableVertexAttribArray(this.copyPos);gl.vertexAttribPointer(this.copyPos,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,3);gl.disableVertexAttribArray(this.copyPos);this.count=0;
    // Cosmetic orbit. Never used for collision.
    const boss=game.boss||game.previewOwner;
    if(boss){
      const t=game.visualTime;this.point(boss.x,boss.y,110,boss.color,8,0,.24);
      for(let i=0;i<12;i++){const a=i*Math.PI/6+t*.3;this.point(boss.x+Math.cos(a)*47,boss.y+Math.sin(a)*47,5,boss.color,2,a,.5);}
      this.point(boss.x,boss.y,61,boss.hitFlash>0&&!game.reducedEffects?'#edf2ff':boss.color,7);if(boss.hitFlash>0)this.point(boss.x,boss.y+22,18,'#edf2ff',3,0,.75);
    }
    for(const e of game.enemies){
      if(e.y>15&&(e.tell??0)<game.config.feel.enemyTell){const progress=(e.tell??0)/Math.max(.001,game.config.feel.enemyTell);this.point(e.x,e.y,65-progress*25,e.color,8,0,.35+progress*.25);}
      this.point(e.x,e.y,e.radius*2.6,e.hitFlash>0&&!game.reducedEffects?'#edf2ff':e.color,6,Math.sin(e.age*7)*.15);
    }
    for(const s of game.shots)this.point(s.x,s.y,25,'#b9f8ef',10,0,.8);
    for(const item of game.items){this.point(item.x,item.y,15,item.type==='power'?'#f5a1cb':'#9ddae9',11,0,1);}
    // Transient feedback is BELOW threats, never painted over incoming bullets.
    for(let i=0;i<game.effects.length;i++){const e=game.effects[i];if(game.reducedEffects&&i%4)continue;this.point(e.x,e.y,e.size*2,e.color,e.collect?2:9,0,Math.max(0,e.life/e.maxLife)*.8);}
    for(const r of game.rings){const progress=1-r.life/r.maxLife;this.point(r.x,r.y,12+progress*r.size,r.color,8,0,(1-progress)*(game.reducedEffects?.16:.5));}
    const p=game.player;
    if(game.muzzle>0&&!game.reducedEffects)this.point(p.x,p.y-22,18,'#b9f8ef',3,0,.55);
    this.point(p.x-23,p.y+2,12,'#b5e7f1',2,game.visualTime*2,.65);this.point(p.x+23,p.y+2,12,'#b5e7f1',2,-game.visualTime*2,.65);
    if(p.focus)this.point(p.x,p.y,67,'#c6dde8',8,0,.28);
    this.point(p.x,p.y,40,'#ffffff',5,0,p.inv>0&&Math.floor(game.visualTime*10)%2?.4:1);
    for(const b of game.bullets)this.point(b.x,b.y,b.size*2,b.color,SHAPES[b.shape],b.angle);
    if(game.showHitboxes){for(const b of game.bullets)this.point(b.x,b.y,b.radius*2.4,'#ffffff',8,0,.5);}
    // Hit marker is drawn last so its 2.5 px collision circle remains readable.
    if(p.focus||game.mode==='preview'||game.mode==='story'){this.point(p.x,p.y,game.config.player.hitRadius*2.8+3,'#0d1022',0,0,1);this.point(p.x,p.y,game.config.player.hitRadius*2.65,'#ffffff',12,0,1);}
    if(game.bombRing>0&&!game.reducedEffects){const origin=game.bombOrigin??p,rad=(1.1-game.bombRing)*530;for(let i=0;i<110;i++){const a=i*Math.PI*2/110;this.point(origin.x+Math.cos(a)*rad,origin.y+Math.sin(a)*rad,8,'#d7e7ff',9,0,game.bombRing/1.1*.6);}}
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(this.sprite);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.spriteBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.data.subarray(0,this.count*9),gl.DYNAMIC_DRAW);
    const stride=36;for(const[k,n,offset]of [['a_pos',2,0],['a_size',1,8],['a_angle',1,12],['a_color',4,16],['a_shape',1,32]]){const l=this.loc[k];gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,stride,offset);}
    gl.uniform2f(this.uView,WIDTH,HEIGHT);gl.uniform1f(this.uScale,this.scale);gl.uniform1f(this.uMaxPoint,this.maxPoint);gl.drawArrays(gl.POINTS,0,this.count);
    for(const l of Object.values(this.loc))gl.disableVertexAttribArray(l);
  }
  dispose(){const gl=this.gl;gl.deleteProgram(this.bg);gl.deleteProgram(this.copy);gl.deleteTexture(this.bgTexture);gl.deleteFramebuffer(this.bgFbo);gl.deleteProgram(this.sprite);gl.deleteBuffer(this.bgBuffer);gl.deleteBuffer(this.spriteBuffer);}
}

export {Renderer};
