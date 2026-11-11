// 과정 1~8차시 목록과 '배우는 곳' 링크 해석. 링크 키가 실제 단계나 앵커를 가리키지 않으면 빌드를 멈춘다.
import { BLOCK_GROUPS } from './missionCode.ts';
import { LESSONS_BASIC, type Lesson } from './pythonCourse.ts';
import { PROJECT } from './pythonProject.ts';

export interface CourseEntry { n: number; href: string; title: string; short: string; minutes: number; product: string; done: string[]; stage: '기초' | '직접 작성' | '미션별 응용' }

export const LESSONS: Lesson[] = [...LESSONS_BASIC, PROJECT];
const stage = (n: number): CourseEntry['stage'] => (n <= 5 ? '기초' : n === 6 ? '직접 작성' : '미션별 응용');

export const COURSE: CourseEntry[] = [
  { n: 1, href: '/learn/python-colab/', title: 'Colab 첫 실행과 맛보기', short: 'Colab 셀 실행, 가상 CSV로 셀 8개 따라 하기, 오류 읽기', minutes: 45, product: '셀 8개를 실행한 노트와 summary.csv', done: ['Shift+Enter로 셀을 실행하고 다시 실행한다', '셀 8개의 출력이 예상 출력과 같다', '오류의 마지막 줄을 읽고 오류 이름을 말한다'] },
  ...LESSONS.map((l) => ({ n: l.n, href: l.href, title: l.title, short: l.short, minutes: l.minutes, product: l.product, done: l.done })),
  { n: 7, href: '/learn/mission-code/', title: '미션 코드 읽기', short: 'NFC·WPA-PMF·CSV 원문 줄 묶음 독해, 예측·수정 과제', minutes: 45, product: '독해 완료 체크 7개를 공책에 쓰기', done: ['SOURCE, 열, 유효 행, 그룹 키, 분모, 축, 한계를 세 미션에서 찾는다'] },
  { n: 8, href: '/learn/python-colab/missions/', title: '미션별 코드 지도와 졸업 과제', short: '01~13 코드 지도, 10개 미션 고유 계산 과제, 함수 사전, 통합·전이 과제', minutes: 90, product: '고유 계산 과제와 BLE 전이 과제 통과, 졸업 문장 4개', done: ['내 미션 코드의 모든 영역을 배운 차시와 짝짓는다', '내 미션의 고유 계산을 빈 셀에서 다시 쓴다', 'BLE 전이 과제를 예제 없이 설계해 통과한다', '결과 예측·잘못된 입력·데모 제외·0과 결측을 설명한다'] },
].map((c) => ({ ...c, stage: stage(c.n) }));

const INTRO_ANCHORS = ['when', 'colab', 'syntax', 'csv', 'group', 'plot', 'source', 'full', 'errors'];
const READ_BLOCKS = BLOCK_GROUPS.flatMap((g) => g.blocks.map((b) => b.id));

/** 'basics#loops'(차시 단계), 'python-colab#csv'(1차시 앵커), 'mission-code#wpa-category'(7차시 묶음), 'missions#m-gps'(8차시) */
export function stepHref(key: string): { href: string; label: string } {
  const [page, id] = key.split('#');
  const lesson = LESSONS.find((l) => l.slug === page);
  if (lesson) {
    const i = lesson.steps.findIndex((s) => s.id === id);
    if (i < 0) throw new Error(`단계 없음: ${key}`);
    return { href: `${lesson.href}#step-${id}`, label: `${lesson.n}차시 ${lesson.chain ? '' : `${i + 1}. `}${lesson.steps[i].title.split(':')[0]}` };
  }
  if (page === 'python-colab' && INTRO_ANCHORS.includes(id)) return { href: `/learn/python-colab/#${id}`, label: `1차시 ${id === 'source' ? 'SOURCE' : id === 'csv' ? 'CSV와 DataFrame' : id === 'group' ? '세고 나누기' : id}` };
  if (page === 'mission-code' && READ_BLOCKS.includes(id)) return { href: `/learn/mission-code/#${id}`, label: `7차시 ${BLOCK_GROUPS.flatMap((g) => g.blocks).find((b) => b.id === id)!.title.split(':')[0]}` };
  if (page === 'missions' && id?.startsWith('m-')) return { href: `/learn/python-colab/missions/#${id}`, label: `8차시 ${id.slice(2)} 과제` };
  throw new Error(`배우는 곳 키를 해석할 수 없습니다: ${key}`);
}
