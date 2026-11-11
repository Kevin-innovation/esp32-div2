// Python·Colab 입문 검사: 따라 하기 셀을 한 프로세스에서 차례로 실행해 페이지의 예상 출력과 대조하고,
// 오류 예시가 적힌 오류를 실제로 내는지 확인한다.
// 실행: PYTHON=<pandas·matplotlib가 있는 python> node scripts/check-python-intro.ts [--write]
// --write는 출력을 src/data/python-colab-output.json에, 셀 6 그림을 public/images/python-colab-bar.svg에 저장한다.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CELLS, TROUBLES, fullScript } from '../src/data/pythonColab.ts';

const PY = process.env.PYTHON ?? 'python3';
const WRITE = process.argv.includes('--write');
const root = path.resolve(import.meta.dirname, '..');
const dir = mkdtempSync(path.join(tmpdir(), 'py-intro-'));
const svg = path.join(dir, 'bar.svg');
const MARK = '@@CELL@@';
const run = (code: string) => execFileSync(PY, ['-c', code], { cwd: dir, env: { ...process.env, MPLBACKEND: 'Agg', PYTHONWARNINGS: 'ignore' }, encoding: 'utf8' });

// plt.show()는 Colab에서 그림을 보여 주는 자리라, 검사에서는 같은 그림을 SVG로 저장한다.
const prelude = `import matplotlib\nmatplotlib.use('Agg')\nimport matplotlib.pyplot as _plt\n_plt.rcParams['svg.hashsalt'] = 'intro'\n_plt.rcParams['svg.fonttype'] = 'none'\n_plt.show = lambda: _plt.savefig(${JSON.stringify(svg)})\n`;
const out = run(prelude + CELLS.map((c) => `print(${JSON.stringify(MARK + c.id)})\n${c.code}`).join('\n'));
const cells: Record<string, string> = {};
for (const part of out.split(MARK).slice(1)) {
  const nl = part.indexOf('\n');
  cells[part.slice(0, nl)] = part.slice(nl + 1).replace(/\n+$/, '');
}
assert.deepEqual(Object.keys(cells), CELLS.map((c) => c.id), '모든 셀이 실행되어야 합니다');
assert.ok(existsSync(svg), '셀 6이 그림을 만들어야 합니다');

// 전체 코드(셀을 이어 붙인 .py)도 같은 출력을 내야 한다.
const whole = run(prelude + fullScript()).replace(/\n+$/, '');
assert.equal(whole, CELLS.map((c) => cells[c.id]).filter(Boolean).join('\n'), '전체 코드의 출력이 셀 출력과 같아야 합니다');

const troubles: Record<string, string> = {};
for (const t of TROUBLES) {
  const wrapped = `import traceback\ntry:\n    exec(${JSON.stringify(t.code)})\nexcept Exception as e:\n    print(traceback.format_exception_only(e)[-1].strip())\n`;
  troubles[t.id] = run(wrapped).replace(/\n+$/, '');
  assert.ok(troubles[t.id].includes(t.error), `${t.id}: ${t.error}가 나와야 합니다 → ${troubles[t.id]}`);
}

const file = path.join(root, 'src/data/python-colab-output.json');
const result = { cells, troubles };
if (WRITE) {
  writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
  writeFileSync(path.join(root, 'public/images/python-colab-bar.svg'), readFileSync(svg, 'utf8'));
} else {
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), result, '페이지의 예상 출력이 실제 실행 결과와 같아야 합니다');
}
console.log(`python intro: 셀 ${CELLS.length}개 실행, 전체 코드 출력 일치, 오류 예시 ${TROUBLES.length}개 확인${WRITE ? ' (저장함)' : ''}`);
