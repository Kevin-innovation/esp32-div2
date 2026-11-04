# ESP32-DIV 실험 노트

ESP32-DIV V2.1을 처음 쓰는 학생과 입문자를 위한 한국어 정적 사이트입니다. 실물 사진을 바탕으로 처음 사용법, 기능 가이드, NFC 탐구 실험을 안내합니다. CiferTech의 공식 사이트가 아니며, 판매 기기의 하드웨어와 펌웨어는 아직 검증하지 않았습니다.

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

홈의 `front-cutout.webp`, `back-cutout.webp`는 실물 사진을 AI로 편집한 소개용 이미지입니다. 배경을 지우고, 앞면 화면의 반사와 흠집을 정리하고, 뒷면의 작은 각인을 생략했습니다. 근거 자료로 쓰지 않으며, 포트와 각인 설명은 `/device/`의 원본 사진 기준입니다.

## 데이터

서버와 로그인은 없습니다. NFC 실험 기록과 탐구 서술은 방문자의 브라우저 localStorage에만 저장되고, CSV로 백업하거나 옮길 수 있습니다.

## 내용 수정

기능 설명은 `src/data/guide.ts`, 출처와 확인 날짜는 `src/data/sources.ts`, NFC 계산과 CSV 처리는 `src/lib/nfc.ts`에 있습니다.
