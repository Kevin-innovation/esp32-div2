// 사이트 공통 목차 현재 위치와 본문 링크 검사(headless test-chromium만). 미리보기 서버(127.0.0.1:4329)와 dist가 있어야 한다.
// 정적 전수: dist의 모든 목차(.toc, .wb-toc)가 data-toc를 달고, 목차 링크가 실제 id를 가리키는지.
// 대표 페이지(보안, NFC, 네트워크, 시작, 기능 가이드, 워크북 2개) × 375/768/1280:
//  스크롤 위·가운데·아래의 지금 절(aria-current=location 하나, 문서 기준 계산과 같음), 모든 #앵커 진입(제목이 바에 가리지 않음),
//  뒤로 가기, 접힘 펼침 reflow, 모바일 절 바(키보드·Escape·밖 클릭·링크 누름), hover와 현재 표시 구별, JS 끔, 200% 확대,
//  본문 링크 색·밑줄·대비, 가로 넘침·console.
// 실행: node scripts/check-toc-spy.mjs [스크린샷 폴더]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const root = path.resolve(import.meta.dirname, '..');
const BASE = 'http://127.0.0.1:4329';
const SHOTS = process.argv[2];
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };

// 정적 전수
const pages = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name === 'index.html' && pages.push(path.join(d, e.name))));
walk(path.join(root, 'dist'));
let tocPages = 0;
for (const f of pages) {
  const html = fs.readFileSync(f, 'utf8');
  const route = '/' + path.relative(path.join(root, 'dist'), path.dirname(f)).split(path.sep).join('/');
  const navs = [...html.matchAll(/<nav class="(?:doc__aside toc|wb-toc)"[^>]*>([\s\S]*?)<\/nav>/g)];
  for (const [whole, body] of navs) {
    tocPages++;
    ok(/\sdata-toc[\s>]/.test(whole.slice(0, whole.indexOf('>') + 1)), `${route}: 목차에 data-toc 없음`);
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const [, h] of body.matchAll(/href="#([^"]+)"/g)) ok(ids.has(decodeURIComponent(h)), `${route}: 목차 링크 #${h}의 대상 없음`);
  }
}

// 지금 화면의 상태와, 같은 규칙으로 따로 계산한 기대값
const state = (p) => p.evaluate(() => {
  const stuck = [...document.querySelectorAll('.site-head, .path-top, .toc-bar')].filter((el) => el.offsetHeight > 0 && ['sticky', 'fixed'].includes(getComputedStyle(el).position));
  const bottom = Math.max(0, ...stuck.map((el) => el.getBoundingClientRect().bottom));
  const links = [...document.querySelectorAll('[data-toc] a[href^="#"]')].filter((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  const tops = links.map((a) => { const t = document.getElementById(decodeURIComponent(a.hash.slice(1))); return [t.getBoundingClientRect().top, parseFloat(getComputedStyle(t).scrollMarginTop) || 0]; });
  let k = -1;
  tops.forEach(([t, m], j) => { if (t <= bottom + 24 + m) k = j; });
  const atEnd = scrollY >= document.documentElement.scrollHeight - innerHeight - 2;
  let kEnd = k;
  if (atEnd) for (let j = tops.length - 1; j > k; j--) if (tops[j][0] < innerHeight) { kEnd = j; break; }
  const cur = [...document.querySelectorAll('[data-toc] a[aria-current="location"]')].map((a) => a.hash);
  const bar = document.querySelector('.toc-bar');
  return {
    bottom, atEnd, hashes: links.map((a) => a.hash), expected: k < 0 ? null : links[k].hash, expectedEnd: kEnd < 0 ? null : links[kEnd].hash, cur,
    bar: bar && bar.offsetHeight > 0 ? { h: bar.offsetHeight, now: bar.querySelector('[data-now-text]').textContent, cur: [...bar.querySelectorAll('a[aria-current="location"]')].map((a) => a.hash) } : null,
    labels: Object.fromEntries(links.map((a) => [a.hash, [...a.childNodes].map((n) => n.textContent.trim()).filter(Boolean).join(' ')])),
    ow: document.documentElement.scrollWidth - innerWidth,
  };
});

const ROUTES = ['/learn/security/', '/learn/nfc/', '/learn/network/', '/start/', '/guide/nfc/', '/lab/nfc/', '/lab/gps/'];
const b = await chromium.launch({ headless: true, executablePath: path.join(homedir(), '.agents/bin/test-chromium') });
for (const [w, scheme] of [[375, 'light'], [375, 'dark'], [768, 'light'], [1280, 'light'], [1280, 'dark']]) {
  const c = await b.newContext({ viewport: { width: w, height: 860 }, colorScheme: scheme });
  for (const route of ROUTES) {
    const p = await c.newPage();
    const errs = [];
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    p.on('pageerror', (e) => errs.push(String(e)));
    const tag = `${route} ${w} ${scheme}`;
    await p.goto(BASE + route, { waitUntil: 'networkidle' });
    // 스크롤 위·가운데·아래
    for (const [name, frac] of [['top', 0], ['middle', 0.5], ['bottom', 1]]) {
      await p.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), frac);
      await p.waitForTimeout(120);
      const s = await state(p);
      const want = s.atEnd ? s.expectedEnd : s.expected;
      ok(want === null ? s.cur.length === 0 : s.cur.length === 1 && s.cur[0] === want, `${tag} ${name}: 지금 절 ${s.cur} / 기대 ${want}`);
      ok(s.ow <= 0, `${tag} ${name}: 가로 넘침 ${s.ow}`);
      if (w <= 960) {
        ok(s.bar && s.bar.h <= 56 && (want === null ? s.bar.now === '첫머리' && s.bar.cur.length === 0 : s.bar.now === s.labels[want] && s.bar.cur[0] === want), `${tag} ${name}: 절 바 ${JSON.stringify(s.bar)}`);
      } else ok(!s.bar, `${tag}: 넓은 화면에 절 바가 보임`);
      if (SHOTS && name !== 'top' && (w === 375 || w === 1280) && route.includes('security')) await p.screenshot({ path: `${SHOTS}/security-${w}-${scheme}-${name}.png` });
    }
    // #앵커 진입: 제목이 바에 가리지 않고, 그 절이 현재
    if (scheme === 'light' && w !== 768) {
      const { hashes } = await state(p);
      for (const h of hashes) {
        await p.goto(`${BASE}${route}${h}`, { waitUntil: 'networkidle' });
        await p.waitForTimeout(100);
        const s = await state(p);
        const top = await p.evaluate((id) => { const el = document.getElementById(id); const hd = el.matches('h1,h2,h3') ? el : el.querySelector('h2,h3') ?? el; return hd.getBoundingClientRect().top; }, decodeURIComponent(h.slice(1)));
        ok(top >= s.bottom - 1, `${tag} ${h}: 제목이 바에 가림 (제목 ${top}, 바 ${s.bottom})`);
        ok(s.cur.length === 1 && s.cur[0] === h, `${tag} ${h}: 지금 절 ${s.cur}`);
      }
    }
    ok(errs.length === 0, `${tag}: console ${errs.slice(0, 2).join(' ; ')}`);
    await p.close();
  }
  await c.close();
}

// 상호작용(밝은 테마 한 번씩)
{
  const c = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await c.newPage();
  // hover와 현재 표시 구별
  await p.goto(`${BASE}/learn/security/#nfc`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(100);
  const other = p.locator('[data-toc] a[href="#gps"]');
  await other.hover();
  const [hov, cur] = await Promise.all([other, p.locator('[data-toc] a[aria-current="location"]')].map((l) => l.evaluate((a) => { const s = getComputedStyle(a); return [s.backgroundColor, s.boxShadow, s.fontWeight]; })));
  ok(hov[0] !== cur[0] && hov[1] === 'none' && cur[1] !== 'none' && hov[2] !== cur[2], `hover ${hov} 와 현재 ${cur}가 구별되지 않음`);
  // 목차 누름 → 다른 절 누름 → 뒤로 가기
  await p.locator('[data-toc] a[href="#ble"]').click();
  await p.waitForTimeout(150);
  await p.locator('[data-toc] a[href="#csf"]').click();
  await p.waitForTimeout(150);
  ok((await state(p)).cur[0] === '#csf', '목차 누름: 지금 절이 #csf가 아님');
  await p.goBack();
  await p.waitForTimeout(250);
  const back = await state(p);
  ok(back.cur.length === 1 && back.cur[0] === (back.atEnd ? back.expectedEnd : back.expected), `뒤로 가기: 지금 절 ${back.cur} / 기대 ${back.expected}`);
  // 접힘 펼침 reflow(스크롤 없이 위치가 바뀜)
  await p.goto(`${BASE}/lab/nfc/#ch-9`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.querySelectorAll('main details').forEach((d) => (d.open = true)));
  await p.waitForTimeout(250);
  const re = await state(p);
  ok(re.cur.length === 1 && re.cur[0] === re.expected, `펼침 reflow: 지금 절 ${re.cur} / 기대 ${re.expected}`);
  // 본문 링크: 색과 밑줄, 대비 4.5 이상, strong과 구별, 외부 표시, 용어 링크 점선
  await p.goto(`${BASE}/learn/security/#nfc`, { waitUntil: 'networkidle' });
  for (const scheme of ['light', 'dark']) {
    await p.emulateMedia({ colorScheme: scheme });
    await p.evaluate((t) => { localStorage.removeItem('esp32div.theme'); document.documentElement.dataset.theme = t; }, scheme);
    await p.waitForTimeout(400); // 링크 색 전환(120ms)이 끝난 뒤 잰다
    const m = await p.evaluate(() => {
      const rgb = (c) => { const x = document.createElement('canvas').getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const lum = (c) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const ratio = (a, b2) => { const [x, y] = [lum(a), lum(b2)].sort((p2, q) => q - p2); return (x + 0.05) / (y + 0.05); };
      const bg = getComputedStyle(document.body).backgroundColor;
      const pick = (sel) => { const a = document.querySelector(sel); const s = getComputedStyle(a); const after = getComputedStyle(a, '::after').content; return { color: s.color, line: s.textDecorationLine, style: s.textDecorationStyle, weight: s.fontWeight, ratio: ratio(s.color, bg), after }; };
      const strong = getComputedStyle(document.querySelector('.doc__main strong'));
      return { internal: pick('.doc__main p a[href^="/"]:not([class])'), external: pick('#nfc p.small a[href^="http"]'), source: pick('.sources a'), term: pick('#nfc .term-link'), go: pick('#nfc .go-link'), strong: [strong.color, strong.textDecorationLine, strong.fontWeight] };
    });
    for (const k of ['internal', 'external']) ok(m[k].line === 'underline' && m[k].ratio >= 4.5 && (m[k].color !== m.strong[0] || m[k].weight !== m.strong[2]), `${scheme} ${k} 링크 ${JSON.stringify(m[k])} / strong ${m.strong}`);
    ok(/↗/.test(m.external.after) && !/↗/.test(m.source.after) && !/↗/.test(m.internal.after), `${scheme} 외부 표시 ${m.external.after} / 출처 ${m.source.after} / 내부 ${m.internal.after}`);
    ok(m.term.style === 'dotted', `${scheme} 용어 링크 밑줄 ${m.term.style}`);
    const go = await p.locator('#nfc .go-link').first().boundingBox();
    ok(go.height >= 44, `${scheme} 실험 연계 행 높이 ${go.height}`);
  }
  await c.close();
}
{
  // 모바일 절 바: Enter 열기 → Tab 패널 → Escape 닫고 초점 복귀, 밖 클릭, 링크 누름
  const c = await b.newContext({ viewport: { width: 375, height: 760 } });
  const p = await c.newPage();
  await p.goto(`${BASE}/learn/security/#ble`, { waitUntil: 'networkidle' });
  const sum = p.locator('.toc-bar__toggle');
  await sum.focus(); await p.keyboard.press('Enter');
  ok(await p.locator('.toc-bar__menu').evaluate((d) => d.open), '절 바: Enter로 열리지 않음');
  const pb = await p.locator('.toc-bar__panel').boundingBox();
  ok(pb.y + pb.height <= 761 && pb.x >= 0 && pb.x + pb.width <= 376, `절 바: 패널이 화면 밖 ${JSON.stringify(pb)}`);
  ok(await p.locator('.toc-bar__list a[aria-current="location"]').count() === 1, '절 바: 패널의 현재 절이 하나가 아님');
  await p.keyboard.press('Tab');
  ok(await p.evaluate(() => !!document.activeElement.closest('.toc-bar__panel')), '절 바: Tab이 패널로 가지 않음');
  await p.keyboard.press('Escape');
  ok(!(await p.locator('.toc-bar__menu').evaluate((d) => d.open)) && await p.evaluate(() => document.activeElement.classList.contains('toc-bar__toggle')), '절 바: Escape로 닫고 초점 복귀 실패');
  await sum.click(); await p.mouse.click(5, 740);
  ok(!(await p.locator('.toc-bar__menu').evaluate((d) => d.open)), '절 바: 밖 클릭으로 닫히지 않음');
  await sum.click(); await p.locator('.toc-bar__list a[href="#gps"]').click();
  await p.waitForTimeout(200);
  const s = await state(p);
  ok(!(await p.locator('.toc-bar__menu').evaluate((d) => d.open)) && s.cur[0] === '#gps' && s.bar.now === s.labels['#gps'], `절 바: 링크 누름 후 ${s.cur} ${s.bar?.now}`);
  if (SHOTS) { await sum.click(); await p.waitForTimeout(80); await p.screenshot({ path: `${SHOTS}/tocbar-open-375.png` }); }
  await c.close();
}
// JS 끔: 정적 목차와 링크가 그대로, 절 바 없음
for (const w of [375, 1280]) {
  const c = await b.newContext({ viewport: { width: w, height: 860 }, javaScriptEnabled: false });
  const p = await c.newPage();
  for (const route of ['/learn/security/', '/lab/nfc/']) {
    await p.goto(BASE + route);
    ok(await p.locator('[data-toc]').isVisible() && await p.locator('[data-toc] a').count() > 5 && await p.locator('.toc-bar').count() === 0, `JS 끔 ${w} ${route}: 정적 목차가 보이지 않거나 절 바가 있음`);
  }
  await c.close();
}
// 200% 확대(1280×900을 2배): 절 바와 패널이 화면 안
{
  const c = await b.newContext({ viewport: { width: 640, height: 450 }, deviceScaleFactor: 2 });
  const p = await c.newPage();
  await p.goto(`${BASE}/learn/security/#nfc`, { waitUntil: 'networkidle' });
  const s = await state(p);
  ok(s.bar && s.bar.h <= 56 && s.ow <= 0 && s.cur[0] === '#nfc', `200%: ${JSON.stringify(s.bar)} 넘침 ${s.ow} 지금 ${s.cur}`);
  await p.locator('.toc-bar__toggle').click();
  const pb = await p.locator('.toc-bar__panel').boundingBox();
  ok(pb.y + pb.height <= 451, `200%: 패널 ${JSON.stringify(pb)}`);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/zoom200-tocbar.png` });
  await c.close();
}
await b.close();
console.log(`toc spy: 목차 ${tocPages}개 정적 전수, 대표 ${ROUTES.length}페이지 × 375/768/1280, #앵커·뒤로 가기·reflow·절 바·JS 끔·200%·링크 대비 — ${checks}건`);
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'PASS');
process.exitCode = fails.length ? 1 : 0;
