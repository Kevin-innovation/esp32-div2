// node scripts/check-classroom.mjs [origin] — headless testing Chromium only.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { LEARNING_PATH, DEVICE_MENU_MAP, MAIN_MENU } from '../src/data/learn.ts';
import { BASIC_CLASSES, MISSION_DETAILS, READINESS } from '../src/data/classroom.ts';
const routes=['/learn/why/','/start/','/learn/device/','/learn/nfc/','/learn/network/','/learn/security/','/lab/nfc/'];
assert.deepEqual(LEARNING_PATH.map(step=>step.href),routes);
assert.deepEqual(LEARNING_PATH.map(step=>step.n),[0,1,2,3,4,5,6]);
assert.equal(MAIN_MENU.length,8); assert.equal(DEVICE_MENU_MAP.flatMap(menu=>menu.pages.flatMap(page=>page.items)).length,42);
assert.deepEqual(BASIC_CLASSES.map(lesson=>lesson.id),['A','B','C','D','E']); assert.equal(MISSION_DETAILS.length,12);
assert.equal(new Set(MISSION_DETAILS.map(mission=>mission.id)).size,12);
assert.equal(READINESS.nfc.pilot,READINESS.wifi.pilot);
const origin=process.argv[2]??'http://127.0.0.1:4331';
const shots='/tmp/esp32-classroom-qa';await mkdir(shots,{recursive:true});
const require=createRequire(import.meta.url);const{chromium}=require(execSync('npm root -g').toString().trim()+'/playwright');
const browser=await chromium.launch({headless:true,executablePath:homedir()+'/.agents/bin/test-chromium'});
const errors=[];let checks=0;const evidence=[];
const attach=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
async function bounds(page){
 const bad=await page.evaluate(()=>{
  const bad=[];
  // Expose clipping while measuring: root overflow must not conceal a layout bug.
  const old=[document.documentElement.style.overflowX,document.body.style.overflowX];
  document.documentElement.style.setProperty('overflow-x','visible','important');document.body.style.setProperty('overflow-x','visible','important');
  if(document.documentElement.scrollWidth>innerWidth+1)bad.push('unclipped document overflow');
  for(const el of document.querySelectorAll('.site-head__row,.nav,.nav-reference[open] > ul,.class-list,.workbook-planned,.mission-readiness,.mission-details,.workbook-card__facts,.path-map')){
   const r=el.getBoundingClientRect();if(r.width&&(r.left < -1||r.right>innerWidth+1))bad.push('viewport '+el.className);
  }
  for(const el of document.querySelectorAll('.workbook-planned,.class-list > li,.path-map > li')){
   const p=el.getBoundingClientRect();for(const child of el.children){const r=child.getBoundingClientRect();if(r.width&&(r.left<p.left-1||r.right>p.right+1))bad.push('parent '+child.className);}
  }
  for(const el of document.querySelectorAll('.site-head__row a,.site-head__row summary,.site-head__row button')){
   const r=el.getBoundingClientRect();if(r.width&&r.height<43)bad.push('touch target');
  }
  document.documentElement.style.overflowX=old[0];document.body.style.overflowX=old[1];
  return bad;
 });assert.deepEqual(bad,[]);checks++;
}
try{
 for(const js of[true,false])for(const theme of['light','dark'])for(const width of[320,375,768,1280]){
  const c=await browser.newContext({javaScriptEnabled:js,colorScheme:theme,viewport:{width,height:1000}});const p=await c.newPage();attach(p);
  for(const route of['/learn/','/lab/']){
   await p.goto(origin+route,{waitUntil:'networkidle'});if(js)await p.evaluate(()=>document.fonts.ready);
   const nav=p.getByRole('navigation',{name:'주요 메뉴',exact:true});
   assert.equal(await nav.getByRole('link',{name:'수업 시작',exact:true}).getAttribute('href'),'/learn/');
   assert.equal(await nav.getByRole('link',{name:'실습 미션',exact:true}).getAttribute('href'),'/lab/');checks+=2;
   assert.ok(await nav.getByRole('link',{name:route==='/learn/'?'수업 시작':'실습 미션',exact:true}).getAttribute('aria-current'));checks++;
   const summary=p.locator('#reference-nav > summary');await summary.focus();await p.keyboard.press('Enter');
   assert.equal(await p.locator('#reference-nav').getAttribute('open'),'');checks++;
   assert.equal(await p.locator('#reference-nav ul a:visible').count(),5);checks++;
   await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('href')),'/device/');checks++;
   await bounds(p);
   if(js){
    await p.keyboard.press('Escape');assert.equal(await p.locator('#reference-nav').getAttribute('open'),null);
    assert.ok(await summary.evaluate(el=>el===document.activeElement));checks+=2;
    await summary.click();await p.mouse.click(2,950);assert.equal(await p.locator('#reference-nav').getAttribute('open'),null);checks++;
    const previous=await p.locator('html').getAttribute('data-theme');await p.getByRole('switch').click();assert.notEqual(await p.locator('html').getAttribute('data-theme'),previous);await p.getByRole('switch').click();checks++;
   }else{await summary.click();assert.equal(await p.locator('#reference-nav').getAttribute('open'),null);checks++;}
   if(route==='/learn/'){
    assert.equal(await p.locator('#classes .class-list > li').count(),5);assert.ok((await p.locator('#classes').textContent()).includes('실제 교실 소요 시간은 아직 검증하지 않았습니다'));checks+=2;
    assert.deepEqual(await p.locator('#route .path-map a').evaluateAll(as=>as.map(a=>a.getAttribute('href'))),routes);checks++;
   }else{
    assert.ok((await p.locator('.path-top').textContent()).includes('실습 미션 목록'));assert.ok(!(await p.locator('.path-top').textContent()).includes('참고 자료'));checks+=2;
    assert.equal(await p.locator('#planned .workbook-planned').count(),11);assert.equal(await p.locator('#available .workbook-planned').count(),1);checks+=2;
    assert.equal(await p.locator('#planned .workbook-card__start a').count(),0);assert.equal(await p.locator('.workbook-scene img').count(),12);checks+=2;
    assert.equal(await p.getByRole('link',{name:'NFC 워크북 시작하기'}).getAttribute('href'),'/lab/nfc/');assert.equal(await p.getByRole('link',{name:'Wi-Fi 워크북 시작하기'}).getAttribute('href'),'/lab/wifi-rssi/');checks+=2;
    for(const card of await p.locator('.workbook-planned').all()){
     assert.equal(await card.locator('.mission-readiness li').count(),3);assert.ok((await card.textContent()).includes('제안 시간:'));assert.ok((await card.textContent()).includes('준비물:'));
     const details=card.locator('.mission-details');await details.locator('summary').click();assert.ok(await details.getAttribute('open')!==null);assert.equal(await details.locator('a').count(),1);checks+=5;
    }
    await bounds(p);
    if(js&&[375,1280].includes(width)){
     await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:`${shots}/lab-${width}-${theme}.png`,fullPage:true});
     await p.locator('#available .workbook-planned').screenshot({path:`${shots}/wifi-${width}-${theme}.png`,style:'.site-head,.path-top{visibility:hidden!important;}'});
    }
   }
   await bounds(p);
  }
  if(js&&[375,1280].includes(width)){
   await p.goto(origin+'/learn/',{waitUntil:'networkidle'});await p.locator('#reference-nav > summary').click();await p.screenshot({path:`${shots}/navigation-${width}-${theme}.png`});await p.locator('#classes').screenshot({path:`${shots}/classes-${width}-${theme}.png`,style:'.site-head,.path-top{visibility:hidden!important;}'});
  }
  evidence.push(`${width} ${theme} JS=${js}`);await c.close();console.log(`PASS ${evidence.at(-1)}`);
 }
 const c=await browser.newContext();const p=await c.newPage();attach(p);
 for(const route of['/device/','/guide/','/learn/glossary/','/learn/projects/','/update/']){
  await p.goto(origin+route,{waitUntil:'networkidle'});assert.equal(await p.locator('#reference-nav > summary').getAttribute('aria-current'),'true');checks++;
 }
 const nfc=JSON.stringify({trials:[],notes:{question:'NFC 원문 보존'}}),wifi=JSON.stringify({schemaVersion:1,workbookId:'wifi-rssi',observations:[],notes:{question:'Wi-Fi 원문 보존'}});
 await p.evaluate(({nfc,wifi})=>{localStorage.setItem('esp32div.nfc.v1',nfc);localStorage.setItem('esp32div.lab.wifi-rssi.v1',wifi);},{nfc,wifi});
 for(const route of routes){const response=await p.goto(origin+route,{waitUntil:'networkidle'});assert.equal(response.status(),200);checks++;}
 assert.equal(await p.locator('.path-top a[aria-current=step]').getAttribute('href'),'/lab/nfc/');assert.equal(await p.locator('#report').count(),1);assert.equal(await p.locator('#interview').count(),1);checks+=3;
 await p.goto(origin+'/lab/wifi-rssi/',{waitUntil:'networkidle'});assert.ok((await p.locator('.path-top').textContent()).includes('선택 미션'));checks++;
 assert.deepEqual(await p.evaluate(()=>[localStorage.getItem('esp32div.nfc.v1'),localStorage.getItem('esp32div.lab.wifi-rssi.v1')]),[nfc,wifi]);checks++;
 await c.close();assert.deepEqual(errors,[]);
 const result=`PASS classroom ${checks} checks; 320/375/768/1280 × light/dark × JS on/off; native references/keyboard/Escape/outside/theme/current area; unclipped bounds, 0–6 routes, 11 planned/12 images, mission metadata, storage unchanged; console0. Screenshots ${shots}`;
 console.log(result);await writeFile(`${shots}/result.txt`,result+'\n'+evidence.join('\n'));
}finally{await browser.close();}
