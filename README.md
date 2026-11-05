# ESP32-DIV 실험 노트

ESP32-DIV V2.1을 처음 쓰는 학생과 입문자를 위한 한국어 정적 사이트입니다. 실물 사진을 바탕으로 처음 사용법, 기능 가이드, NFC 탐구 실험을 안내합니다. CiferTech의 공식 사이트가 아닙니다. 이 기기에서는 부팅, 메뉴 표시, NFC 태그 읽기까지 확인했고 다른 기능은 미검증입니다.

## 실행

Node 22.23.4 이상이 필요합니다(v26에서 확인).

```sh
npm install
npm run dev        # 개발 서버
npm run build      # dist/ 생성
npm run preview    # 빌드 결과 확인
```

GitHub 프로젝트 페이지처럼 하위 경로에 배포할 때는 `BASE_PATH=/esp32-div2 npm run build`로 빌드합니다. 이 경로는 아직 시험하지 않았습니다.

## 검사

```sh
npm run typecheck
npm run check:nfc  # CSV 왕복, 입력 검증, 집계, 보고서 이스케이프
```

## 사진

원본 `IMG_*.JPG`에는 GPS가 포함된 EXIF가 있어 저장소에서 제외합니다. 저장소에는 EXIF를 제거한 `src/assets/device/`의 파생본만 들어 있습니다. 원본을 프로젝트 맨 위 폴더에 두고 `node scripts/prepare-images.mjs`를 실행하면 파생본을 다시 만듭니다.

기기 사진은 학습에 필요한 부품 위치와 조작 순서를 확인하는 데 사용합니다. 메뉴와 값은 이미지 옆의 HTML 표(`src/data/learn.ts`)를 기준으로 봅니다.

## 학습 과정

`/learn/`에서 시작합니다. 순서는 0 `/learn/why/`, 1 `/start/`, 2 `/learn/device/`, 3 `/learn/nfc/`, 4 `/learn/network/`, 5 `/learn/security/`, 6 `/lab/nfc/`이며 `src/data/learn.ts`의 `LEARNING_PATH` 하나로 관리합니다. 용어 사전, 기술노트, 기기 알아보기, 기능 가이드는 참고 자료이고, 학생용 활동 기록 양식은 `docs/security-learning-notes.md`에 있습니다. 개발 계약과 완료 기준은 `docs/student-learning-plan.md`에 있습니다.

## 데이터

서버와 로그인은 없습니다. NFC 실험 기록과 탐구 서술은 방문자의 브라우저 localStorage에만 저장되고, CSV로 백업하거나 옮길 수 있습니다.

## 내용 수정

기능 설명은 `src/data/guide.ts`, 학습 내용은 `src/data/learn.ts`, 기술노트는 `src/data/projects.ts`, 용어는 `src/data/glossary.ts`, 출처와 확인 날짜는 `src/data/sources.ts`, NFC 계산과 CSV 처리는 `src/lib/nfc.ts`에 있습니다.
