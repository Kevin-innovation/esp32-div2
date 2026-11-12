// 목차 현재 위치(scrollspy) 공통 모듈. 페이지의 [data-toc] 목차 하나를 따라 지금 읽는 절을 정하고
// 목차 링크에 aria-current="location"을 단다. 과정 진행바와 모바일 절 바는 같은 상태를 구독한다(계산은 한 번).
// URL과 history는 바꾸지 않고, 본문 스크롤은 #앵커로 처음 들어왔을 때 한 번만 바 높이에 맞춘다.

export interface TocItem { target: HTMLElement; link: HTMLAnchorElement; label: string }
type Listener = (k: number, items: TocItem[]) => void;

const STICKY = '.site-head, .path-top, .toc-bar';
const subs: Listener[] = [];
let items: TocItem[] = [];
let current = -2;
let started = false;

/** 목차 링크 글자: 번호 span과 제목 사이에 공백을 넣는다(워크북의 "01" + 제목). */
export const linkLabel = (a: Element) => [...a.childNodes].map((n) => n.textContent!.trim()).filter(Boolean).join(' ');

const stuck = () => [...document.querySelectorAll<HTMLElement>(STICKY)].filter((el) => el.offsetHeight > 0 && ['sticky', 'fixed'].includes(getComputedStyle(el).position));

function measure() {
  // 붙었을 때 가리는 높이(top + 높이)의 최댓값. scroll-padding-top이 이 값을 쓴다.
  const off = Math.max(0, ...stuck().map((el) => (parseFloat(getComputedStyle(el).top) || 0) + el.offsetHeight));
  document.documentElement.style.setProperty('--toc-offset', `${Math.round(off)}px`);
}

function pick() {
  const edge = Math.max(0, ...stuck().map((el) => el.getBoundingClientRect().bottom)) + 24;
  let k = -1;
  // 대상의 scroll-margin-top(워크북 장 16px)만큼 아래로 이동해 멈추므로 기준선에도 더한다.
  items.forEach((it, j) => { if (it.target.getBoundingClientRect().top <= edge + (parseFloat(getComputedStyle(it.target).scrollMarginTop) || 0)) k = j; });
  const root = document.documentElement;
  if (items.length && scrollY >= root.scrollHeight - innerHeight - 2) {
    // 페이지 끝: 짧은 끝 절은 기준선에 닿지 못해 화면에 보이는 마지막 절을 고른다. 주소(hash)는 기준이 아니다.
    // 예외는 방금 그 절로 이동한 뒤 아직 스크롤하지 않았을 때 하나뿐이다(누른 절이 화면에 있으면 그 절).
    const seen = (j: number) => items[j].target.getBoundingClientRect().top < innerHeight;
    const h = jump && Math.abs(scrollY - jump.y) < 2 ? jump.i : -1;
    if (h > k && seen(h)) k = h;
    else if (h < 0) for (let j = items.length - 1; j > k; j--) if (seen(j)) { k = j; break; }
  }
  return k;
}

/** 방금 이동한 절과 그때의 스크롤 위치. 사용자가 스크롤하면 위치가 달라져 저절로 무효가 된다. */
let jump: { i: number; y: number } | null = null;
const markJump = (hash: string) => {
  const i = items.findIndex((it) => `#${it.target.id}` === decodeURIComponent(hash));
  jump = i < 0 ? null : { i, y: scrollY };
  schedule();
};

/** 현재 항목이 목차 상자(자체 스크롤) 밖이면 상자 안에서만 스크롤한다. */
function keepVisible(link?: HTMLAnchorElement) {
  const box = link?.closest<HTMLElement>('[data-toc]');
  if (!link || !box || box.scrollHeight <= box.clientHeight + 1) return;
  const r = link.getBoundingClientRect(), b = box.getBoundingClientRect();
  if (r.top < b.top) box.scrollTop -= b.top - r.top + 8;
  else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 8;
}

function update() {
  measure();
  const k = pick();
  if (k === current) return;
  current = k;
  items.forEach((it, j) => (j === k ? it.link.setAttribute('aria-current', 'location') : it.link.removeAttribute('aria-current')));
  keepVisible(items[k]?.link);
  subs.forEach((f) => f(k, items));
}

let queued = false;
const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } };

function start() {
  if (started) return;
  started = true;
  const toc = document.querySelector('[data-toc]');
  items = [...(toc?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ?? [])].flatMap((link) => {
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    return target ? [{ target, link, label: linkLabel(link) }] : [];
  });
  measure();
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('hashchange', () => markJump(location.hash));
  addEventListener('load', schedule);
  // 같은 #링크를 다시 누르면 hashchange가 없으므로 누름에서도 기록한다(브라우저가 스크롤한 뒤의 위치).
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[href^="#"]');
    if (a && !e.defaultPrevented) requestAnimationFrame(() => markJump(a.hash));
  });
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(schedule);
    [document.querySelector('main'), ...stuck()].forEach((el) => el && ro.observe(el));
  }
  update();
}

/** #앵커로 처음 들어왔을 때(뒤로 가기 복원은 제외) 실측 바 높이로 한 번 다시 맞춘다. */
export function settleHash() {
  start();
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const el = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (el && nav?.type !== 'back_forward') el.scrollIntoView({ block: 'start' });
  if (el) markJump(location.hash); else schedule();
}

/** 지금 절이 바뀔 때마다 받는다. 등록하면 현재 상태를 바로 한 번 받는다. */
export function onToc(f: Listener) {
  start();
  subs.push(f);
  f(current, items);
}

/** 펼침 메뉴(details) 공통: 열 때 패널을 바 아래부터 화면 끝까지, Escape는 닫고 초점 복귀, 밖 클릭·초점 이탈·링크 누름은 닫기. */
export function wireMenu(menu: HTMLDetailsElement, bar: HTMLElement, panel: HTMLElement) {
  const summary = menu.querySelector('summary')!;
  menu.addEventListener('toggle', () => { if (menu.open) panel.style.maxHeight = `${Math.max(160, innerHeight - bar.getBoundingClientRect().bottom - 12)}px`; });
  const close = (focus: boolean) => { if (!menu.open) return; menu.open = false; if (focus) summary.focus(); };
  menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(true); } });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target as Node)) close(false); });
  menu.addEventListener('focusout', (e) => { const to = e.relatedTarget as Node | null; if (to && !menu.contains(to)) close(false); });
  panel.addEventListener('click', (e) => { if ((e.target as Element).closest('a[href^="#"]')) close(false); });
}
