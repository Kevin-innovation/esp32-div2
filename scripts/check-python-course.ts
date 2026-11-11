// Python 과정(2~6, 8차시) 검사: 모든 예제·빈칸 정답·직접 작성 정답·함정·변형 코드를 실제로 실행해 저장된 출력과 대조하고,
// 학생용 틀(빈칸, 직접 작성 칸)이 실행되지 않으며 확인 셀이 정답 없이는 실패하고 정답과 함께 통과하는지 본다.
// 8차시 과제는 미션 9장 검증용 JSON과, 통합 과제는 NFC 9장 예상 출력과 같아야 한다.
// 실행: PYTHON=<pandas·matplotlib가 있는 python> node scripts/check-python-course.ts [--write]
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import colab from '../src/lib/workbooks/colab-output.json' with { type: 'json' };
import { LESSONS } from '../src/data/pythonCourseMap.ts';
import { lessonFiles, taskFiles, transferFiles } from '../src/data/pythonFiles.ts';
import { checkCode, filled, TODO } from '../src/data/pythonCourse.ts';
import { BUILT_TASKS, INTEGRATED, NFC_CALC, TRANSFER } from '../src/data/pythonMissions.ts';

const PY = process.env.PYTHON ?? 'python3';
const WRITE = process.argv.includes('--write');
const root = path.resolve(import.meta.dirname, '..');
const MARK = '@@MARK@@';
type Run = { out: string; err: string | null };
type Job = { id: string; code: string; expect: 'ok' | 'pass' | 'fail' | 'blank' | 'todo' | 'any' };
const jobs: Job[] = [];
const add = (id: string, code: string, expect: Job['expect']) => {
  assert.ok(!jobs.some((j) => j.id === id), `id가 겹칩니다: ${id}`);
  jobs.push({ id, code, expect });
};
const after = (ctx: string, code: string) => (ctx ? `${ctx}\nprint(${JSON.stringify(MARK)})\n${code}` : code);

for (const l of LESSONS) {
  l.steps.forEach((s, k) => {
    const id = `${l.slug}/${s.id}`;
    const ctx = l.chain ? l.steps.slice(0, k).map((x) => filled(x.blank)).join('\n\n') : '';
    const here = l.chain ? [ctx, filled(s.blank)].filter(Boolean).join('\n\n') : '';
    if (s.example) add(`${id}/example`, s.example, 'ok');
    add(`${id}/blank`, after(ctx, s.blank.code), 'blank');
    add(`${id}/filled`, after(ctx, filled(s.blank) + (s.check ? `\n${checkCode(s.check)}` : '')), s.check ? 'pass' : 'ok');
    if (s.check) add(`${id}/nocheat`, after(ctx, checkCode(s.check)), 'fail');
    if (s.write) {
      const setup = s.write.setup ? `${s.write.setup}\n` : '';
      add(`${id}/write`, `${setup}${s.write.answer}\n${checkCode(s.write.check)}`, 'pass');
      add(`${id}/todo`, `${setup}${TODO(s.write.task)}\n${checkCode(s.write.check)}`, 'todo');
      add(`${id}/nocheat`, `${setup}${checkCode(s.write.check)}`, 'fail');
    }
    if (s.pitfall) add(`${id}/pitfall`, after(here, s.pitfall.code), 'any');
    if (s.variant?.code) add(`${id}/variant`, after(here, s.variant.code), 'ok');
  });
  const f = lessonFiles(l);
  add(`file/${l.slug}/teacher`, f.teacher, 'ok');
  add(`file/${l.slug}/student`, f.student, 'fail');
}
for (const t of BUILT_TASKS) {
  add(`missions/${t.id}/write`, after(t.setup, `${t.answer}\n${checkCode(t.check)}`), 'pass');
  add(`missions/${t.id}/todo`, after(t.setup, `${TODO(t.q)}\n${checkCode(t.check)}`), 'todo');
  add(`missions/${t.id}/nocheat`, after(t.setup, checkCode(t.check)), 'fail');
  const f = taskFiles(t);
  add(`file/task-${t.id}/teacher`, f.teacher, 'ok');
  add(`file/task-${t.id}/student`, f.student, 'fail');
}
add('missions/transfer/write', after(TRANSFER.setup, `${TRANSFER.answer}\n${checkCode(TRANSFER.check)}`), 'pass');
add('missions/transfer/todo', after(TRANSFER.setup, `${TODO('BLE 광고 관찰률 분석')}\n${checkCode(TRANSFER.check)}`), 'todo');
add('missions/transfer/nocheat', after(TRANSFER.setup, checkCode(TRANSFER.check)), 'fail');
const tf = transferFiles();
add('file/transfer/teacher', tf.teacher, 'ok');
add('file/transfer/student', tf.student, 'fail');
add('missions/integration', INTEGRATED, 'ok');
const project = LESSONS.find((l) => l.slug === 'project')!;
add('missions/integration-swap', NFC_CALC.swap(['count', 'table'].map((id) => filled(project.steps.find((s) => s.id === id)!.blank)).join('\n')), 'ok');

const dir = mkdtempSync(path.join(tmpdir(), 'py-course-'));
const raw = execFileSync(PY, [path.join(root, 'scripts/py_batch.py')], { cwd: dir, input: JSON.stringify(jobs.map(({ id, code }) => ({ id, code }))), env: { ...process.env, MPLBACKEND: 'Agg' }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const res = JSON.parse(raw) as Record<string, Run>;
const runs: Record<string, Run> = {};
const fails: string[] = [];
for (const j of jobs) {
  const r = res[j.id];
  const i = r.out.indexOf(MARK);
  const out = i < 0 ? r.out : r.out.slice(i + MARK.length).replace(/^\n/, '');
  runs[j.id] = { out, err: r.err };
  const bad = (why: string) => fails.push(`${j.id}: ${why} → ${r.err ?? out.slice(-200)}`);
  if (j.expect === 'ok' && r.err) bad('오류 없이 실행되어야 합니다');
  if (j.expect === 'pass' && (r.err || !out.endsWith('확인 통과'))) bad("확인 셀이 '확인 통과'를 출력해야 합니다");
  if (j.expect === 'fail' && !r.err) bad('정답 없이 실행하면 실패해야 합니다');
  if (j.expect === 'todo' && !r.err?.startsWith('NotImplementedError')) bad('직접 작성 칸이 NotImplementedError를 내야 합니다');
  if (j.expect === 'blank' && !(r.err && (r.err.includes('___') || r.err.startsWith('SyntaxError')))) bad('빈칸을 채우지 않으면 ___ 때문에 실패해야 합니다');
}
const nfc = (colab as Record<string, string>).nfc;
if (runs['missions/integration'].out !== nfc.replace(/\n+$/, '')) fails.push('통합 과제: NFC 원문 영역을 이어 붙인 코드의 출력이 9장 예상 출력과 다릅니다');
const part3 = (t: string) => t.slice(t.indexOf('3. 계산 결과'));
if (part3(runs['missions/integration-swap'].out) !== part3(nfc.replace(/\n+$/, ''))) fails.push('통합 과제: 6차시 7·8단계 코드로 바꾼 NFC 원문의 3. 계산 결과가 9장과 다릅니다');
assert.deepEqual(fails, [], `\n${fails.join('\n')}`);

const file = path.join(root, 'src/data/python-course-output.json');
const keep = Object.fromEntries(Object.entries(runs).filter(([id]) => !/\/(nocheat|todo|blank)$/.test(id) && !id.endsWith('/student')));
if (WRITE) writeFileSync(file, JSON.stringify(keep, null, 1) + '\n');
else assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), keep, '페이지의 예상 출력이 실제 실행 결과와 같아야 합니다(--write로 갱신)');
const count = (e: Job['expect']) => jobs.filter((j) => j.expect === e).length;
console.log(`python course: 실행 ${jobs.length}개(정상 ${count('ok')}, 확인 통과 ${count('pass')}, 정답 없이 실패 ${count('fail')}, 빈칸 실패 ${count('blank')}, 직접 작성 칸 ${count('todo')}, 함정 ${count('any')}), 8차시 과제 ${BUILT_TASKS.length}개가 미션 JSON과 일치, 통합 과제 출력 = NFC 9장${WRITE ? ' (저장함)' : ''}`);
