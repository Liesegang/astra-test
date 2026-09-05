/** Small arithmetic language. No eval(), Function(), property access or JS execution. */
const FUNCS = Object.freeze({
  sin: [1, Math.sin], cos: [1, Math.cos], tan: [1, Math.tan], abs: [1, Math.abs],
  floor: [1, Math.floor], ceil: [1, Math.ceil], round: [1, Math.round], sqrt: [1, Math.sqrt],
  min: [-1, Math.min], max: [-1, Math.max], pow: [2, Math.pow],
  clamp: [3, (v, lo, hi) => Math.min(hi, Math.max(lo, v))], lerp: [3, (a,b,t) => a+(b-a)*t],
});
const cache = new Map();
const CONSTANTS = Object.freeze({pi: Math.PI, tau: Math.PI*2});
const VARIABLES = ['t','k','i','n','x','y','rank'];
function compileExpression(value, allowed = VARIABLES) {
  if (typeof value === 'number' && Number.isFinite(value)) return () => value;
  if (typeof value !== 'string' || !value.trim() || value.length > 240) throw new Error('数式は有限の数値、または240文字以内の式にしてください');
  const key = value+'|'+allowed.slice().sort().join(',');
  if (cache.has(key)) return cache.get(key);
  const toks=[]; const re=/\s*(?:(\d+(?:\.\d*)?|\.\d+)([eE][+-]?\d+)?|([A-Za-z_]\w*)|([+\-*/%^(),]))/gy;
  let pos=0;
  while(pos<value.length){
    if(!value.slice(pos).trim()) break;
    re.lastIndex=pos;const m=re.exec(value);if(!m)throw new Error(`数式の ${pos+1} 文字目を解釈できません: ${value}`);
    toks.push(m[1] ? {n:Number(m[1]+(m[2]||''))} : m[3]||m[4]);pos=re.lastIndex;
  }
  let at=0; const ids = new Set(allowed);
  function parse(min=0, depth=0){
    if(depth>32)throw new Error('数式の入れ子が深すぎます');
    const tok=toks[at++];let left;
    if(tok && typeof tok==='object') left=()=>tok.n;
    else if(tok==='+'||tok==='-'){const a=parse(25,depth+1);left=tok==='-'?c=>-a(c):a;}
    else if(tok==='('){left=parse(0,depth+1);if(toks[at++]!==')')throw new Error('数式の ) が必要です');}
    else if(typeof tok==='string'&&/^[A-Za-z_]/.test(tok)){
      if(toks[at]==='('){
        if(!Object.hasOwn(FUNCS,tok))throw new Error(`未定義の関数: ${tok}`);at++;const args=[];
        if(toks[at]!==')'){do{args.push(parse(0,depth+1));if(toks[at]!==',')break;at++;}while(args.length<24);}
        if(toks[at++]!==')')throw new Error('関数の ) が必要です');
        const [arity,fn]=FUNCS[tok];if((arity>=0&&args.length!==arity)||(arity<0&&args.length<1))throw new Error(`${tok} の引数の数が違います`);
        left=c=>fn(...args.map(a=>a(c)));
      }else if(Object.hasOwn(CONSTANTS,tok)) left=()=>CONSTANTS[tok];
      else if(ids.has(tok))left=c=>c[tok]??0;
      else throw new Error(`未定義の変数: ${tok}`);
    }else throw new Error(`不完全な数式: ${value}`);
    while(at<toks.length){const op=toks[at];const prec=op==='+'||op==='-'?10:op==='*'||op==='/'||op==='%'?20:op==='^'?30:-1;
      if(prec<min)break;at++;const right=parse(op==='^'?prec:prec+1,depth+1);const old=left;
      left=op==='+'?c=>old(c)+right(c):op==='-'?c=>old(c)-right(c):op==='*'?c=>old(c)*right(c):op==='/'?c=>old(c)/right(c):op==='%'?c=>old(c)%right(c):c=>old(c)**right(c);
    }return left;
  }
  const root=parse();if(at!==toks.length)throw new Error(`数式に余分な要素があります: ${value}`);
  const result=c=>{const n=root(c);if(!Number.isFinite(n))throw new Error(`計算結果が有限値ではありません: ${value}`);return n;};
  if(cache.size>4000)cache.clear();cache.set(key,result);return result;
}
function numberAt(value, context, allowed=VARIABLES) { return compileExpression(value,allowed)(context); }

export {CONSTANTS,VARIABLES,compileExpression,numberAt};
