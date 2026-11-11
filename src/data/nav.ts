// 상단 메뉴의 세 묶음. 링크는 모두 실제 페이지나 그 안의 앵커이며, 입문처럼 한 페이지인 것은 앵커로만 나눈다.
// 메뉴에 없는 페이지(기능 가이드의 묶음 8개)는 허브 /guide/에서 이어진다. 홈은 사이트 이름, 404는 제외.
import { LEARNING_PATH } from './learn';
import { COURSE } from './pythonCourseMap';

export interface NavLink { href: string; label: string; n?: string; note?: string; sub?: NavLink[] }
export interface NavGroup { id: string; title: string; hint?: string; links: NavLink[]; feature?: boolean }
export interface NavSection { id: 'learn' | 'lab' | 'reference'; label: string; hub?: string; hubLabel?: string; hint: string; groups: NavGroup[] }

const STEP_LABELS = ['기술이 생긴 배경', '기기 준비', '첫 태그 읽기', 'NFC 통신 원리', 'Wi-Fi와 네트워크', '정보보호 관점', '실험·분석·보고서'];

export const NAV: NavSection[] = [
  {
    id: 'learn', label: '수업 시작', hub: '/learn/', hubLabel: '학습 안내 전체 보기',
    hint: '0단계부터 차례로 따라가는 기본 NFC 수업입니다.',
    groups: [
      { id: 'start', title: '시작하기', links: [
        { href: '/learn/', label: '학습 안내', note: '전체 순서와 준비물' },
        { href: '/learn/#classes', label: '차시 제안', note: '기본 A~E와 선택 차시' },
      ] },
      { id: 'path', title: '기본 순서 0~6', links: LEARNING_PATH.map((s) => ({ href: s.href, n: String(s.n), label: STEP_LABELS[s.n] })) },
      { id: 'device', title: '기기 첫 사용', hint: '1~2단계를 할 때 펼쳐 봅니다.', links: [
        { href: '/start/#parts', label: '구성품과 안테나' },
        { href: '/start/#power', label: '전원과 USB-C' },
        { href: '/start/#controls', label: '버튼과 메인 메뉴' },
        { href: '/start/#sd', label: 'SD 카드' },
        { href: '/learn/device/#reader', label: 'Card Reader로 태그 읽기' },
      ] },
      { id: 'python', title: 'Python 과정 · 선택', feature: true, hint: '미션 8장을 마치고 9장 Colab 코드를 혼자 쓰고 싶을 때. 기초(1~5) → 직접 작성(6) → 미션별 응용(7~8).', links: COURSE.map((c) => ({
        href: c.href, n: String(c.n), label: c.title,
        note: c.n === 1 ? 'Colab 실행, 셀 8개 맛보기' : c.n === 6 ? '미션 9장 결과와 같게 직접 작성' : c.n === 8 ? '13개 미션 고유 계산·졸업 과제' : undefined,
      })) },
    ],
  },
  {
    id: 'lab', label: '실습 미션', hub: '/lab/', hubLabel: '실습 미션 13개 전체 보기',
    hint: '01 NFC는 기본 실습, 02~13은 관심 주제부터 고르는 선택 미션입니다.',
    groups: [
      { id: 'basic', title: '기본 실습', links: [{ href: '/lab/nfc/', n: '01', label: 'NFC 지갑·가방 인식' }] },
      { id: 'wifi', title: 'Wi-Fi', links: [
        { href: '/lab/wifi-rssi/', n: '02', label: '방별 신호 세기' },
        { href: '/lab/ssid-map/', n: '03', label: '같은 이름의 Wi-Fi' },
        { href: '/lab/wpa-pmf/', n: '04', label: 'WPA·PMF 설정' },
        { href: '/lab/channel/', n: '05', label: '채널 혼잡' },
      ] },
      { id: 'ble', title: 'BLE', links: [
        { href: '/lab/ble-ad/', n: '06', label: 'BLE 광고와 추적' },
        { href: '/lab/ble-pair/', n: '07', label: 'BLE 페어링' },
      ] },
      { id: 'signal', title: '신호와 리모컨', links: [
        { href: '/lab/interference/', n: '08', label: '2.4GHz 간섭' },
        { href: '/lab/ir/', n: '09', label: 'IR 리모컨 명령' },
        { href: '/lab/subghz/', n: '10', label: '433MHz 리모컨' },
        { href: '/lab/gps/', n: '11', label: 'GPS 위치 신뢰' },
      ] },
      { id: 'data', title: '데이터와 보안', links: [
        { href: '/lab/firmware/', n: '12', label: '펌웨어 출처 확인' },
        { href: '/lab/csv/', n: '13', label: 'CSV 가명처리' },
      ] },
    ],
  },
  {
    id: 'reference', label: '참고 자료',
    hint: '수업 중 막히거나 더 알고 싶을 때 찾아봅니다.',
    groups: [
      { id: 'device', title: '기기와 기능', links: [
        { href: '/device/', label: '기기 알아보기', note: '부품과 표기, 원본 사진' },
        { href: '/guide/', label: '기능 가이드', note: '메뉴 8묶음의 기능' },
        { href: '/update/', label: '업데이트·문제 해결', note: '펌웨어와 고장 대처' },
      ] },
      { id: 'read', title: '찾아 읽기', links: [
        { href: '/learn/glossary/', label: '용어 사전', note: '낯선 말 찾기' },
        { href: '/learn/projects/', label: '기술노트', note: '주제별 배경과 탐구 질문' },
        { href: '/learn/security/', label: '정보보호 관점', note: '5단계 본문' },
      ] },
    ],
  },
];

/** 현재 경로가 속한 묶음. /lab/은 실습, 참고 자료의 페이지(와 기능 가이드 하위)는 참고, 나머지 /learn/과 /start/는 수업. */
export function navSection(path: string): NavSection['id'] | undefined {
  if (path.startsWith('/lab/')) return 'lab';
  if (['/device/', '/guide/', '/update/', '/learn/glossary/', '/learn/projects/'].some((p) => path.startsWith(p))) return 'reference';
  if (path.startsWith('/learn/') || path === '/start/') return 'learn';
  return undefined;
}
