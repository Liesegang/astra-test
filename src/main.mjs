import {parseProject} from './config.mjs';
import {Game,FIXED_DT,WIDTH,HEIGHT} from './engine.mjs';
import {Renderer} from './renderer.mjs';
import {AudioEngine} from './audio.mjs';
import {SAMPLES} from './content.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={moon:'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',play:'m9 5 11 7-11 7Z',pause:'M8 5v14M16 5v14',code:'m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 22',volume:'m11 5-6 4H2v6h3l6 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',mute:'m11 5-6 4H2v6h3l6 4Zm5 4 5 6m0-6-5 6',expand:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',arrow:'M4 12h15m-5-5 5 5-5 5',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',upload:'M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4',reset:'M3 10a9 9 0 1 1 1 8M3 4v6h6',close:'m5 5 14 14M19 5 5 19',help:'M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',heart:'M12 21 3.2 12.2C-1 7.8 5.1 1.7 9.5 6L12 8.5 14.5 6c4.4-4.3 10.5 1.8 6.3 6.2Z',diamond:'m12 2 7 10-7 10-7-10Z',check:'m5 12 4 4L19 6'};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.moon}"/></svg>`;
function readStored(key,fallback){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}}
function store(key,v){try{localStorage.setItem(key,String(v));}catch{/* Private mode may disable localStorage. The current session remains playable. */}}
const UI=`
<header class="header">
 <button class="brand" id="brand" aria-label="タイトルへ戻る"><span class="brand-mark"></span><span class="brand-name">MOONLIT ARCHIVE<small>A DANMAKU TALE</small></span></button>
 <nav class="nav" aria-label="画面切り替え"><button id="tab-play" class="active" aria-pressed="true">${icon('play')}プレイ</button><button id="tab-studio" aria-pressed="false">${icon('code')}YAML スタジオ</button></nav>
 <div class="header-tools"><button id="sound" class="icon-btn" aria-label="サウンドを有効にする" title="サウンド">${icon('mute')}</button><button id="fullscreen" class="icon-btn fullscreen-btn" aria-label="全画面表示" title="全画面表示">${icon('expand')}</button></div>
</header>
<main class="workspace" id="workspace">
 <section class="game-column" aria-label="ゲーム画面">
  <div class="game-top"><div class="game-top-left"><span class="stage-number" id="stage-mode">STAGE 01</span><span id="rank-label">NORMAL</span></div><button id="pause-top" aria-label="一時停止">${icon('pause')}<span id="pause-label">PAUSE</span></button></div>
  <div class="game-frame" id="game-frame">
   <canvas id="game" width="480" height="640" aria-label="弾幕シューティング。矢印またはWASDで移動、Shiftで低速、Zで射撃、Xでボム。スマートフォンはドラッグで移動。" tabindex="0"></canvas>
   <div class="stage-overlay">
    <div class="start-screen" id="start-screen"><div class="chapter">第一夜</div><h2 id="start-stage">花の降る参道</h2><p class="desc">散りゆく願いを、迎えにいこう。</p><button class="primary" id="start">物語をはじめる ${icon('arrow')}</button><p class="hint">PRESS ENTER TO START</p></div>
    <div class="boss-hud" id="boss-hud" hidden><div class="boss-row"><span class="boss-name" id="boss-name"></span><span class="boss-time"><span id="boss-time">30</span><small>秒</small></span></div><div class="hp-track"><div class="hp-value" id="hp-value"></div></div><div class="spell-row"><span class="spell-name" id="spell-name"></span><div class="phase-dots" id="phase-dots"></div></div></div>
    <div class="stage-banner" id="stage-banner" hidden><div class="title" id="banner-title"></div><div class="sub" id="banner-sub"></div></div>
    <div class="dialogue-box" id="dialogue-box" hidden><div class="dialogue-speaker" id="dialogue-speaker"></div><div class="dialogue-text" id="dialogue-text" aria-live="polite"></div><div class="dialogue-footer"><span id="dialogue-count"></span><button class="dialogue-next" id="dialogue-next">次へ <span class="key">Z / ENTER</span>${icon('arrow')}</button></div></div>
    <div class="overlay-center choice-screen" id="choice-screen" hidden><h2>夜の分かれ道</h2><p id="choice-prompt"></p><div class="choice-options" id="choice-options"></div></div>
    <div class="overlay-center" id="pause-screen" hidden><h2>ひと休み</h2><p>夜は、まだ続いている。</p><button class="primary" id="resume">つづける ${icon('play')}</button><button class="secondary" id="pause-retry">最初から</button></div>
    <div class="overlay-center" id="result-screen" hidden><h2 id="result-title"></h2><p id="result-description"></p><div class="result-score" id="result-score"></div><p id="result-details"></p><button class="primary" id="retry">もう一度 ${icon('reset')}</button><button class="secondary" id="continue" hidden>その場からコンティニュー</button><button class="text-button" id="result-home">タイトルに戻る</button></div>
    <div class="preview-label" id="preview-label" hidden><span class="name" id="preview-name"></span><span id="practice-state">INVINCIBLE</span></div>
    <div class="bomb-flash" id="bomb-flash"></div>
    <div class="overlay-center" id="error-screen" hidden><h2>実行を停止しました</h2><p class="error-message" id="runtime-error"></p><button class="secondary" id="error-editor">YAML を修正する</button></div>
   </div>
  </div>
  <div class="game-bottom"><span class="engine-label">WEBGL <span id="fps">60</span> FPS</span><span>弾数 <span id="bullet-count">0</span> <span id="cap-indicator"></span></span></div>
  <div class="mobile-controls"><span class="touch-hint">画面をドラッグして移動</span><button id="touch-focus" aria-label="押している間低速移動">低速</button><button id="touch-bomb">ボム</button></div>
 </section>
 <aside class="info-panel" id="info-panel" aria-label="スコアと操作">
  <div class="title-flower">月と、花と、忘れもの。</div><h1 id="game-title">月影異聞</h1><p class="tagline" id="tagline">月が隠した、もうひとつの夜。</p>
  <div class="score-block"><div class="small-label">SCORE</div><div class="score" id="score">000000000</div><div class="high-score"><span class="small-label">HIGH SCORE</span><span id="high-score">000000000</span></div></div>
  <div class="resources"><div class="resource-row"><span class="small-label">PLAYER</span><div class="resource-icons" id="lives" aria-label="残機3"></div></div><div class="resource-row"><span class="small-label">BOMB</span><div class="resource-icons bombs" id="bombs" aria-label="ボム3"></div></div></div>
  <div class="metrics"><div class="metric"><span class="small-label">POWER</span><span class="value" id="power">1.00</span></div><div class="metric"><span class="small-label">GRAZE</span><span class="value" id="graze">0</span></div></div>
  <div class="settings"><label for="difficulty">難易度</label><select id="difficulty"><option value="easy">EASY</option><option value="normal" selected>NORMAL</option><option value="hard">HARD</option></select></div>
  <label class="auto-shot"><input type="checkbox" id="auto-shot" checked> オートショット</label>
  <div class="controls"><div class="control"><span class="control-keys"><span class="key">↑↓←→</span><span class="muted">/</span><span class="key wide">WASD</span></span><span>移動</span></div><div class="control"><span class="control-keys"><span class="key wide">SHIFT</span></span><span class="control-desc">低速移動 <span class="muted">＋ 当たり判定</span></span></div><div class="control"><span class="control-keys"><span class="key">Z</span><span class="shot-label">射撃</span><span class="key">X</span></span><span>ボム</span></div><div class="control"><span class="control-keys"><span class="key">ESC</span><span class="muted">/</span><span class="key">P</span></span><span>一時停止</span></div></div>
  <button class="make-pattern" id="make-pattern"><span>自分の弾幕を、咲かせよう。<small>YAML を編集して、その場で試射</small></span>${icon('arrow')}</button>
  <div class="play-actions" id="play-actions" hidden><button class="secondary" id="restart-side">最初から</button><button class="secondary" id="home-side">タイトルへ</button></div>
 </aside>
 <aside class="studio-panel" id="studio-panel" aria-label="YAMLエディター" hidden>
  <div class="studio-heading"><h2>YAML Studio</h2><button class="text-button" id="help-open">${icon('help')}書き方を見る</button></div><p class="studio-intro">物語も、弾幕も。書き換えたその場で、試してみる。</p>
  <div class="document-bar"><select id="document-select" aria-label="サンプルプロジェクト"><option value="stage">月影異聞 / フルステージ</option><option value="minimal">最小構成 / はじめての弾幕</option><option value="branching">分岐 / 二つの参道</option></select><button class="icon-btn" id="import" title="YAMLを読み込む" aria-label="YAMLを読み込む">${icon('upload')}</button><button class="icon-btn" id="export" title="YAMLを書き出す" aria-label="YAMLを書き出す">${icon('download')}</button><input type="file" id="file-input" accept=".yaml,.yml,text/yaml,text/plain" hidden></div>
  <div class="editor-wrap"><pre class="line-numbers" id="line-numbers" aria-hidden="true"></pre><pre class="highlight" id="highlight" aria-hidden="true"></pre><textarea id="yaml-editor" aria-label="ステージと弾幕のYAML" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"></textarea></div>
  <div class="editor-status" id="editor-status"><span class="status-text" id="status-text" role="status">YAML を読み込みました</span><span class="cursor-pos" id="cursor-pos">Ln 1, Col 1</span></div>
  <div class="studio-actions"><button class="primary" id="apply">${icon('play')}反映して試射</button><button class="secondary" id="play-project">物語をプレイ ${icon('arrow')}</button></div>
  <div class="preview-tools"><h3>PATTERN PREVIEW</h3><div class="pattern-row"><select id="pattern-select" aria-label="試射する弾幕"></select><button class="icon-btn" id="preview-restart" aria-label="弾幕を最初から試射" title="弾幕を最初から試射">${icon('reset')}</button><button class="icon-btn" id="jump-pattern" title="定義へ移動" aria-label="選択中の弾幕の定義へ移動">${icon('code')}</button></div><p class="preview-description" id="preview-description"></p><div class="practice-settings"><div class="practice-toggles"><label class="check"><input type="checkbox" id="invincible" checked>無敵</label><label class="check"><input type="checkbox" id="hitboxes">当たり判定</label></div><div class="speed-control" aria-label="試射速度"><button id="half-speed">0.5×</button><button id="full-speed" class="active">1×</button></div></div><p class="studio-hint">Ctrl / ⌘ + Enter で反映 · Tab で2スペース · 変更はこの端末に自動保存</p></div>
 </aside>
</main>
<footer class="site-footer"><span>MOONLIT ARCHIVE / 01</span><span class="footer-note">オリジナルの物語と、手のひらに咲く弾幕。<span id="footer-mode"> &nbsp; BUILT WITH WEBGL</span></span></footer>
<div class="toast" id="toast" role="status" hidden></div>
<dialog class="help-dialog" id="help"><div class="help-head"><h2>弾幕の書き方</h2><button class="icon-btn" id="help-close" aria-label="説明を閉じる">${icon('close')}</button></div><p>このYAMLは、再利用できる <code>patterns</code>、敵の <code>enemies / bosses</code>、進行の <code>story</code> に分かれています。まずは「最小構成」を読み込んで、数値を変えて試してみてください。</p><h3>六方向に回る花を、7項目で</h3><pre><code>patterns:
  flower:
    name: 六方向の花
    emitters:
      - every: 0.12
        count: 6
        angle: k * 8
        spread: 360
        speed: 100
        color: pink
        shape: rice</code></pre><table><tr><th>項目</th><th>意味</th></tr><tr><td><code>every / delay / times</code></td><td>発射間隔 / 最初の待機 / 発射回数。秒単位。</td></tr><tr><td><code>count / spread / angle</code></td><td>弾数 / 広がり角 / 向き。0°は右、90°は下。</td></tr><tr><td><code>aim: player</code></td><td>発射する瞬間の自機方向を基準にする。</td></tr><tr><td><code>speed / accel / turn</code></td><td>速度 px/s / 加速度 px/s² / 旋回速度 °/s。</td></tr><tr><td><code>size / hitRadius / life</code></td><td>描画サイズの基準半径 / 当たり判定半径 / 寿命（秒）。</td></tr><tr><td><code>t / k / i / n / rank</code></td><td>パターン経過秒 / 発射番号 / 弾番号 / 弾数 / 難易度。</td></tr></table><h3>弾を時間差で分裂させる</h3><pre><code>        on:
          after: 1.3
          fire: blossom  # patterns のID
          vanish: true</code></pre><p><code>fire</code> は子パターンの各 emitter を1回ずつ発射します。子の <code>delay</code> も有効です。循環参照は禁止、分裂の深さは3段までです。</p><h3>会話からボス戦へ</h3><pre><code>story:
  - dialogue:
      - speaker: 花の精
        text: 花びらの間を通り抜けて。
  - boss: test
  - end: true</code></pre><p><code>wave</code> は敵を非同期に出し、<code>wait</code> は秒数を待ちます。<code>dialogue</code> と <code>boss</code> は終了まで待機します。<code>repeat + steps</code> で繰り返し、<code>choice / label / goto</code> で物語を分岐できます。</p><h3>安全な数式と上限</h3><p>四則演算、<code>^ % sin cos tan abs floor ceil round sqrt min max pow clamp lerp</code>、定数 <code>pi tau</code> を使えます。三角関数はラジアンです。JavaScriptは実行しません。弾は最大12,000発、1発射256発まで。発射間隔の下限は0.025秒です。アンカーや独自タグは使えません。</p></dialog>
`;
$('#app').innerHTML=UI;
const editor=$('#yaml-editor');let draft=readStored('moonlit.yaml.v1',SAMPLES.stage),config,validationTimer,view='play',lastTextKey='',lastChoice='',lastResources='',lastBossDots='',toastTimer;
try{config=parseProject(draft);}catch{config=parseProject(SAMPLES.stage);}
const audio=new AudioEngine();const game=new Game(config,audio);let renderer;
try{renderer=new Renderer($('#game'));}catch(e){$('#app').innerHTML=`<div class="fatal"><h1>WebGL を起動できませんでした</h1><p>${esc(e.message)}</p><p>対応ブラウザで開き、ハードウェアアクセラレーションを確認してください。</p></div>`;throw e;}
let highScore=Number(readStored('moonlit.highscore.v1','0'))||0;
const keys=new Set();let pointerId=null,pointerOrigin=null,pointerTarget=null,touchFocus=false;
const show=(el,on)=>{el.hidden=!on;};
const text=(sel,value)=>{const el=$(sel);const t=String(value);if(el.textContent!==t)el.textContent=t;};
function toast(message){text('#toast',message);show($('#toast'),true);clearTimeout(toastTimer);toastTimer=setTimeout(()=>show($('#toast'),false),2600);}
function updateMeta(){document.title=`${config.meta.title} — Moonlit Archive`;text('#game-title',config.meta.title);text('#tagline',config.meta.subtitle);text('#start-stage',config.meta.stage);}
function status(message,error=false,dirty=false){text('#status-text',message);$('#editor-status').className='editor-status'+(error?' error':dirty?' dirty':'');}
function highlight(value){
  const re=/"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|#[^\n]*|\b(?:true|false|null)\b|\b\d+(?:\.\d+)?\b|^[ \t]*[\w-]+(?=\s*:)/gm;
  let out='',pos=0;for(const m of value.matchAll(re)){out+=esc(value.slice(pos,m.index));const tok=m[0],cls=tok.startsWith('#')?'comment':/^['"]/.test(tok)?'str':/^(true|false|null)$/.test(tok)?'bool':/^\d/.test(tok)?'num':'key';out+=`<span class="tok-${cls}">${esc(tok)}</span>`;pos=m.index+tok.length;}
  return out+esc(value.slice(pos))+'\n';
}
function cursor(){const pre=editor.value.slice(0,editor.selectionStart),parts=pre.split('\n');text('#cursor-pos',`Ln ${parts.length}, Col ${parts.at(-1).length+1}`);}
function syncEditor(){text('#line-numbers',Array.from({length:editor.value.split('\n').length},(_,i)=>i+1).join('\n'));$('#highlight').innerHTML=highlight(editor.value);syncScroll();cursor();}
function syncScroll(){$('#highlight').scrollTop=editor.scrollTop;$('#highlight').scrollLeft=editor.scrollLeft;$('#line-numbers').scrollTop=editor.scrollTop;}
function validateDraft(){try{parseProject(editor.value);status(editor.value===config.source?'✓ 適用済みの YAML':'● 構文は正常です。反映すると試射できます',false,editor.value!==config.source);$('#apply').disabled=false;$('#play-project').disabled=false;return true;}catch(e){status(e.message,true);$('#apply').disabled=true;$('#play-project').disabled=true;return false;}}
function updatePatternOptions(prefer){const keys=Object.keys(config.patterns);$('#pattern-select').innerHTML=keys.map(k=>`<option value="${esc(k)}">${esc(config.patterns[k].name)}</option>`).join('');$('#pattern-select').value=keys.includes(prefer)?prefer:keys[0];updatePatternDescription();}
function updatePatternDescription(){const p=config.patterns[$('#pattern-select').value];text('#preview-description',p?.description||'数値を書き換えて、弾幕の変化を確かめてみましょう。');}
function setView(next,{preview=true}={}){
  view=next;const studio=view==='studio';$('#workspace').className='workspace'+(studio?' studio':'');show($('#info-panel'),!studio);show($('#studio-panel'),studio);$('#tab-play').classList.toggle('active',!studio);$('#tab-studio').classList.toggle('active',studio);$('#tab-play').setAttribute('aria-pressed',String(!studio));$('#tab-studio').setAttribute('aria-pressed',String(studio));
  if(studio&&preview){game.preview($('#pattern-select').value);game.showHitboxes=$('#hitboxes').checked;game.speedScale=$('#half-speed').classList.contains('active')?.5:1;}
  if(!studio&&game.mode==='preview')game.reset('title');
  requestAnimationFrame(()=>{renderer.resize();syncScroll();});renderHUD();
}
function begin(){
  audio.unlock();game.speedScale=1;game.showHitboxes=false;game.start($('#difficulty').value);setView('play',{preview:false});keys.clear();pointerTarget=null;renderHUD();$('#game').focus({preventScroll:true});
}
function goHome(){game.speedScale=1;game.reset('title');setView('play',{preview:false});renderHUD();}
function startPreview(){audio.unlock();game.difficulty=$('#difficulty').value;game.preview($('#pattern-select').value);game.speedScale=$('#half-speed').classList.contains('active')?.5:1;game.showHitboxes=$('#hitboxes').checked;game.practice=$('#invincible').checked;updatePatternDescription();renderHUD();}
function applyDraft(play=false){
  try{const next=parseProject(editor.value),selected=$('#pattern-select').value;config=next;game.setConfig(config);store('moonlit.yaml.v1',editor.value);updateMeta();updatePatternOptions(selected);validateDraft();if(play)begin();else{setView('studio',{preview:false});startPreview();}toast(play?'この YAML の物語を開始しました':'YAML を反映しました');}catch(e){status(e.message,true);toast('YAML のエラーを修正してください');}
}
function jumpToPattern(){const id=$('#pattern-select').value,re=new RegExp('^  '+id+':','m'),m=re.exec(editor.value);if(!m){toast('編集中の YAML にこのパターンが見つかりません');return;}const line=editor.value.slice(0,m.index).split('\n').length;editor.focus({preventScroll:true});editor.setSelectionRange(m.index,m.index+id.length+3);editor.scrollTop=Math.max(0,(line-2)*20);syncScroll();cursor();}
function runtimeError(e){game.error=e.message??String(e);game.paused=true;status(game.error,true);renderHUD();}
function renderHUD(){
 const s=game.snapshot();text('#score',String(Math.floor(s.score)).padStart(9,'0'));text('#high-score',String(Math.floor(highScore)).padStart(9,'0'));text('#power',s.power.toFixed(2));text('#graze',s.graze);text('#bullet-count',s.bullets.toLocaleString());text('#cap-indicator',s.capHit?'LIMIT':'');text('#stage-mode',s.mode==='preview'?'PATTERN PREVIEW':'STAGE 01');text('#rank-label',game.difficulty.toUpperCase());text('#pause-label',s.paused?'RESUME':'PAUSE');
 $('#pause-top').disabled=['title','gameover','clear'].includes(s.mode)||!!s.error;
 const resourceKey=s.lives+':'+s.bombs;if(lastResources!==resourceKey){lastResources=resourceKey;$('#lives').innerHTML=Array.from({length:Math.max(config.player.lives,s.lives)},(_,i)=>icon('heart',i<s.lives?'solid':'empty')).join('');$('#bombs').innerHTML=Array.from({length:Math.max(config.player.bombs,s.bombs)},(_,i)=>icon('diamond',i<s.bombs?'solid':'empty')).join('');$('#lives').setAttribute('aria-label',`残機 ${s.lives}`);$('#bombs').setAttribute('aria-label',`ボム ${s.bombs}`);}
 show($('#start-screen'),s.mode==='title');show($('#boss-hud'),!!s.boss);show($('#dialogue-box'),!!s.dialogue&&!s.paused);show($('#choice-screen'),!!s.choice&&!s.paused);show($('#pause-screen'),s.paused&&!s.error);show($('#preview-label'),s.mode==='preview');show($('#play-actions'),s.mode!=='title');show($('#stage-banner'),!!s.banner);show($('#error-screen'),!!s.error);show($('#result-screen'),['clear','gameover'].includes(s.mode));
 $('#difficulty').disabled=s.mode==='story';
 if(s.boss){text('#boss-name',s.boss.name);text('#boss-time',Math.ceil(s.boss.remaining).toString().padStart(2,'0'));text('#spell-name',s.boss.spell);$('#hp-value').style.transform=`scaleX(${s.boss.hp})`;const dk=s.boss.index+':'+s.boss.total;if(dk!==lastBossDots){lastBossDots=dk;$('#phase-dots').innerHTML=Array.from({length:s.boss.total},(_,i)=>`<span class="${i>=s.boss.index?'remaining':''}"></span>`).join('');}}
 if(s.dialogue){const tk=s.dialogueIndex+':'+s.dialogueLength+':'+s.dialogue.speaker+':'+s.dialogue.text;if(tk!==lastTextKey){lastTextKey=tk;text('#dialogue-speaker',s.dialogue.speaker);text('#dialogue-text',s.dialogue.text);text('#dialogue-count',`${String(s.dialogueIndex+1).padStart(2,'0')} / ${String(s.dialogueLength).padStart(2,'0')}`);}}
 if(s.choice){text('#choice-prompt',s.choice.prompt);const ck=JSON.stringify(s.choice);if(ck!==lastChoice){lastChoice=ck;$('#choice-options').replaceChildren(...s.choice.options.map((o,i)=>{const button=document.createElement('button');button.className='secondary';button.textContent=o.text;button.onclick=()=>{try{game.choose(i);renderHUD();}catch(e){runtimeError(e);}};return button;}));}}
 if(s.banner){text('#banner-title',s.banner.text);text('#banner-sub',s.banner.subtitle);}
 if(s.mode==='preview'){text('#preview-name',config.patterns[s.previewPattern]?.name??'');text('#practice-state',game.practice?'INVINCIBLE':'LIVE');}
 if(s.error)text('#runtime-error',s.error);
 $('#bomb-flash').style.opacity=String(game.bombFlash*.32);
 if(['clear','gameover'].includes(s.mode)){
   const won=s.mode==='clear';text('#result-title',won?'夜明けの帰り道':'また、月の下で');text('#result-description',won?'灯りは、無事に帰り着きました。':'散った願いは、もう一度拾える。');text('#result-score',String(Math.floor(s.score)).padStart(9,'0'));text('#result-details',`スペル取得 ${s.captures}  /  グレイズ ${s.graze}  /  被弾 ${s.misses}`);show($('#continue'),!won);
   if(s.score>highScore){highScore=s.score;store('moonlit.highscore.v1',highScore);}
 }
}
// UI actions remain native DOM; all untrusted YAML strings are text, never HTML.
$('#start').onclick=begin;$('#retry').onclick=begin;$('#pause-retry').onclick=begin;$('#restart-side').onclick=begin;
$('#brand').onclick=goHome;$('#home-side').onclick=goHome;$('#result-home').onclick=goHome;
$('#continue').onclick=()=>{game.continueRun();renderHUD();};
$('#tab-play').onclick=()=>setView('play');$('#tab-studio').onclick=()=>setView('studio');$('#make-pattern').onclick=()=>setView('studio');
$('#pause-top').onclick=()=>{game.togglePause();renderHUD();};$('#resume').onclick=()=>{game.paused=false;renderHUD();};
$('#dialogue-next').onclick=()=>{try{game.advance();renderHUD();}catch(e){runtimeError(e);}};
$('#apply').onclick=()=>applyDraft();$('#play-project').onclick=()=>applyDraft(true);$('#pattern-select').onchange=startPreview;$('#preview-restart').onclick=startPreview;$('#jump-pattern').onclick=jumpToPattern;
$('#auto-shot').onchange=e=>{game.autoShot=e.target.checked;};
$('#difficulty').onchange=e=>{game.difficulty=e.target.value;game.rank={easy:.78,normal:1,hard:1.23}[e.target.value];if(game.mode==='preview')startPreview();renderHUD();};
$('#invincible').onchange=e=>{game.practice=e.target.checked;renderHUD();};$('#hitboxes').onchange=e=>{game.showHitboxes=e.target.checked;};
function speed(half){$('#half-speed').classList.toggle('active',half);$('#full-speed').classList.toggle('active',!half);if(game.mode==='preview')game.speedScale=half?.5:1;}
$('#half-speed').onclick=()=>speed(true);$('#full-speed').onclick=()=>speed(false);
$('#sound').onclick=()=>{audio.setEnabled(!audio.enabled);$('#sound').innerHTML=icon(audio.enabled?'volume':'mute');$('#sound').classList.toggle('on',audio.enabled);$('#sound').setAttribute('aria-label',audio.enabled?'サウンドを無効にする':'サウンドを有効にする');};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('このブラウザでは全画面 API は使えません');}catch{toast('全画面表示を開始できませんでした');}};
$('#help-open').onclick=()=>{if(game.mode==='preview')game.paused=true;$('#help').showModal();renderHUD();};$('#help-close').onclick=()=>$('#help').close();$('#help').addEventListener('click',e=>{if(e.target===$('#help')){const r=$('#help').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#help').close();}});$('#help').addEventListener('close',()=>{if(game.mode==='preview'&&!game.error)game.paused=false;renderHUD();});
$('#error-editor').onclick=()=>{game.error=null;setView('studio',{preview:false});game.paused=true;editor.focus({preventScroll:true});};
$('#document-select').onchange=e=>{const sample=SAMPLES[e.target.value];if(!sample)return;editor.value=sample;draft=sample;syncEditor();validateDraft();store('moonlit.yaml.v1',sample);applyDraft();};
$('#export').onclick=()=>{const blob=new Blob([editor.value],{type:'text/yaml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='moonlit-stage.yaml';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('編集中の YAML を書き出しました');};
$('#import').onclick=()=>$('#file-input').click();$('#file-input').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>800000){toast('YAML ファイルが大きすぎます');e.target.value='';return;}try{editor.value=await file.text();draft=editor.value;syncEditor();validateDraft();store('moonlit.yaml.v1',editor.value);toast('読み込みました。「反映して試射」で適用します');}catch{toast('ファイルを読み込めませんでした');}e.target.value='';};
editor.value=draft;editor.setSelectionRange(0,0);syncEditor();editor.addEventListener('scroll',syncScroll);editor.addEventListener('click',cursor);editor.addEventListener('keyup',cursor);
editor.addEventListener('input',()=>{draft=editor.value;syncEditor();clearTimeout(validationTimer);status('変更を確認しています…',false,true);validationTimer=setTimeout(()=>{validateDraft();store('moonlit.yaml.v1',editor.value);},300);});
editor.addEventListener('keydown',e=>{
 if(e.key==='Tab'){e.preventDefault();const a=editor.selectionStart,b=editor.selectionEnd;editor.setRangeText('  ',a,b,'end');editor.dispatchEvent(new Event('input'));}
 if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();applyDraft();}
});
const editing=target=>target instanceof Element&&!!target.closest('textarea,input,select,[contenteditable="true"]');
window.addEventListener('keydown',e=>{
 if($('#help').open)return;if(editing(e.target))return;
 const k=e.code;const used=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyZ','KeyX','ShiftLeft','ShiftRight','Enter','Escape','KeyP'];
 if(!used.includes(k))return;
 // A focused button retains native Enter activation (avoids advancing two dialogue lines).
 if(k==='Enter'&&e.target instanceof HTMLButtonElement)return;
 e.preventDefault();keys.add(k);audio.unlock();if(e.repeat)return;
 try{
  if(k==='Enter'&&game.mode==='title')begin();
  else if((k==='Enter'||k==='KeyZ')&&game.dialogue){game.advance();renderHUD();}
  else if(k==='KeyX'){game.bomb();renderHUD();}
  else if(k==='Escape'||k==='KeyP'){game.togglePause();renderHUD();}
 }catch(err){runtimeError(err);}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
function releaseInput(){keys.clear();pointerId=null;pointerOrigin=null;pointerTarget=null;touchFocus=false;}
window.addEventListener('blur',()=>{releaseInput();if(['story','preview'].includes(game.mode)){game.paused=true;renderHUD();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseInput();if(['story','preview'].includes(game.mode)){game.paused=true;renderHUD();}}});
const canvas=$('#game');
canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0||game.paused||game.dialogue||!['story','preview'].includes(game.mode))return;
 e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointerId=e.pointerId;pointerOrigin={x:e.clientX,y:e.clientY,px:game.player.x,py:game.player.y};pointerTarget={x:game.player.x,y:game.player.y};audio.unlock();
});
canvas.addEventListener('pointermove',e=>{
 if(pointerId!==e.pointerId||!pointerOrigin)return;
 const r=canvas.getBoundingClientRect(),f=touchFocus?.45:1;
 // Incremental deltas let focus change during a drag without moving the origin.
 pointerTarget={x:Math.max(10,Math.min(WIDTH-10,(pointerTarget?.x??game.player.x)+(e.clientX-pointerOrigin.x)/r.width*WIDTH*f)),y:Math.max(20,Math.min(HEIGHT-15,(pointerTarget?.y??game.player.y)+(e.clientY-pointerOrigin.y)/r.height*HEIGHT*f))};
 pointerOrigin={x:e.clientX,y:e.clientY};
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(pointerId===e.pointerId){pointerId=null;pointerOrigin=null;pointerTarget=null;}});
$('#touch-focus').addEventListener('pointerdown',e=>{e.preventDefault();touchFocus=true;e.target.setPointerCapture(e.pointerId);});for(const n of ['pointerup','pointercancel','lostpointercapture'])$('#touch-focus').addEventListener(n,()=>touchFocus=false);
$('#touch-bomb').onclick=()=>{game.bomb();renderHUD();};
canvas.addEventListener('renderer-error',e=>runtimeError(new Error(e.detail)));
updateMeta();updatePatternOptions();validateDraft();renderHUD();
let last=performance.now(),acc=0,hudTimer=0,frames=0,fpsTimer=0;
function loop(now){const elapsed=Math.min(.1,Math.max(0,(now-last)/1000));last=now;acc=Math.min(acc+elapsed,.1);frames++;fpsTimer+=elapsed;
 const input={x:(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0),y:(keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0),focus:keys.has('ShiftLeft')||keys.has('ShiftRight')||touchFocus,shoot:keys.has('KeyZ'),pointer:pointerTarget};
 try{while(acc>=FIXED_DT){game.step(FIXED_DT,input);acc-=FIXED_DT;}renderer.render(game);audio.tick(!game.paused&&['story','preview'].includes(game.mode)&&!game.dialogue&&!game.choice);}catch(e){runtimeError(e);}
 hudTimer+=elapsed;if(hudTimer>.08){renderHUD();hudTimer=0;}
 if(fpsTimer>=.6){text('#fps',Math.round(frames/fpsTimer));frames=0;fpsTimer=0;}
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// Read-only integration hook for smoke tests and frame-independent engine inspection.
Object.defineProperty(window,'moonlit',{value:Object.freeze({snapshot:()=>game.snapshot(),isWebGL:()=>!!renderer.gl,getConfig:()=>({title:config.meta.title,patterns:Object.keys(config.patterns),commands:config.commands.length})})});
