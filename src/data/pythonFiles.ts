// 차시·과제별 학생용 틀과 교사용 완성 파일. 페이지가 내려받기로 보여 주고 검사 스크립트가 실행한다.
// 학생용 틀은 빈칸(___)과 직접 작성 칸(NotImplementedError) 때문에 그대로는 실행되지 않으며, 교사용 완성은 끝까지 실행된다.
import { checkCode, filled, TODO, type Lesson } from './pythonCourse.ts';
import { TRANSFER, type BuiltTask } from './pythonMissions.ts';

const STUDENT_HEAD = (what: string) => `# ${what} · 학생용 틀
# 이 파일은 그대로 실행되지 않습니다. 빈칸(___)을 채우지 않으면 NameError, AttributeError 또는 SyntaxError가,
# '직접 작성' 칸을 비워 두면 NotImplementedError가 납니다. 오류가 나는 것이 정상입니다.
# Colab에서는 '단계' 주석마다 새 코드 셀에 붙여 넣고 위에서부터 채우며 실행합니다. 확인 셀이 '확인 통과'를 출력하면 다음으로 갑니다.`;
const TEACHER_HEAD = (what: string) => `# ${what} · 교사용 완성본
# 끝까지 실행되며 출력은 함께 내려받는 예상 출력과 같습니다. Colab 기본 글꼴에는 한글이 없어 그림 안 글자는 영문입니다.`;

export function lessonFiles(l: Lesson): { student: string; teacher: string; name: string } {
  const what = `${l.n}차시 ${l.title}`;
  const parts = l.steps.map((s, i) => {
    const head = `# ── 단계 ${i + 1}. ${s.title}`;
    const w = s.write;
    const setup = w?.setup ? `${w.setup}\n` : '';
    const student = [head, '# [빈칸 채우기]', s.blank.code, s.check && `# [확인 셀]\n${checkCode(s.check)}`, w && `# [직접 작성] ${w.task}\n${setup}${TODO(w.task)}\n# [확인 셀]\n${checkCode(w.check)}`].filter(Boolean).join('\n');
    const teacher = [head, filled(s.blank), s.check && checkCode(s.check), w && `# [직접 작성] ${w.task}\n${setup}${w.answer}\n${checkCode(w.check)}`].filter(Boolean).join('\n');
    return { student, teacher };
  });
  return {
    name: `lesson-${l.n}-${l.slug}`,
    student: `${STUDENT_HEAD(what)}\n\n${parts.map((p) => p.student).join('\n\n')}\n`,
    teacher: `${TEACHER_HEAD(what)}\n\n${parts.map((p) => p.teacher).join('\n\n')}\n`,
  };
}

export function taskFiles(t: BuiltTask): { student: string; teacher: string; name: string } {
  const what = `8차시 ${t.n} ${t.mission} 고유 계산`;
  const setup = `# [준비 셀] ${t.n} 미션 9장 코드의 1~${t.setupLines}줄 그대로(고유 계산 앞까지)\n${t.setup}`;
  return {
    name: `lesson-8-${t.id}`,
    student: `${STUDENT_HEAD(what)}\n\n${setup}\n\n# [직접 작성] ${t.q}\n${TODO(t.q)}\n\n# [확인 셀]\n${checkCode(t.check)}\n`,
    teacher: `${TEACHER_HEAD(what)}\n\n${setup}\n\n# [정답 예]\n${t.answer}\n\n# [확인 셀]\n${checkCode(t.check)}\n`,
  };
}

export function transferFiles(): { student: string; teacher: string; name: string } {
  const what = '8차시 전이 과제: BLE 광고 관찰률';
  const plan = TRANSFER.plan.map(([k, q]) => `#   ${k}: ${q}`).join('\n');
  return {
    name: 'lesson-8-transfer-ble',
    student: `${STUDENT_HEAD(what)}\n# 먼저 아래 설계 질문에 주석으로 답을 적고 코드를 씁니다.\n${plan}\n\n${TRANSFER.setup}\n\n# [직접 작성] my 딕셔너리에 미션과 같은 이름표로 결과를 담습니다.\n${TODO('BLE 광고 관찰률 분석')}\n\n# [확인 셀]\n${checkCode(TRANSFER.check)}\n`,
    teacher: `${TEACHER_HEAD(what)}\n\n${TRANSFER.setup}\n\n# [정답 예]\n${TRANSFER.answer}\n\n# [확인 셀]\n${checkCode(TRANSFER.check)}\n`,
  };
}
