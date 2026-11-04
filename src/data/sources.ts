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
  deviceScreens: { title: '이 기기 화면 관찰 기록', note: '2026-11-04 사용자 촬영 화면으로 확인. 사이트에는 재구성 이미지만 씁니다.' },
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
  an10833: { title: 'NXP 앱노트 AN10833: MIFARE type identification procedure', url: 'https://www.nxp.com/docs/en/application-note/AN10833.pdf' },
  pn532: { title: 'NXP PN532 User Manual (UM0701-02)', url: 'https://www.nxp.com/docs/en/user-guide/141520.pdf' },
  espScan: { title: 'Espressif: ESP32-S3 Wi-Fi Station Scenarios', url: 'https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-guides/wifi-driver/station-scenarios.html' },
  espBle: { title: 'Espressif: ESP32-S3 Bluetooth LE 개요', url: 'https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-guides/ble/overview.html' },
  espDatasheet: { title: 'Espressif: ESP32-S3 Datasheet', url: 'https://documentation.espressif.com/esp32-s3_datasheet_en.pdf' },
  tiCc1101: { title: 'TI: CC1101 제품 페이지', url: 'https://www.ti.com/product/CC1101' },
  nordicNrf24: { title: 'Nordic: nRF24 Series', url: 'https://www.nordicsemi.com/Products/nRF24-series' },
  ieeeWifi: { title: 'IEEE SA: Wi-Fi Timeline', url: 'https://standards.ieee.org/wp-content/uploads/interactive/web/wi-fi-timeline/' },
  btTech: { title: 'Bluetooth SIG: Technology Overview', url: 'https://www.bluetooth.com/learn-about-bluetooth/tech-overview/' },
  btRange: { title: 'Bluetooth SIG: Range', url: 'https://www.bluetooth.com/learn-about-bluetooth/key-attributes/range/' },
  nistGps: { title: 'NIST: How do you measure your location using GPS?', url: 'https://www.nist.gov/how-do-you-measure-it/how-do-you-measure-your-location-using-gps' },
  gpsTrilateration: { title: 'GPS.gov: Trilateration', url: 'https://www.gps.gov/trilateration' },
  nistCsf: { title: 'NIST SP 1299: CSF 2.0 Resource & Overview Guide', url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1299.pdf' },
  nistBt: { title: 'NIST SP 800-121 Rev. 2: Guide to Bluetooth Security', url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-121r2-upd1.pdf' },
  btGuide: { title: 'Bluetooth SIG: Security and Privacy Best Practices Guide', url: 'https://www.bluetooth.com/bluetooth-resources/bluetooth-security-and-privacy-best-practices-guide/' },
  wifiSecurity: { title: 'Wi-Fi Alliance: Security', url: 'https://www.wi-fi.org/discover-wi-fi/security' },
  arubaPmf: { title: 'HPE Aruba: Protected Management Frames', url: 'https://arubanetworking.hpe.com/techdocs/aos/wifi-design-deploy/security/features/pmf/' },
  gpsInterference: { title: 'GPS.gov: Spectrum and Interference Issues', url: 'https://www.gps.gov/spectrum-interference-issues' },
  nistSpoof: { title: 'NIST 용어집: spoofing', url: 'https://csrc.nist.gov/glossary/term/spoofing' },
  nistMac: { title: 'NIST 용어집: message authentication code', url: 'https://csrc.nist.gov/glossary/term/message_authentication_code' },
  rfcDhcp: { title: 'RFC 2131: DHCP', url: 'https://www.rfc-editor.org/rfc/rfc2131' },
  rfcDns: { title: 'RFC 1034: DNS', url: 'https://www.rfc-editor.org/rfc/rfc1034' },
  rfcTcp: { title: 'RFC 9293: TCP', url: 'https://www.rfc-editor.org/rfc/rfc9293' },
  rfcUdp: { title: 'RFC 768: UDP', url: 'https://www.rfc-editor.org/rfc/rfc768' },
  rfcTls: { title: 'RFC 8446: TLS 1.3', url: 'https://www.rfc-editor.org/rfc/rfc8446' },
  rfcHttp: { title: 'RFC 9110: HTTP', url: 'https://www.rfc-editor.org/rfc/rfc9110' },
  rfcIp: { title: 'RFC 791: IP', url: 'https://www.rfc-editor.org/rfc/rfc791' },
  rfcArp: { title: 'RFC 826: ARP', url: 'https://www.rfc-editor.org/rfc/rfc826' },
  rfcNat: { title: 'RFC 3022: NAT', url: 'https://www.rfc-editor.org/rfc/rfc3022' },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;
