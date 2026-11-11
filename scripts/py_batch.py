# 교안 코드 묶음 실행기. stdin으로 [{"id", "code"}]를 받아 각 코드를 새 이름공간에서 차례로 실행하고
# {"id": {"out": 출력, "err": 마지막 오류 줄 또는 null}}을 stdout에 JSON으로 쓴다. plt.show()는 그림을 파일로 저장한다.
import contextlib, io, json, os, sys, traceback, warnings
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

warnings.filterwarnings('ignore')
plt.show = lambda *a, **k: plt.savefig(os.path.join(os.getcwd(), 'figure.png'))
items = json.load(sys.stdin)
result = {}
for item in items:
    buf = io.StringIO()
    err = None
    with contextlib.redirect_stdout(buf):
        try:
            exec(compile(item['code'], item['id'], 'exec'), {'__name__': '__main__'})
        except BaseException as e:  # SystemExit와 오류 모두 마지막 줄만 기록
            err = traceback.format_exception_only(e)[-1].strip()
    plt.close('all')
    result[item['id']] = {'out': buf.getvalue().rstrip('\n'), 'err': err}
json.dump(result, sys.stdout, ensure_ascii=False)
