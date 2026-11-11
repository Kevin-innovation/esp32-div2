# 작업 계획: 근거 표시 정리, Python·Colab 입문, 코드 블록 (2026-11-11, 기준 e434e93)

## A. 근거 표시
- 원인: `Evidence` 태그(사진 확인·이 기기 확인·이 기기 미검증 등)를 한 항목에 여러 개 붙여, 무엇을 확인했고 무엇을 안 했는지가 항목 단위로 충돌한다.
- 바꿈: 한 항목의 근거는 `Checks`(대상: 결과) 정보 줄로 적는다. 예) 외관 표기, About 표시, 동작 확인, 공식 자료, 내부 연결.
- 조사 메모(공식 자료에서 V2.1을 찾지 못함, 제작사 정보, 금속 색, 필름 흠집 등)는 학생 화면에서 뺀다. 수업 대상은 About의 MK SIGNAL DIV V2.1, Build V1.2이고, 공식 v2 문서와 다른 화면은 실제 메뉴를 따른다고 안내한다.
- 확인하지 못한 사실을 확정으로 바꾸지 않는다. 동작 확인 범위(부팅, 메뉴 표시, NFC Card Reader로 태그 UID 읽기)는 그대로 둔다.
- 범위: device, start, learn/index, learn/device, learn/network, learn/nfc, guide, update, home.

## B. Python·Colab 입문
- 새 페이지 `/learn/python-colab/`. 기본 분석은 브라우저이고 Colab은 선택이라 막지 않는다.
- 연결: 참고 자료 메뉴, /learn 목록, 13개 워크북 9장(Colab) 앞, 학습 순서 안내.

## C. 코드 블록
- 원인 확인 후 공통 `CodeBlock.astro`를 만든다. Astro 내장 Code(Shiki)로 Python 문법 강조(양테마), 줄 번호(CSS, 복사 안 됨), 복사 버튼, 원문 .py 내려받기, 미리보기 높이와 펼쳐 보기를 넣는다.
- 예상 출력은 별도 블록으로 둔다.
- 적용: LabGuide 9장(13개 미션), NFC PythonPanel, 입문 페이지.

## 검사
typecheck, build, 13개 미션의 코드 원문과 복사·내려받기 내용 비교, 입문 예제 실행 출력 비교, 375/1280 양테마 overflow·console, 키보드, JS 끔.
