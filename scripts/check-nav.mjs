// node scripts/check-nav.mjs [origin] — 상단 메뉴 검사. headless testing Chromium만 쓴다.
// hover 열기·닫기(빈틈 이동), 키보드(Enter, Tab, Escape 초점 복귀, 초점이 나가면 닫힘), 터치(한 번에 한 패널, 밖 누르면 닫힘),
// JS 끔(네이티브 details), 현재 위치, 패널이 화면 안에 있는지, 200% 확대, 모든 route가 메뉴나 허브 한 단계로 닿는지.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const origin = process.argv[2] ?? 'http://127.0.0.1:4329';
const root = path.resolve(import.meta.dirname, '..');
const browser = await chromium.launch({ headless: true, executablePath: path.join(homedir(), '.agents/bin/test-chromium') });
let checks = 0;
const errors = [];
const watch = (p) => { p.on('console', (m) => m.type() === 'error' && errors.push(m.text())); p.on('pageerror', (e) => errors.push(String(e))); };
const open = (p, id) => p.locator(`#${id}`).evaluate((d) => d.open);
const SECTIONS = [['nav-learn', '수업 시작'], ['nav-lab', '실습 미션'], ['reference-nav', '참고 자료']];

// 패널이 화면 안에 있고, 넘치면 패널 안에서 스크롤되는지
async function panelFits(p, id, label) {
  const m = await p.locator(`#${id} > .nav-panel`).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { l: r.left, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight, sh: el.scrollHeight, ch: el.clientHeight, ov: getComputedStyle(el).overflowY, page: document.documentElement.scrollWidth - innerWidth };
  });
  assert.ok(m.l >= 0 && m.r <= m.w + 0.5, `${label} ${id}: 패널이 가로로 화면 밖 ${JSON.stringify(m)}`);
  assert.ok(m.b <= m.h + 0.5, `${label} ${id}: 패널 아래가 화면 밖 ${JSON.stringify(m)}`);
  assert.ok(m.sh <= m.ch + 1 || m.ov === 'auto', `${label} ${id}: 넘치는데 내부 스크롤 없음`);
  assert.equal(m.page, 0, `${label} ${id}: 페이지 가로 넘침`);
  checks += 4;
}

try {
  for (const width of [375, 768, 1280]) for (const theme of ['light', 'dark']) {
    const label = `${width} ${theme}`;
    const c = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 900 }, colorScheme: theme });
    const p = await c.newPage(); watch(p);
    await p.goto(`${origin}/learn/nfc/`, { waitUntil: 'networkidle' });
    const nav = p.getByRole('navigation', { name: '주요 메뉴', exact: true });
    // 허브 링크 유지와 현재 위치
    assert.equal(await nav.getByRole('link', { name: '수업 시작', exact: true }).getAttribute('href'), '/learn/');
    assert.equal(await nav.getByRole('link', { name: '실습 미션', exact: true }).getAttribute('href'), '/lab/');
    assert.equal(await nav.getByRole('link', { name: '수업 시작', exact: true }).getAttribute('aria-current'), 'true');
    assert.equal(await p.locator('#nav-learn a[href="/learn/nfc/"]').getAttribute('aria-current'), 'page');
    assert.equal(await p.locator('.nav-item__link[href="/lab/"]').getAttribute('aria-current'), null);
    checks += 5;
    for (const [id] of SECTIONS) assert.equal(await open(p, id), false), checks++;

    // hover: 링크에 올리면 열리고, 빈틈을 지나 패널 링크로 가도 열려 있고, 벗어나면 닫힌다
    const link = p.locator('.nav-item__link[href="/learn/"]');
    await link.hover(); await p.waitForTimeout(50);
    assert.equal(await open(p, 'nav-learn'), true, `${label}: hover로 열리지 않음`);
    const target = p.locator('#nav-learn .nav-panel a').nth(1);
    const a = await link.boundingBox(); const t = await target.boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await p.mouse.move(t.x + 10, t.y + t.height / 2, { steps: 12 });
    await p.waitForTimeout(300);
    assert.equal(await open(p, 'nav-learn'), true, `${label}: 패널로 옮기는 중 닫힘`);
    await p.mouse.move(5, (width === 375 ? 812 : 900) - 5); await p.waitForTimeout(400);
    assert.equal(await open(p, 'nav-learn'), false, `${label}: 벗어나도 닫히지 않음`);
    checks += 3;
    // hover로 연 패널의 토글을 눌러도 닫히지 않는다(한 번 더 누르면 닫힘)
    await p.locator('#nav-lab > summary').hover(); await p.waitForTimeout(50);
    await p.locator('#nav-lab > summary').click();
    assert.equal(await open(p, 'nav-lab'), true); checks++;
    await p.locator('#nav-lab > summary').click();
    assert.equal(await open(p, 'nav-lab'), false); checks++;
    await p.mouse.move(5, 600); await p.waitForTimeout(300);

    // 키보드: Enter로 열고 Tab으로 패널 안, Escape로 닫고 토글로 초점 복귀
    for (const [id] of SECTIONS) {
      const s = p.locator(`#${id} > summary`);
      await s.focus(); await p.keyboard.press('Enter');
      assert.equal(await open(p, id), true, `${label} ${id}: Enter`);
      await panelFits(p, id, label);
      await p.keyboard.press('Tab');
      assert.ok(await p.evaluate((i) => document.getElementById(i).contains(document.activeElement), id), `${label} ${id}: Tab이 패널로 가지 않음`);
      await p.keyboard.press('Escape');
      assert.equal(await open(p, id), false, `${label} ${id}: Escape`);
      assert.ok(await s.evaluate((el) => el === document.activeElement), `${label} ${id}: 초점 복귀`);
      checks += 4;
    }
    // 키보드로 패널 끝까지 Tab하면 묶음을 벗어나면서 닫힌다
    await p.locator('#reference-nav > summary').focus(); await p.keyboard.press('Enter');
    const n = await p.locator('#reference-nav a').count();
    for (let i = 0; i <= n; i++) await p.keyboard.press('Tab');
    assert.equal(await open(p, 'reference-nav'), false, `${label}: 초점이 나가도 열려 있음`); checks++;
    // 밖을 누르면 닫히고, 한 번에 하나만 열린다
    await p.locator('#nav-learn > summary').focus(); await p.keyboard.press('Enter');
    await p.locator('#nav-lab > summary').focus(); await p.keyboard.press('Enter');
    assert.equal(await open(p, 'nav-learn'), false); assert.equal(await open(p, 'nav-lab'), true); checks += 2;
    await p.mouse.click(5, (width === 375 ? 812 : 900) - 5);
    assert.equal(await open(p, 'nav-lab'), false); checks++;
    // 테마 토글이 메뉴에 가리지 않는다
    const before = await p.locator('html').getAttribute('data-theme');
    await p.getByRole('switch').click();
    assert.notEqual(await p.locator('html').getAttribute('data-theme'), before); await p.getByRole('switch').click(); checks++;
    await c.close();
  }

  // 터치: hover 없이 눌러서 열고, 다른 묶음을 누르면 앞 패널이 닫히고, 밖을 누르면 닫힌다
  {
    const c = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const p = await c.newPage(); watch(p);
    await p.goto(`${origin}/lab/`, { waitUntil: 'networkidle' });
    await p.locator('#nav-learn > summary').tap(); assert.equal(await open(p, 'nav-learn'), true);
    await p.locator('#reference-nav > summary').tap(); assert.equal(await open(p, 'nav-learn'), false); assert.equal(await open(p, 'reference-nav'), true);
    // 패널이 본문을 덮으므로 머리글의 빈 곳(사이트 이름과 테마 스위치 사이)을 누른다
    const wm = await p.locator('.wordmark').boundingBox(); const sw = await p.getByRole('switch').boundingBox();
    await p.touchscreen.tap((wm.x + wm.width + sw.x) / 2, wm.y + wm.height / 2); await p.waitForTimeout(50);
    assert.equal(await open(p, 'reference-nav'), false);
    await p.locator('#nav-lab > summary').tap(); await panelFits(p, 'nav-lab', 'touch');
    assert.equal(await p.locator('.nav-item__link[href="/lab/"]').getAttribute('aria-current'), 'page');
    checks += 6;
    await c.close();
  }

  // 200% 확대(1280 화면을 640 CSS px로)
  {
    const c = await browser.newContext({ viewport: { width: 640, height: 450 }, deviceScaleFactor: 2 });
    const p = await c.newPage(); watch(p);
    await p.goto(`${origin}/learn/`, { waitUntil: 'networkidle' });
    for (const [id] of SECTIONS) { await p.locator(`#${id} > summary`).click(); await panelFits(p, id, 'zoom200'); await p.keyboard.press('Escape'); }
    await c.close();
  }

  // JS 끔: 네이티브 details로 열고, 허브 링크는 그대로
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
    const p = await c.newPage();
    await p.goto(`${origin}/start/`, { waitUntil: 'load' });
    for (const [id, name] of SECTIONS) {
      await p.locator(`#${id} > summary`).click();
      assert.equal(await open(p, id), true, `JS 끔 ${id}`);
      assert.ok(await p.locator(`#${id} .nav-panel a`).first().isVisible(), `JS 끔 ${id} 링크`);
      await p.locator(`#${id} > summary`).click();
      checks += 2;
      if (id !== 'reference-nav') assert.ok(await p.getByRole('link', { name, exact: true }).isVisible()), checks++;
    }
    assert.equal(await p.locator('.nav-item__link[href="/learn/"]').getAttribute('aria-current'), 'true'); checks++;
    await c.close();
  }

  // 도달성: 빌드된 모든 페이지가 메뉴 링크이거나 허브(학습 안내, 실습 목록, 기능 가이드) 한 단계 안에 있다
  {
    const pages = [];
    const walk = (dir) => { for (const f of readdirSync(dir)) { const full = path.join(dir, f); if (statSync(full).isDirectory()) walk(full); else if (f === 'index.html') pages.push('/' + path.relative(path.join(root, 'dist'), dir).split(path.sep).join('/') + (dir.endsWith('dist') ? '' : '/')); } };
    walk(path.join(root, 'dist'));
    const routes = pages.map((r) => r.replace(/^\/+/, '/').replace(/\/\/$/, '/')).filter((r) => r !== '/404/');
    const c = await browser.newContext(); const p = await c.newPage();
    const hrefs = async (url, sel) => { await p.goto(origin + url, { waitUntil: 'load' }); return p.locator(sel).evaluateAll((as) => as.map((a) => new URL(a.href).pathname)); };
    const menu = new Set(await hrefs('/', '.nav a, .wordmark'));
    const reach = new Set(menu);
    for (const hub of ['/learn/', '/lab/', '/guide/']) for (const h of await hrefs(hub, 'main a')) reach.add(h);
    const missing = routes.filter((r) => !reach.has(r));
    assert.deepEqual(missing, [], `메뉴나 허브로 닿지 않는 페이지: ${missing.join(', ')}`);
    const notMenu = routes.filter((r) => !menu.has(r));
    console.log(`도달성: 페이지 ${routes.length}개 모두 도달. 메뉴에 직접 없는 페이지 ${notMenu.length}개(허브 경유): ${notMenu.join(' ')}`);
    checks += routes.length;
    await c.close();
  }
  assert.deepEqual(errors, [], `console 오류: ${errors.slice(0, 3).join(' ; ')}`);
  console.log(`PASS nav ${checks} checks; 375/768/1280 × light/dark hover·keyboard·Escape·focusout·outside·one-at-a-time, touch, zoom200, JS off, reachability; console 0`);
} finally {
  await browser.close();
}
