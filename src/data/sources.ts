// 사이트의 모든 근거. 주장 옆 출처 링크와 페이지 끝 목록이 이 표 하나를 쓴다.
export const CHECKED = '2026-11-04';
export const COMMIT = '90f7967';

const REPO = 'https://github.com/cifertech/ESP32-DIV';
const BLOB = `${REPO}/blob/90f7967c4dc7bcd8c09ebdcf421886737516ddc2`;
export const WIKI = `${REPO}/wiki`;

export interface Source {
  title: string;
  url?: string;
  note?: string;
}

export const SOURCES = {
  photos: { title: '이 기기 실물 사진 4장', note: '2026-11-04 촬영. 앞면, 뒷면, USB-C 면, 스위치 면.' },
  manual: { title: '동봉 인쇄 설명서 ESP32 DIV V2 User Guide', note: '사진 2장으로 확인. 인쇄 날짜와 펌웨어 판 표기는 없음.' },
  readme: { title: 'ESP32-DIV README', url: `${REPO}#readme`, note: `커밋 ${COMMIT} 기준.` },
  wiki: { title: 'ESP32-DIV 공식 위키', url: WIKI },
  hardware: { title: '위키: Hardware', url: `${WIKI}/Hardware` },
  navigation: { title: '위키: Navigation and controls', url: `${WIKI}/Navigation-and-controls` },
  upload: { title: '위키: Firmware Upload Guide', url: `${WIKI}/Firmware-Upload` },
  faq: { title: '위키: Troubleshooting & FAQ', url: `${WIKI}/Troubleshooting-&-FAQ` },
  settings: { title: '위키: Settings', url: `${WIKI}/Settings` },
  nfcOverview: { title: '위키: RFID / NFC overview', url: `${WIKI}/RFID-NFC-Overview` },
  nfcReader: { title: '위키: RFID / NFC Card Reader', url: `${WIKI}/RFID-Card-Reader` },
  site: { title: 'ESP32-DIV 공식 웹 설치 안내', url: 'https://cifertech.github.io/ESP32-DIV/' },
  releases: { title: 'ESP32-DIV Releases', url: `${REPO}/releases`, note: '최신 v1.7.2, 2026-08-06 게시.' },
  codeFirmware: { title: '펌웨어 코드 wifi.cpp의 FIRMWARE_FILE', url: `${BLOB}/ESP32-DIV/wifi.cpp#L9245`, note: `커밋 ${COMMIT}.` },
  codeMenu: { title: '펌웨어 코드 ESP32-DIV.ino의 메뉴 목록', url: `${BLOB}/ESP32-DIV/ESP32-DIV.ino#L32`, note: `커밋 ${COMMIT}.` },
  emvco: { title: 'EMVCo: EMV Contactless Chip', url: 'https://www.emvco.com/emv-technologies/contactless/' },
  ntag: { title: 'NXP 데이터시트: NTAG213/215/216', url: 'https://www.nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf' },
  metal: { title: 'NXP 앱노트 AN11564: 금속 주변 NFC 안테나', url: 'https://www.nxp.com/docs/en/application-note/AN11564.pdf' },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;
