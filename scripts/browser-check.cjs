/* Run with an ephemeral CI Playwright installation; no game runtime dependency. */
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.QA_DIR||'/tmp/moonlit-qa';fs.mkdirSync(out,{recursive:true});
const result={checks:[],errors:[],screenshots:[],target:null};
const check=(name,value)=>{assert.ok(value,name);result.checks.push(name);console.log('PASS',name);};
(async()=>{
 let server,browser,page;
 try{
  let url=process.env.TARGET_URL;
  if(!url){server=http.createServer((req,res)=>{if(req.url.split('?')[0]!=='/astra-test/'){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync('dist/index.html'));});await new Promise(r=>server.listen(5180,'127.0.0.1',r));url='http://127.0.0.1:5180/astra-test/';}
  result.target=url;
  browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>result.errors.push(String(e)));
  const snap=()=>page.evaluate(()=>window.moonlit.snapshot());
  const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});result.screenshots.push(name+'.png');};
  const response=await page.goto(url,{waitUntil:'load'});check('HTTP 200 at the repository subpath',response.status()===200);
  await page.waitForFunction(()=>window.moonlit?.snapshot().version==='1.1.0');
  check('Correct title, nonblank DOM and real WebGL context',(await page.title()).includes('月影異聞')&&await page.evaluate(()=>window.moonlit.isWebGL())&&await page.locator('#start').isVisible());
  check('No horizontal overflow on desktop',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await shot('title-desktop');
  await page.click('#start');check('Start opens the story dialogue',!!(await snap()).dialogue);
  await page.click('#dialogue-next');check('Native next advances exactly one line',(await snap()).dialogueIndex===1);
  await page.click('#dialogue-skip');check('Explicit skip closes the dialogue',!(await snap()).dialogue);
  await page.waitForFunction(()=>window.moonlit.snapshot().time>3.2);
  const x0=(await snap()).player.x;await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');
  const normal=(await snap()).player.x-x0;check('Movement responds to keyboard',normal>10);
  const x1=(await snap()).player.x;await page.keyboard.down('Shift');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(200);await page.keyboard.up('ArrowLeft');await page.keyboard.up('Shift');
  const focus=x1-(await snap()).player.x;check('Focus movement is slower',focus>1&&focus<normal*.8);
  const bombs=(await snap()).bombs;await page.keyboard.press('KeyX');check('Bomb consumes one resource',(await snap()).bombs===bombs-1);
  await page.waitForFunction(()=>window.moonlit.snapshot().bombClearRemaining>0);check('Bomb clears the field',(await snap()).bullets===0);await shot('bomb-desktop');
  await page.keyboard.press('Escape');const paused=(await snap()).time;await page.waitForTimeout(180);check('Pause freezes simulation',(await snap()).time===paused);await page.click('#resume');
  await page.keyboard.press('KeyR');const retried=await snap();check('R restarts promptly, skips read dialogue, marks practice',retried.mode==='story'&&retried.retrying&&retried.continued&&!retried.dialogue&&retried.time<1);
  await page.check('#reduced-effects');check('Reduced effects setting is applied',await page.locator('body').evaluate(e=>e.classList.contains('reduced-effects')));
  await page.click('#sound');check('Sound mute preference is stored',await page.evaluate(()=>localStorage.getItem('moonlit.sound.v1')==='off'));
  await page.click('#tab-studio');await page.fill('#yaml-editor','version: [');await page.waitForFunction(()=>document.querySelector('#editor-status').classList.contains('error'));check('Invalid YAML is rejected without crashing',!(await snap()).error);
  await page.selectOption('#document-select','minimal');await page.waitForFunction(()=>window.moonlit.snapshot().mode==='preview');check('Sample YAML applies to a working preview',(await snap()).previewPattern!==null);
  const bossYaml=`version: 1
meta: {title: 月影異聞, stage: 体験の検証}
patterns:
  petals:
    name: 花の輪
    emitters:
      - {every: 0.18, count: 12, angle: k * 8, spread: 360, speed: 65, color: pink, shape: rice}
bosses:
  test:
    name: 朔夜
    move: {x: 240, y: 120}
    phases:
      - {name: 一の札, hp: 84, duration: 20, patterns: [petals]}
      - {name: 二の札, hp: 9999, duration: 30, patterns: [petals]}
story:
  - boss: test
  - end: true
`;
  await page.fill('#yaml-editor',bossYaml);await page.waitForTimeout(400);await page.click('#play-project');
  await page.waitForFunction(()=>window.moonlit.snapshot().boss?.index===1,{},{timeout:20000});
  let state=await snap();check('Real shots damage the boss and clear the first phase',state.feedback.hits>0&&state.captures===1);
  await page.keyboard.press('KeyR');state=await snap();check('Boss retry restores the same phase without awarding a capture',state.boss.index===1&&state.boss.hp===1&&state.continued&&state.captures===1);
  await page.waitForTimeout(2200);await shot('boss-desktop');
  await page.click('#tab-studio');await page.selectOption('#document-select','stage');await page.selectOption('#pattern-select','finale');await page.waitForTimeout(3200);await shot('studio-desktop');
  check('Desktop editor remains usable',await page.locator('#apply').isVisible()&&!(await snap()).error);
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});page=await mobile.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
  await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>window.moonlit?.snapshot().version==='1.1.0');await shot('title-mobile');
  await page.click('#start');await page.click('#dialogue-skip');await page.waitForTimeout(300);
  const box=await page.locator('#game').boundingBox();const x=box.x+box.width*.5,y=box.y+box.height*.7;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+40,y-20);await page.waitForTimeout(120);await page.mouse.up();
  check('Mobile-relative drag moves the ship without teleporting',(await snap()).player.x>250&&(await snap()).player.x<330);
  const control=await page.locator('#touch-bomb').boundingBox();check('Mobile bomb control is large enough and inside the viewport',control.height>=44&&control.y+control.height<=844);
  await page.click('#touch-bomb');check('Mobile bomb button works',(await snap()).bombs===2);await shot('play-mobile');
  check('No horizontal overflow on mobile',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.click('#tab-studio');await page.locator('#yaml-editor').scrollIntoViewIfNeeded();await shot('studio-mobile');
  check('No runtime exceptions or error overlay',result.errors.length===0&&!(await snap()).error);
  result.success=true;console.log(JSON.stringify(result,null,2));
 }catch(e){result.success=false;result.failure=String(e.stack||e);console.error(result.failure);if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});process.exitCode=1;}
 finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(result,null,2));if(browser)await browser.close();if(server)server.close();}
})();
