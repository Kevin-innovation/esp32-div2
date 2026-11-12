// Python 과정 진행바 검사(headless test-chromium만). 미리보기 서버(127.0.0.1:4329)가 떠 있어야 한다.
// 8개 차시 × 375/768/1280 × light/dark: 진행바가 스크롤 위·가운데·아래에서 늘 보이고, 현재 차시(aria-current=page)와
// 지금 절(aria-current=location)이 문서 목차 앵커를 따르며, #앵커로 들어오면 제목이 바에 가리지 않고 그 절이 표시되는지,
// 이전/다음 차시, 차시 목록의 키보드·Escape·밖 클릭, 가로 넘침·console, JS 꺼짐, 200% 확대를 본다.
// 실행: node scripts/check-course-bar.mjs [스크린샷 폴더]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const root = path.resolve(import.meta.dirname, '..');
const { COURSE } = await import(`${root}/src/data/pythonCourseMap.ts`);
const BASE = 'http://127.0.0.1:4329';
const SHOTS = process.argv[2];
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };

const state = (p) => p.evaluate(() => {
  const bar = document.querySelector('[data-course-bar]');
  const r = bar.getBoundingClientRect();
  const cur = [...document.querySelectorAll('.doc__aside.toc a[aria-current="location"]')].map((a) => a.hash);
  const panel = [...document.querySelectorAll('[data-sections] a[aria-current="location"]')].map((a) => a.getAttribute('href'));
  return { top: r.top, bottom: r.bottom, h: r.height, now: document.querySelector('[data-now-text]')?.textContent ?? '', cur, panel, y: scrollY, max: document.documentElement.scrollHeight - innerHeight, ow: document.documentElement.scrollWidth - innerWidth };
});

const b = await chromium.launch({ headless: true, executablePath: path.join(homedir(), '.agents/bin/test-chromium') });
for (const w of [375, 768, 1280]) for (const scheme of ['light', 'dark']) {
  const c = await b.newContext({ viewport: { width: w, height: 860 }, colorScheme: scheme });
  for (const [i, lesson] of COURSE.entries()) {
    const p = await c.newPage();
    const errs = [];
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    p.on('pageerror', (e) => errs.push(String(e)));
    const tag = `${lesson.href} ${w} ${scheme}`;
    await p.goto(BASE + lesson.href, { waitUntil: 'networkidle' });
    // 현재 차시와 차시 목록
    const toggle = (await p.locator('.course-bar__toggle').innerText()).replace(/\s+/g, ' ');
    ok(toggle.includes(`${lesson.n}/8차시`) && toggle.includes(lesson.title), `${tag}: 바에 현재 차시 없음 (${toggle})`);
    const lessons = await p.locator('.course-bar__lessons a').evaluateAll((as) => as.map((a) => [a.getAttribute('href'), a.getAttribute('aria-current')]));
    ok(lessons.length === 8, `${tag}: 차시 링크 ${lessons.length}개`);
    const cur = lessons.filter(([, a]) => a === 'page');
    ok(cur.length === 1 && cur[0][0].endsWith(lesson.href), `${tag}: aria-current=page ${JSON.stringify(cur)}`);
    // 이전/다음
    const goes = await p.locator('a.course-bar__go').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    const want = [COURSE[i - 1]?.href, COURSE[i + 1]?.href].filter(Boolean);
    ok(goes.length === want.length && goes.every((h, k) => h.endsWith(want[k])), `${tag}: 이전/다음 ${goes} ≠ ${want}`);
    for (const a of await p.locator('a.course-bar__go').all()) { const bx = await a.boundingBox(); ok(bx.width >= 44 && bx.height >= 44, `${tag}: 이전/다음 누름 영역 ${bx.width}×${bx.height}`); }
    // 스크롤 위·가운데·아래
    const tocIds = await p.locator('.doc__aside.toc a[href^="#"]').evaluateAll((as) => as.map((a) => a.hash));
    for (const [name, frac] of [['top', 0], ['middle', 0.5], ['bottom', 1]]) {
      await p.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), frac);
      await p.waitForTimeout(120);
      const s = await state(p);
      // 데스크톱은 늘 머리글(64px) 바로 아래, 모바일은 머리글이 따라오지 않아 맨 위에서만 머리글 아래 제자리, 내리면 화면 맨 위에 붙는다.
      const stuck = w > 960 ? Math.abs(s.top - 64) <= 1 : (frac === 0 ? s.top >= 0 && s.bottom <= 260 : Math.abs(s.top) <= 1);
      ok(stuck && s.h <= (w > 640 ? 56 : 64), `${tag} ${name}: 바 위치·높이 ${s.top}~${s.bottom} (높이 ${s.h})`);
      ok(s.ow <= 0, `${tag} ${name}: 가로 넘침 ${s.ow}`);
      // 기준선 아래 끝 + 24 위로 올라간 마지막 절. 페이지 끝에서는 화면에 보이는 마지막 절(src/lib/tocSpy.ts와 같은 규칙).
      const expected = await p.evaluate((ids) => {
        const edge = document.querySelector('[data-course-bar]').getBoundingClientRect().bottom + 24;
        const tops = ids.map((id) => document.getElementById(id.slice(1))?.getBoundingClientRect().top ?? Infinity);
        let k = -1; tops.forEach((t, j) => { if (t <= edge) k = j; });
        if (scrollY >= document.documentElement.scrollHeight - innerHeight - 2) for (let j = tops.length - 1; j > k; j--) if (tops[j] < innerHeight) { k = j; break; }
        return k < 0 ? null : ids[k];
      }, tocIds);
      ok(expected === null ? s.cur.length === 0 && s.now === '차시 첫머리' : s.cur.length === 1 && s.cur[0] === expected && s.panel[0] === expected, `${tag} ${name}: 지금 절 ${s.cur} / 기대 ${expected} / 바 "${s.now}"`);
      if (SHOTS && scheme === (w === 375 ? 'dark' : 'light') && w !== 768) await p.screenshot({ path: `${SHOTS}/${lesson.href.replace(/\//g, '_')}-${w}-${scheme}-${name}.png` });
    }
    // #앵커로 들어오기: 제목이 바에 가리지 않고, 그 절(또는 페이지 끝이라 더 내려갈 수 없을 때 뒤 절)이 표시
    if (scheme === 'light' && w !== 768) {
      for (const h of tocIds) {
        await p.goto(`${BASE}${lesson.href}${h}`, { waitUntil: 'networkidle' });
        await p.waitForTimeout(80);
        const s = await state(p);
        const top = await p.evaluate((id) => { const el = document.getElementById(id); const hd = el.matches('h1,h2,h3') ? el : el.querySelector('h2,h3') ?? el; return hd.getBoundingClientRect().top; }, h.slice(1));
        ok(top >= s.bottom - 1, `${tag} ${h}: 제목이 바에 가림 (제목 ${top}, 바 ${s.bottom})`);
        const at = tocIds.indexOf(s.cur[0]);
        ok(s.cur[0] === h || (s.y >= s.max - 2 && at > tocIds.indexOf(h)), `${tag} ${h}: 지금 절 ${s.cur}`);
      }
    }
    // 차시 목록: 키보드 열기 → Tab으로 패널 → Escape 닫고 초점 복귀, 밖 클릭 닫기, 패널은 화면 안에서 스크롤
    await p.goto(BASE + lesson.href, { waitUntil: 'networkidle' });
    const sum = p.locator('.course-bar__toggle');
    await sum.focus(); await p.keyboard.press('Enter');
    ok(await p.locator('[data-course-menu]').evaluate((d) => d.open), `${tag}: Enter로 열리지 않음`);
    const pb = await p.locator('.course-bar__panel').boundingBox();
    const vh = p.viewportSize().height;
    ok(pb.y + pb.height <= vh + 1 && pb.x >= 0 && pb.x + pb.width <= p.viewportSize().width + 1, `${tag}: 패널이 화면 밖 (${JSON.stringify(pb)})`);
    await p.keyboard.press('Tab');
    ok(await p.evaluate(() => !!document.activeElement.closest('.course-bar__panel')), `${tag}: Tab이 패널로 가지 않음`);
    await p.keyboard.press('Escape');
    ok(!(await p.locator('[data-course-menu]').evaluate((d) => d.open)) && await p.evaluate(() => document.activeElement.classList.contains('course-bar__toggle')), `${tag}: Escape로 닫고 초점 복귀 실패`);
    await sum.click();
    await p.mouse.click(5, vh - 5);
    ok(!(await p.locator('[data-course-menu]').evaluate((d) => d.open)), `${tag}: 밖 클릭으로 닫히지 않음`);
    if (SHOTS && i === 1 && scheme === (w === 375 ? 'dark' : 'light') && w !== 768) {
      await sum.click(); await p.waitForTimeout(80);
      await p.screenshot({ path: `${SHOTS}/menu-${w}-${scheme}.png` });
    }
    ok(errs.length === 0, `${tag}: console ${errs.slice(0, 2).join(' ; ')}`);
    await p.close();
  }
  await c.close();
}

// JS 꺼짐: 진행바의 차시 목록(details)과 이전/다음 링크, 모바일 목차가 그대로 보인다
for (const w of [375, 1280]) {
  const c = await b.newContext({ viewport: { width: w, height: 860 }, javaScriptEnabled: false });
  const p = await c.newPage();
  await p.goto(`${BASE}/learn/python-colab/table/`);
  await p.locator('.course-bar__toggle').click();
  ok(await p.locator('.course-bar__lessons a').count() === 8 && await p.locator('.course-bar__lessons a').first().isVisible(), `JS 끔 ${w}: 차시 목록이 열리지 않음`);
  ok(await p.locator('.doc__aside.toc').isVisible(), `JS 끔 ${w}: 목차가 보이지 않음`);
  ok(await p.locator('a.course-bar__go').count() === 2, `JS 끔 ${w}: 이전/다음 링크 없음`);
  await c.close();
}
// 200% 확대(1280×900 화면을 2배): 바는 스크롤 여백(4.5rem) 안, 패널은 화면 안에서 스크롤
{
  const c = await b.newContext({ viewport: { width: 640, height: 450 }, deviceScaleFactor: 2 });
  const p = await c.newPage();
  await p.goto(`${BASE}/learn/python-colab/project/#step-function`, { waitUntil: 'networkidle' });
  const s = await state(p);
  ok(s.h <= 72 && s.ow <= 0, `200%: 바 높이 ${s.h}, 넘침 ${s.ow}`);
  await p.locator('.course-bar__toggle').click();
  const pb = await p.locator('.course-bar__panel').boundingBox();
  ok(pb.y + pb.height <= 451 && await p.locator('.course-bar__panel').evaluate((e) => e.scrollHeight > e.clientHeight), `200%: 패널 ${JSON.stringify(pb)}`);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/zoom200-menu.png` });
  await c.close();
}
await b.close();
console.log(`course bar: 8차시 × 375/768/1280 × light/dark, 스크롤 위·가운데·아래, #앵커 진입, 이전/다음, 차시 목록 키보드·Escape·밖 클릭, JS 끔, 200% 확대 — ${checks}건`);
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'PASS');
process.exitCode = fails.length ? 1 : 0;
