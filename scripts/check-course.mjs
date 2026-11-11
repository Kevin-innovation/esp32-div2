// Python 과정 1~8차시 페이지 검사(headless test-chromium만). 미리보기 서버(127.0.0.1:4329)가 떠 있어야 한다.
// - 원문 발췌(‘원문 a~b줄’)가 실제 미션 코드(또는 NFC 노트북)의 같은 줄과 글자까지 같은지
// - 코드 블록 복사 = 화면, 학생용·교사용·예상 출력·통합 파일 내려받기 = 화면
// - 차시 내비게이션 순서와 현재 표시, 과정 페이지와 13개 미션 9장의 #링크가 실제 id를 가리키는지
// - 접힌 해설을 키보드로 열고 닫기, 375 dark·1280 light에서 가로 넘침 0, console 0
// 실행: node scripts/check-course.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const root = path.resolve(import.meta.dirname, '..');
const { MISSIONS, NOTEBOOK } = await import(`${root}/src/data/missionCode.ts`);
const { COURSE } = await import(`${root}/src/data/pythonCourseMap.ts`);
const { MAPS } = await import(`${root}/src/data/pythonMissions.ts`);
const BASE = 'http://127.0.0.1:4329';
const SRC = { ...Object.fromEntries(MISSIONS.map((m) => [`${m.id}-colab.py`, m.code])), 'nfc-analysis.py': NOTEBOOK };
const fails = [];
let excerpts = 0, copies = 0, downloads = 0, links = 0;

// 링크 대상: dist의 각 페이지 id 목록
const ids = new Map();
const pageIds = (route) => {
  if (!ids.has(route)) {
    const f = path.join(root, 'dist', route, 'index.html');
    ids.set(route, fs.existsSync(f) ? new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])) : null);
  }
  return ids.get(route);
};

const b = await chromium.launch({ headless: true, executablePath: path.join(homedir(), '.agents/bin/test-chromium') });
const routes = COURSE.map((c) => c.href);
for (const [w, scheme] of [[1280, 'light'], [375, 'dark']]) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme, acceptDownloads: true });
  await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  for (const route of routes) {
    const p = await c.newPage();
    const errs = [];
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(BASE + route, { waitUntil: 'networkidle' });
    const tag = `${route} ${w} ${scheme}`;
    // 차시 내비게이션
    const nav = await p.locator('.course-nav a').evaluateAll((as) => as.map((a) => [a.getAttribute('href'), a.getAttribute('aria-current')]));
    if (nav.length !== 8) fails.push(`${tag}: 차시 링크 ${nav.length}개`);
    const cur = nav.filter(([, a]) => a === 'page').map(([h]) => h);
    if (cur.length !== 1 || !cur[0].endsWith(route)) fails.push(`${tag}: 현재 차시 표시 ${cur}`);
    const i = routes.indexOf(route);
    const next = await p.locator('.course-end .path-link--next').getAttribute('href').catch(() => null);
    if ((next ?? null) !== (routes[i + 1] ?? null) && !(next && routes[i + 1] && next.endsWith(routes[i + 1]))) fails.push(`${tag}: 다음 차시 링크 ${next}`);
    // 키보드로 접힌 해설 열고 닫기
    const sum = p.locator('main details:not(.nav-item__more) > summary').first();
    if (await sum.count()) {
      await sum.focus(); await p.keyboard.press('Enter');
      const open = await sum.evaluate((s) => s.parentElement.open);
      await p.keyboard.press(' ');
      const closed = await sum.evaluate((s) => !s.parentElement.open);
      if (!open || !closed) fails.push(`${tag}: 키보드로 details를 열고 닫지 못함`);
    }
    const ow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (ow > 0) fails.push(`${tag}: 가로 넘침 ${ow}px`);
    if (w === 1280) {
      await p.evaluate(() => document.querySelectorAll('main details').forEach((d) => (d.open = true)));
      // 링크 대상
      const hrefs = await p.locator('main a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      for (const h of new Set(hrefs)) {
        if (/^https?:/.test(h)) continue;
        const [r, hash] = h.split('#');
        const target = r === '' ? route : r;
        const set = pageIds(target);
        if (set === null) fails.push(`${tag}: 없는 페이지 ${h}`);
        else if (hash && !set.has(hash)) fails.push(`${tag}: 없는 앵커 ${h}`);
        links++;
      }
      // 코드 블록
      for (const fig of await p.locator('main figure[data-cb]').all()) {
        const file = await fig.getAttribute('data-file');
        const text = await fig.locator('pre code').evaluate((e) => e.textContent);
        const meta = await fig.locator('.cb__meta').textContent();
        const m = meta.match(/원문 (\d+)~(\d+)줄/);
        if (m && SRC[file]) {
          const src = SRC[file].split('\n').slice(+m[1] - 1, +m[2]).join('\n');
          if (src !== text) fails.push(`${tag} ${file} ${meta}: 발췌가 원문 줄과 다름`); else excerpts++;
        } else if (m) fails.push(`${tag} ${file}: 원문 파일을 알 수 없음`);
        const copy = fig.locator('[data-copy]');
        if (await copy.count()) {
          await copy.scrollIntoViewIfNeeded(); await copy.click();
          if (await p.evaluate(() => navigator.clipboard.readText()) !== text) fails.push(`${tag} ${file}: 복사 ≠ 화면`); else copies++;
        }
        if (/-(student|teacher)\.py$|-expected\.txt$|integration-nfc\.py$/.test(file)) {
          const [dl] = await Promise.all([p.waitForEvent('download'), fig.locator('[data-save]').click()]);
          if (dl.suggestedFilename() !== file || fs.readFileSync(await dl.path(), 'utf8') !== text) fails.push(`${tag} ${file}: 내려받은 파일 ≠ 화면`); else downloads++;
        }
      }
    }
    if (errs.length) fails.push(`${tag}: console ${errs.slice(0, 2).join(' ; ')}`);
    await p.close();
  }
  await c.close();
}

// 13개 미션 9장: 과정과 그 미션 코드 지도로 가는 링크
const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await c.newPage();
for (const m of MAPS) {
  await p.goto(`${BASE}/lab/${m.id}/`, { waitUntil: 'domcontentloaded' });
  const hs = await p.locator('#ch-9 .wb-prereq a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  if (!hs.some((h) => h.endsWith(`/learn/python-colab/missions/#m-${m.id}`))) fails.push(`/lab/${m.id}/ 9장: 코드 지도 링크 없음`);
  if (!hs.some((h) => h.endsWith('/learn/python-colab/#course'))) fails.push(`/lab/${m.id}/ 9장: 과정 링크 없음`);
  for (const h of hs) {
    const [r, hash] = h.split('#');
    const set = pageIds(r);
    if (!set || (hash && !set.has(hash))) fails.push(`/lab/${m.id}/ 9장: 없는 대상 ${h}`);
    links++;
  }
}
await b.close();
console.log(`course pages ${routes.length}개 × 1280 light·375 dark: 발췌 ${excerpts}개 원문 일치, 복사 ${copies}개, 내려받기 ${downloads}개 일치, 링크 ${links}개 대상 확인, 키보드 details, 넘침·console`);
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'PASS');
process.exitCode = fails.length ? 1 : 0;
