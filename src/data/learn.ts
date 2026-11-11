// 학습 페이지 공통 내용. 화면 문구는 이 기기에서 관찰한 표기를 그대로 적는다.

export interface ScreenRow {
  text: string;
  meaning: string;
}

export interface Screen {
  title: string;
  alt: string;
  rows: ScreenRow[];
}

export type ScreenName = 'main-menu' | 'about' | 'more' | 'nfc-menu' | 'reader-waiting' | 'reader-detected' | 'tag-info' | 'memory-sample';

export const SCREENS: Record<ScreenName, Screen> = {
  'main-menu': {
    title: '메인 메뉴',
    alt: '기기 메인 메뉴 화면. 2열 4행으로 메뉴 8개가 놓여 있다.',
    rows: [
      { text: 'WiFi | Bluetooth', meaning: '와이파이 | 블루투스' },
      { text: '2.4GHz | SubGHz', meaning: '2.4GHz 대역 | 1GHz 아래 대역' },
      { text: 'More | Tools', meaning: '더보기 | 도구' },
      { text: 'Settings | About', meaning: '설정 | 기기 정보' },
    ],
  },
  about: {
    title: 'About (기기 정보)',
    alt: 'About 화면. 기기 이름, 펌웨어, 보드, 빌드, 크레딧이 적혀 있다.',
    rows: [
      { text: 'MK SIGNAL DIV V2.1', meaning: '화면에 표시된 기기 이름' },
      { text: '1.7.2 stable by MK_SIGNAL_V1', meaning: '펌웨어 표시. 상위 프로젝트와 같은 번호지만 판매자 이름이 함께 적혀 있음' },
      { text: 'Board: ESP32 DIV V2.1 by MK', meaning: '하드웨어(보드) 표시' },
      { text: 'Build: V1.2 Stable by MK SIGNAL', meaning: '판매자 빌드 이름' },
      { text: 'Credits: CiferTech ESP32 DIV Project', meaning: '원본 프로젝트 표시' },
      { text: 'SELECT / tap to go back', meaning: '선택 키를 누르거나 화면을 눌러 돌아가기' },
    ],
  },
  more: {
    title: 'More (더보기)',
    alt: 'More 화면. IR Remote, RFID/NFC, GPS, Games, Main Menu가 있다.',
    rows: [
      { text: 'IR Remote', meaning: '적외선 리모컨' },
      { text: 'RFID/NFC', meaning: '근거리 태그 읽기와 관련 기능' },
      { text: 'GPS', meaning: '위성 위치' },
      { text: 'Games', meaning: '게임. 공식 위키의 More 목록에는 없는 메뉴. 세부 내용은 미확인' },
      { text: 'Main Menu', meaning: '메인 메뉴로 돌아가기' },
    ],
  },
  'nfc-menu': {
    title: 'RFID/NFC 목록',
    alt: 'RFID/NFC 세로 목록 화면. Card Reader부터 Back to Main Menu까지 있다.',
    rows: [
      { text: 'Card Reader', meaning: '태그 읽기. 이 실험에서 쓰는 메뉴' },
      { text: 'Card Clone', meaning: '태그 값 옮기기' },
      { text: 'Erase', meaning: '태그 지우기' },
      { text: 'Dump', meaning: '메모리 내용 읽어 보기' },
      { text: 'Decode Access', meaning: '접근 권한 값 풀이' },
      { text: 'Jam Reader', meaning: '리더 동작 방해' },
      { text: 'Tag Disrupt', meaning: '태그 통신 방해' },
      { text: 'Disrupt Emulate', meaning: '방해와 태그 흉내 동작' },
      { text: 'Back to Main Menu', meaning: '메인 메뉴로 돌아가기' },
    ],
  },
  'reader-waiting': {
    title: 'Card Reader 대기 화면',
    alt: 'Card Reader 대기 화면. Mode SCAN, Waiting for tag 문구와 아래 Cancel, Info 표시가 있다.',
    rows: [
      { text: 'Mode: SCAN', meaning: '찾는 중' },
      { text: 'Listening — present ISO14443A tag', meaning: '기다리는 중. ISO14443A 태그를 대 주세요' },
      { text: 'Protocol: ISO14443A', meaning: '사용하는 통신 규칙' },
      { text: 'Reader: PN532 0x32010607', meaning: '리더 칩과 그 칩의 버전 정보. 기기 펌웨어 1.7.2와는 다른 값' },
      { text: 'Waiting for tag...', meaning: '태그를 기다리는 중' },
      { text: 'Cancel / Info', meaning: '취소 / 정보' },
    ],
  },
  'reader-detected': {
    title: '태그 감지 화면',
    alt: '태그 감지 화면. Mode OK, Tag detected, MIFARE Ultralight-compatible, UID가 표시되어 있다.',
    rows: [
      { text: 'Mode: OK', meaning: '찾기 성공' },
      { text: 'Tag detected', meaning: '태그를 찾음' },
      { text: 'MIFARE Ultralight-compatible', meaning: 'MIFARE Ultralight와 호환되는 종류로 판단함' },
      { text: 'UID 530105D0430001', meaning: '태그 식별값 7바이트' },
      { text: '[*] Open Info for ATQA, SAK and memory details', meaning: 'ATQA, SAK, 메모리 정보는 Info에서 보기' },
      { text: 'Exit / Info', meaning: '나가기 / 정보' },
    ],
  },
  'tag-info': {
    title: 'Info 1/2 (태그 정보)',
    alt: 'Info 첫 번째 화면. 리더 칩, UID, 종류, ATQA, SAK, 사용자 메모리 페이지가 적혀 있다.',
    rows: [
      { text: 'Reader IC: PN532 0x32010607', meaning: '리더 칩' },
      { text: 'UID (hex): 530105D0430001', meaning: '16진수로 적은 식별값' },
      { text: 'UID length: 7 bytes', meaning: '식별값 길이 7바이트' },
      { text: 'Detected type: Ultralight', meaning: '판단한 종류' },
      { text: 'Variant: MIFARE Ultralight-compatible', meaning: '세부 분류' },
      { text: 'ATQA: 0044', meaning: '탐색 요청에 대한 태그의 답' },
      { text: 'SAK: 00', meaning: '선택에 대한 태그의 답' },
      { text: 'User memory: pages 4–15', meaning: '사용자 메모리로 표시한 페이지 범위' },
    ],
  },
  'memory-sample': {
    title: 'Info 2/2 (메모리 샘플)',
    alt: 'Info 두 번째 화면. 페이지 4부터 7까지의 16진수 값이 적혀 있다.',
    rows: [
      { text: 'User memory sample (pages 4–7, 4 bytes each)', meaning: '사용자 메모리 일부. 4~7페이지, 페이지마다 4바이트' },
      { text: 'P4  01 03 A0 0C', meaning: '4페이지의 네 바이트' },
      { text: 'P5  34 03 00 FE', meaning: '5페이지의 네 바이트' },
      { text: 'P6  00 00 00 00', meaning: '6페이지의 네 바이트' },
      { text: 'P7  00 00 00 00', meaning: '7페이지의 네 바이트' },
      { text: 'Back / Prev / Next', meaning: '뒤로 / 이전 정보 / 다음 정보' },
    ],
  },
};

export interface MenuItem {
  id: string;
  name: string;
  ko: string;
  role: string;
  next: string;
  checked: string;
  href: string;
  linkLabel: string;
}

// 화면과 같은 배치: 왼쪽 줄, 오른쪽 줄 순서로 번갈아 놓는다.
export const MAIN_MENU: MenuItem[] = [
  { id: 'wifi', name: 'WiFi', ko: '와이파이', role: '주변 공유기와 채널을 살펴보는 도구 모음입니다.', next: 'WiFi를 고르면 기능 목록이 나옵니다.', checked: '하위 메뉴 표시 확인. 기능 실행은 미확인.', href: '#menu-wifi', linkLabel: 'Wi-Fi 메뉴 지도' },
  { id: 'bluetooth', name: 'Bluetooth', ko: '블루투스', role: '주변 BLE 기기가 보내는 신호를 관찰하는 도구 모음입니다.', next: 'Bluetooth를 고르면 기능 목록이 나옵니다.', checked: '하위 메뉴 표시 확인. 기능 실행은 미확인.', href: '#menu-bluetooth', linkLabel: 'BLE 메뉴 지도' },
  { id: '24ghz', name: '2.4GHz', ko: '2.4GHz 대역', role: '2.4GHz 대역의 신호 에너지를 살펴보는 도구 모음입니다.', next: '2.4GHz를 고르면 기능 목록이 나옵니다.', checked: '하위 메뉴 표시 확인. 기능 실행은 미확인.', href: '#menu-24ghz', linkLabel: '2.4GHz 메뉴 지도' },
  { id: 'subghz', name: 'SubGHz', ko: '1GHz 아래 대역', role: '리모컨 등이 쓰는 낮은 주파수를 다루는 도구 모음입니다.', next: 'SubGHz를 고르면 기능 목록이 나옵니다.', checked: '하위 메뉴 표시 확인. 기능 실행은 미확인.', href: '#menu-subghz', linkLabel: 'Sub-GHz 메뉴 지도' },
  { id: 'more', name: 'More', ko: '더보기', role: 'IR Remote, RFID/NFC, GPS, Games를 모아 둔 메뉴입니다.', next: 'NFC 실험은 More → RFID/NFC → Card Reader 순서로 갑니다.', checked: '하위 메뉴까지 확인. NFC 읽기만 실행 확인.', href: '#more', linkLabel: 'More 화면 보기' },
  { id: 'tools', name: 'Tools', ko: '도구', role: '시리얼 모니터, 펌웨어 업데이트, 터치 보정, SD 파일 관리 같은 관리 도구입니다.', next: 'Tools를 고르면 기능 목록이 나옵니다.', checked: '하위 메뉴 표시 확인. 기능 실행은 미확인.', href: '#menu-tools', linkLabel: 'Tools 메뉴 지도' },
  { id: 'settings', name: 'Settings', ko: '설정', role: '공식 문서는 밝기, 화면 테마, 표시등, 자동 스캔 설정을 설명합니다.', next: '공식 문서에서는 설정 화면으로 이어집니다. 이 기기의 내부 화면은 미확인입니다.', checked: '메인 항목만 확인. 내부 설정 화면과 저장 동작은 미확인.', href: '/guide/system/#settings', linkLabel: '설정 가이드' },
  { id: 'about', name: 'About', ko: '기기 정보', role: '기기 이름, 펌웨어, 보드, 빌드 이름을 보여 줍니다.', next: 'About을 고르면 정보 화면이 열립니다.', checked: '화면 내용까지 확인.', href: '#about', linkLabel: 'About 화면 보기' },
];

/** 사용자 메뉴 화면의 순서. 항목 설명은 guide.ts의 기존 id로 연결한다.
 * IMG_5988: 메인, 5989/5990: Wi-Fi, 5991/5992: BLE, 5993: 2.4GHz,
 * 5994: SubGHz, 5995: More, 5996: Tools. JPG는 확인용이며 웹 자산이 아니다.
 */
export const DEVICE_MENU_MAP = [
  {
    id: 'wifi', name: 'WiFi', ko: '와이파이',
    learn: 'SSID·BSSID·RSSI와 채널, 탐색과 접속의 차이를 배웁니다. 먼저 내 공유기의 목록과 신호를 읽는 기능부터 봅니다.',
    risk: '위장 AP·로그인 화면은 자동 연결이나 개인정보 입력을 유도할 수 있고, 대량 송신·연결 해제는 주변 통신을 방해할 수 있습니다.',
    permit: '관찰은 허가받은 내 네트워크에 한정하고 주변 주소를 공유하지 않습니다. 송신·위장 기능은 격리된 시험 환경의 원리 설명만 다룹니다.',
    checked: '첫 목록 8개와 Next Page의 3개 표시를 확인했습니다. 스캔·접속·송신 등 기능 실행은 미확인입니다.',
    pages: [
      { title: '첫 목록', items: ['packet-monitor', 'beacon-spammer', 'wifi-deauther', 'probe-flood', 'deauth-detector', 'wifi-scanner', 'captive-portal', 'hidden-ssid'] },
      { title: 'Next Page → 다음 목록', items: ['wps-scanner', 'arp-scanner', 'karma'] },
    ],
  },
  {
    id: 'bluetooth', name: 'Bluetooth', ko: '블루투스·BLE',
    learn: '광고 신호·스캔·연결·키보드 역할을 구분합니다. 기기 이름이나 감지 경고를 상대의 신원·안전성 증명으로 받아들이지 않습니다.',
    risk: '위장 광고·추적기 흉내는 알림과 위치 판단을 혼란스럽게 하고, 방해·키 입력 자동화는 다른 사람의 기기 동작에 영향을 줄 수 있습니다.',
    permit: '내 BLE 기기만 관찰하고 주소·이동 기록을 공개하지 않습니다. 위장·방해·입력 기능의 실행법은 제공하지 않습니다.',
    checked: '첫 목록 8개와 Skimmer Detect 단독 목록 표시를 확인했습니다. 촬영 순서와 기존 기능 분류에 따라 BLE 다음 목록으로 연결하며, 이 단독 화면에는 상위 메뉴 이름이 없습니다. 실행은 미확인입니다.',
    pages: [
      { title: '첫 목록', items: ['ble-jammer', 'ble-spoofer', 'sour-apple', 'airtag-spoofer', 'airtag-sniffer', 'ble-sniffer', 'ble-scanner', 'rubber-ducky'] },
      { title: 'Next Page → 다음 목록', items: ['skimmer-detect'] },
    ],
  },
  {
    id: '24ghz', name: '2.4GHz', ko: '2.4GHz 대역',
    learn: '대역의 신호 에너지 관찰과 ESB 같은 특정 통신 규칙의 수신을 구분합니다. 에너지가 보인다고 내용이나 송신자를 해독한 것은 아닙니다.',
    risk: '대역 방해는 여러 무선 기기에 영향을 줄 수 있습니다. 패킷 재전송·키 입력 주입은 수신 기기의 동작을 바꿀 수 있습니다.',
    permit: '관찰은 내 시험 장비를 대상으로 합니다. 타인 입력 수집·재밍·주입 절차는 싣지 않고 보호 방식과 한계만 설명합니다.',
    checked: '아래 6개 메뉴 표시를 확인했습니다. 수신·탐지·송신 효과는 이 기기에서 실행해 확인하지 못했습니다.',
    pages: [{ title: '기능 목록', items: ['24-scanner', 'proto-kill', 'esb-sniffer', 'esb-replay', 'mousejack-scan', 'mousejack-inject'] }],
  },
  {
    id: 'subghz', name: 'SubGHz', ko: '1GHz 아래 대역',
    learn: '리모컨의 고정 코드와 바뀌는 코드, 수신·저장·재전송·방해 감지의 차이를 배웁니다.',
    risk: '신호 재전송·코드 전수 시도는 출입·경보 장치를 오작동시킬 수 있고, 방해는 정상 수신을 막을 수 있습니다. 감지 경고만으로 공격을 확정하지 않습니다.',
    permit: '내 실험용 송수신기와 문서만 비교합니다. 실제 출입·차량 장치에 대한 재전송·재밍·코드 시도 방법은 제공하지 않습니다.',
    checked: '아래 5개 메뉴가 같은 SubGHz 화면에 표시됩니다. Saved Profile도 이 묶음에 있습니다. Skimmer Detect는 이 목록이 아니라 위 BLE 다음 목록에 연결했습니다. 기능 실행은 미확인입니다.',
    pages: [{ title: '기능 목록', items: ['replay-attack', 'subghz-jammer', 'de-bruijn', 'jamming-detector', 'subghz-saved'] }],
  },
  {
    id: 'more', name: 'More', ko: '더보기',
    learn: 'IR 리모컨, 가까운 태그, 위성 위치처럼 서로 다른 통신 방식의 쓰임을 비교합니다. NFC 학습은 RFID/NFC 안의 Card Reader로 이어집니다.',
    risk: '리모컨 명령·태그 쓰기는 실제 장치나 데이터를 바꿀 수 있고, 위치와 식별자 기록은 개인정보를 드러낼 수 있습니다.',
    permit: '직접 산 실험 태그·내 리모컨·내 위치만 다룹니다. 이 수업에서 실행을 안내하는 NFC 기능은 Card Reader 읽기입니다.',
    checked: 'IR Remote·RFID/NFC·GPS·Games와 Main Menu 복귀 항목 표시를 확인했습니다. NFC 태그의 UID와 P4~P7 읽기만 실행 확인했고, IR·GPS·Games 실행은 미확인입니다.',
    pages: [{ title: '하위 묶음', items: ['ir', 'nfc', 'gps', 'games'] }],
  },
  {
    id: 'tools', name: 'Tools', ko: '관리 도구',
    learn: '로그·업데이트·터치 보정·파일 관리·무선 모듈 조정이 각각 무엇을 바꾸는 관리 작업인지 구분합니다.',
    risk: '잘못된 업데이트나 파일 삭제는 기기를 쓰지 못하게 하거나 기록을 지울 수 있습니다. 조정값 변경은 이후 관찰의 비교 조건을 바꿀 수 있습니다.',
    permit: '내 기기의 버전과 백업부터 확인합니다. 업데이트·삭제·조정은 복구 방법과 적용 범위를 확인하기 전에는 실행하지 않습니다.',
    checked: '아래 5개 메뉴 이름이 같은 Tools 목록에 표시됩니다. 내부 화면·설정 변경·업데이트 실행은 미확인입니다.',
    pages: [{ title: '기능 목록', items: ['serial-monitor', 'update-firmware', 'touch-calibrate', 'sd-file-manager', 'nrf-tuning'] }],
  },
  {
    id: 'settings', name: 'Settings', ko: '설정',
    learn: '문서에 나온 밝기·테마·표시등·자동 스캔과 저장 설정을 구분합니다. 설정을 바꾸는 일과 값을 관찰하는 일은 다릅니다.',
    risk: '자동 스캔 같은 설정은 동작과 전력 사용을 바꿀 수 있고, 저장 여부에 따라 다음 부팅의 조건이 달라질 수 있습니다.',
    permit: '내 기기의 현재 값을 먼저 기록하고 필요한 항목만 비교합니다. 아래 가이드는 공식 문서 기준이며 실제 화면에서 항목을 다시 확인합니다.',
    checked: '메인 메뉴의 Settings 항목만 확인했습니다. 이번 9장에는 설정 내부 화면이나 저장 결과가 없습니다.',
    pages: [{ title: '문서 기준 상세 설명', items: ['settings'] }],
  },
  {
    id: 'about', name: 'About', ko: '기기 정보',
    learn: '보드 판·판매자 빌드 이름·펌웨어 버전을 나누어 적고 공식 자료와 비교하는 방법을 배웁니다.',
    risk: '같은 버전 번호만 보고 다른 기기의 업데이트 파일을 적용하면 복구가 필요할 수 있습니다.',
    permit: '정보를 읽고 기록하는 데서 시작합니다. 파일 적용은 별도의 업데이트 안내에서 조건을 확인합니다.',
    checked: '메인 항목과 앞서 제공된 About 화면의 표시 값까지 확인했습니다. 같은 번호가 공식 펌웨어와 같은 내용이라는 뜻은 아닙니다.',
    pages: [{ title: '표시 값 읽기', items: ['about'] }],
  },
];

export interface VisualStep {
  title: string;
  body: string;
  /** 먼저 말하는 쪽. 0이면 왼쪽(리더, 스캔 장비, 단말기), 1이면 오른쪽 */
  from?: 0 | 1;
  signal?: string;
  /** signal에 대한 답. 반대 방향으로 돌아온다. */
  returns?: string;
  state?: string;
  layers?: string[];
  /** 오른쪽 상대가 단계마다 다를 때 (DNS 서버, 웹 서버 등) */
  peer?: string;
  /** 리더가 자기장을 켠 상태 */
  field?: boolean;
  /** 태그가 전원을 얻었는지 */
  powered?: boolean;
  channel?: number;
  /** 이 단계에서 옮겨 오기 전 채널 */
  channelFrom?: number;
  /** 스캔 목록에 몇 줄까지 찼는지, 그중 이번에 새로 들어온 줄 */
  listed?: number;
  newRow?: number;
  /** 작은 관찰 질문과 답 */
  ask?: [string, string];
  /** 무선 구간이 아니라 기기 안(리더 칩 → 프로세서 → 화면)에서 일어나는 단계 */
  inside?: boolean;
}

export interface StepScenario {
  id: string;
  label: string;
  steps: VisualStep[];
}

// 시각화와 '스캔 목록 읽기' 표가 함께 쓰는 가상 예시.
export const SCAN_EXAMPLE = [
  { ssid: 'MyHome_2G', bssid: 'AA:BB:CC:11:22:33', channel: 6, rssi: -42 },
  { ssid: 'MyHome_2G', bssid: 'AA:BB:CC:44:55:66', channel: 11, rssi: -71 },
];

export const NFC_STEPS: VisualStep[] = [
  { title: '자기장 켜기', field: true, powered: false, state: '13.56MHz 자기장', body: '리더가 안테나로 13.56MHz 자기장을 만듭니다. 아직 태그와 주고받는 내용은 없습니다.' },
  { title: '태그가 에너지 얻기', field: true, powered: true, state: '유도 결합', body: '태그에는 배터리가 없습니다. 태그의 코일이 자기장 안에 들어오면 유도 결합으로 전기를 얻어 칩이 깨어납니다. 멀어지거나 방향이 틀어지면 이 결합이 약해집니다.' },
  { title: '탐색 요청', field: true, powered: true, from: 0, signal: 'REQA 또는 WUPA', body: '리더가 “ISO14443A 태그가 있나요?”라고 묻습니다. 아직 어떤 태그인지 모릅니다.', ask: ['지금 누가 먼저 말했나요?', '리더입니다. 태그는 자기장에서 에너지를 얻은 뒤 요청을 받아야 답합니다.'] },
  { title: '태그의 첫 답', field: true, powered: true, from: 1, signal: 'ATQA', body: '태그가 답합니다. 태그는 리더에서 얻은 에너지로 동작하며, 별도 송신기로 새 신호를 만드는 대신 코일의 전기적 부하를 바꿔 자기장에 작은 변화를 만듭니다. 이것이 부하 변조입니다. 화면의 ATQA(탐색 요청에 대한 응답) 0044가 이 답을 표시한 값입니다.' },
  { title: '충돌 방지와 UID 확인', field: true, powered: true, from: 0, signal: '충돌 방지', returns: 'UID', body: '여러 태그가 함께 답해도 하나씩 가려낼 수 있도록 리더가 UID를 단계적으로 확인합니다. 화면의 UID(고유 식별값) 530105D0430001이 여기서 얻은 값입니다.' },
  { title: '선택', field: true, powered: true, from: 0, signal: 'SELECT', returns: 'SAK', body: '리더가 찾은 UID의 태그를 고릅니다. 태그는 SAK(선택 응답)로 답합니다. 화면의 SAK 00이 그 값입니다.' },
  { title: '메모리 읽기', field: true, powered: true, from: 0, signal: 'READ', returns: '데이터 16바이트', body: '리더가 페이지를 지정해 읽기를 요청하면 태그가 그 페이지부터 16바이트를 돌려줍니다. UID를 읽은 것만으로 메모리까지 읽은 것은 아니며, 이 단계가 따로 있어야 P4~P7 값을 볼 수 있습니다.', ask: ['이 단계에서 인터넷을 거치나요?', '아닙니다. 리더와 태그 사이의 ISO14443A 프레임입니다.'] },
  { title: '화면에 표시', field: true, powered: true, inside: true, state: '기기 안에서 처리', body: 'PN532 칩이 받은 값을 ESP32-S3로 넘기고 화면에 그립니다. 이 과정에 Wi-Fi 접속이나 인터넷 전송은 필요하지 않습니다.' },
];

const LIST_DONE = '받은 값을 모아 목록을 보여 줍니다. 아래 “스캔 목록 읽기”의 표가 이 목록입니다. 목록이 보인다고 AP에 연결된 것은 아니며, 연결은 그 다음의 별도 과정입니다.';

export const SCAN_SCENARIOS: StepScenario[] = [
  {
    id: 'passive',
    label: '수동 탐색',
    steps: [
      { title: '채널을 맞추고 듣기', channel: 6, listed: 0, state: '듣는 중, 보내는 것 없음', body: '스캔 장비가 6번 채널에 머물며 아무것도 보내지 않고 기다립니다.', ask: ['스캔 장비가 전파를 보냈나요?', '아닙니다. 수동 탐색은 듣기만 합니다.'] },
      { title: 'Beacon 받기', channel: 6, listed: 1, newRow: 0, from: 1, signal: 'Beacon', body: 'AP는 자기 존재를 알리는 Beacon을 주기적으로 보냅니다. 먼저 말한 쪽은 AP입니다. 스캔 장비는 이름과 주소를 적습니다.' },
      { title: '다음 채널로', channel: 11, channelFrom: 6, listed: 2, newRow: 1, from: 1, signal: 'Beacon', body: '채널을 옮겨 듣기를 되풀이합니다. 11번 채널의 AP에서 온 Beacon이 목록에 더해집니다. 채널마다 머물러야 하므로 시간이 걸립니다.' },
      { title: '목록 완성', channel: 11, listed: 2, state: '스캔 끝', body: LIST_DONE },
    ],
  },
  {
    id: 'active',
    label: '능동 탐색',
    steps: [
      { title: 'Probe Request 보내기', channel: 6, listed: 0, from: 0, signal: 'Probe Request', body: '스캔 장비가 6번 채널에서 “근처에 AP가 있나요?”라고 먼저 프레임을 보냅니다. 수동 탐색과 달리 전파를 내보냅니다.', ask: ['이번에는 누가 먼저 말했나요?', '스캔 장비입니다. 수동 탐색에서는 AP의 Beacon을 기다렸습니다.'] },
      { title: 'Probe Response 받기', channel: 6, listed: 1, newRow: 0, from: 1, signal: 'Probe Response', body: 'AP가 자기 정보를 담아 답합니다. 스캔 장비는 이 값을 목록에 적습니다.' },
      { title: '다음 채널로', channel: 11, channelFrom: 6, listed: 2, newRow: 1, from: 0, signal: 'Probe Request', returns: 'Probe Response', body: '채널을 옮겨 같은 왕복을 되풀이합니다. 11번 채널의 AP가 답하면 목록에 더해집니다.' },
      { title: '목록 완성', channel: 11, listed: 2, state: '스캔 끝', body: LIST_DONE },
    ],
  },
];

export const WEB_STEPS: VisualStep[] = [
  { title: 'AP에 연결', peer: 'AP (공유기)', from: 0, signal: '연결과 Wi-Fi 인증', returns: '연결 완료', body: '단말기가 AP와 연결을 맺습니다. 여기까지는 같은 Wi-Fi 안의 이야기이고, 아직 인터넷을 쓴 것은 아닙니다.' },
  { title: '주소 받기', peer: 'DHCP 서버 (보통 공유기)', from: 0, signal: '주소 요청', returns: 'IP 주소', body: 'DHCP로 단말기가 쓸 IP 주소, 공유기 주소, DNS 서버 주소를 받습니다.' },
  { title: '이름을 주소로', peer: 'DNS 서버', from: 0, signal: 'example.com은 어디?', returns: 'IP 주소', body: 'DNS로 example.com 같은 이름을 IP 주소로 바꿉니다. 상대는 웹 서버가 아니라 DNS 서버입니다.', ask: ['지금 웹 서버와 말하고 있나요?', '아직 아닙니다. 주소를 알아내는 단계입니다. 웹 서버와는 다음 단계부터 말합니다.'] },
  { title: '연결 맺기', peer: '웹 서버 (AP를 거쳐)', from: 0, signal: 'TCP 연결 요청', returns: '수락', body: 'TCP로 웹 서버와 데이터를 순서대로 주고받을 통로를 만듭니다. 신호는 AP를 거쳐 인터넷으로 나갑니다.' },
  { title: '암호화 준비', peer: '웹 서버 (AP를 거쳐)', from: 0, signal: 'TLS 시작', returns: '서버 인증서', body: 'TLS로 서버를 확인하고 암호화 키를 합의합니다. 이후의 내용은 암호화됩니다.' },
  { title: '요청과 응답', peer: '웹 서버 (AP를 거쳐)', from: 0, signal: 'HTTPS 요청', returns: 'HTTPS 응답', body: '브라우저가 페이지를 요청하고 서버가 응답합니다.' },
];

export const LAYER_STEPS: VisualStep[] = [
  { title: '응용 데이터', layers: ['HTTP 요청'], body: '브라우저가 만든 요청입니다.' },
  { title: 'TLS 암호화', layers: ['TLS 암호문'], body: 'HTTPS에서는 TLS가 요청을 암호문으로 바꿉니다. 이후 단계에서는 이 암호문을 안에 담아 나릅니다.', ask: ['이 뒤로 요청 내용이 그대로 보일까요?', '아닙니다. 이후 계층은 암호문을 담아 나릅니다. 다만 주소 같은 헤더는 따로 보입니다.'] },
  { title: '전송 계층', layers: ['TCP 헤더', 'TLS 암호문'], body: 'TCP 헤더가 앞에 붙습니다. 어느 프로그램으로 갈지 정하는 포트 번호와 순서 정보가 들어 있습니다.' },
  { title: 'IP 패킷', layers: ['IP 헤더', 'TCP 헤더', 'TLS 암호문'], body: 'IP 헤더가 붙습니다. 출발지와 목적지 IP 주소가 들어 있어 같은 내부망은 물론 인터넷 너머까지 찾아갈 수 있습니다.' },
  { title: 'Wi-Fi 프레임', layers: ['Wi-Fi 헤더', 'IP 헤더', 'TCP 헤더', 'TLS 암호문'], body: 'Wi-Fi 헤더가 붙습니다. 같은 무선 구간의 MAC 주소가 들어 있습니다. WPA2, WPA3 같은 보안 설정을 쓰면 프레임 내용이 무선 구간에서 한 번 더 암호화됩니다.' },
  { title: '전파', state: '채널의 전파 신호', body: '프레임이 전파 신호가 되어 공기 중으로 나갑니다. 받는 쪽은 이 순서를 거꾸로 밟아 데이터를 꺼냅니다.' },
];

export const MODEL_NOTE = '원리 설명용 모형입니다. 실제 전파를 캡처한 기록이 아닙니다.';
export const SCREEN_CAPTION = '실제 화면을 바탕으로 재구성한 학습 이미지입니다.';

export interface PathStep {
  n: number;
  href: string;
  title: string;
  does: string;
  done: string;
}

// 학습 순서의 유일한 원본. 메뉴, 현재 위치, 이전과 다음 링크가 모두 이 목록을 쓴다.
export const LEARNING_PATH: PathStep[] = [
  { n: 0, href: '/learn/why/', title: '기술이 생긴 배경', does: '여섯 가지 무선 기술이 어떤 일상의 불편을 푸는지 읽습니다.', done: 'Wi-Fi, BLE, NFC가 각각 어떤 문제에 맞는지 한 문장씩 말할 수 있습니다.' },
  { n: 1, href: '/start/', title: '기기 준비', does: '안테나, 전원, 버튼, SD 카드를 확인합니다.', done: '기기를 켜고 About과 Card Reader 화면까지 들어갈 수 있습니다.' },
  { n: 2, href: '/learn/device/', title: '첫 태그 읽기', does: '메뉴를 따라가 내 태그를 한 번 읽습니다.', done: '태그의 UID와 Info 화면 값을 공책에 옮겨 적었습니다.' },
  { n: 3, href: '/learn/nfc/', title: 'NFC 통신 원리', does: '태그와 리더 사이에 무엇이 오가는지 배웁니다.', done: '화면의 값이 어느 통신 단계에서 왔는지 설명할 수 있습니다.' },
  { n: 4, href: '/learn/network/', title: 'Wi-Fi와 네트워크', does: 'NFC와 다른 점과 데이터가 전달되는 길을 배웁니다.', done: 'NFC와 Wi-Fi가 데이터를 전하는 방식의 차이를 설명할 수 있습니다.' },
  { n: 5, href: '/learn/security/', title: '정보보호학 관점에서 이해하기', does: '무엇을 지킬지 정하고 기술별 방어와 한계를 봅니다.', done: 'UID로 문을 여는 예를 위협 모델 표로 쓸 수 있습니다.' },
  { n: 6, href: '/lab/nfc/', title: '실험, 분석, 보고서', does: '조건을 나눠 재고 분석해 내 말로 보고서를 씁니다.', done: '실험 기록, 그래프, 내 말로 쓴 보고서가 있습니다.' },
];

export const REFERENCE_LINKS: [string, string, string][] = [
  ['/device/', '기기 알아보기', '부품과 표기를 원본 사진으로 볼 때'],
  ['/guide/', '기능 가이드', '메뉴의 기능을 찾아볼 때'],
  ['/learn/glossary/', '용어 사전', '낯선 말을 찾을 때'],
  ['/learn/projects/', '기술노트', '관심 있는 주제의 배경과 탐구 질문을 읽을 때'],
  ['/update/', '업데이트·문제 해결', '문제가 생겼거나 펌웨어가 궁금할 때'],
];
