# 작업 계획: 상단 메뉴 분류와 미션 코드 읽기 (2026-11-11, 기준 252f180)

## 메뉴
- 데이터는 `src/data/nav.ts` 하나. 수업 시작(학습 안내·차시, 0~6, 기기 첫 사용 앵커, 선수 학습 ①입문 ②미션 코드 읽기), 실습 미션(01~13 주제별), 참고 자료(기기·기능 가이드·업데이트, 용어·기술노트·정보보호 관점).
- `SiteNav.astro`: 허브 링크(/learn/, /lab/)는 그대로, 옆에 네이티브 details 토글. 패널은 details 안이라 JS 없이 열림, `name`으로 한 번에 하나.
- JS: 정밀 포인터 hover 열림, 벗어나면 220ms 뒤 닫힘(빈틈 이동 허용), Escape는 닫고 토글로 초점, 밖 클릭과 초점 이탈 시 닫힘. menu ARIA 역할은 쓰지 않음.
- 기능 가이드 하위 8쪽은 /guide/ 허브 경유.

## 미션 코드 읽기 (/learn/mission-code/)
- 해설 코드는 `src/data/missionCode.ts`가 colab.ts의 실제 생성 코드에서 표지 줄로 잘라 온 원문(줄 번호 포함). 표지가 사라지면 빌드 실패.
- 대표 NFC(숫자형), WPA-PMF(설정형), CSV(검사형) 묶음 11개: 원문 → 입력 → 처리 → 중간 출력(실행 예제) → 이유 → 주의 → 예측·수정 과제(해설 접기).
- 문법 대조표와 나머지 10개 미션 요약은 실제 코드에서 자동 추출. 예제 출력은 `scripts/check-python-intro.ts`가 실행·대조.

## 검사
typecheck, build, check-python-intro, check-nav(신규), check-classroom, 375/768/1280 양테마 overflow·console.
