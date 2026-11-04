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
  { id: 'wifi', name: 'WiFi', ko: '와이파이', role: '주변 공유기와 채널을 살펴보는 도구 모음입니다.', next: 'WiFi를 고르면 기능 목록이 나옵니다.', checked: '상위 분류 표시 확인. 하위 경로는 공식 문서 기준, 실행은 미확인.', href: '/guide/wifi/', linkLabel: 'Wi-Fi 기능 가이드' },
  { id: 'bluetooth', name: 'Bluetooth', ko: '블루투스', role: '주변 BLE 기기가 보내는 신호를 관찰하는 도구 모음입니다.', next: 'Bluetooth를 고르면 기능 목록이 나옵니다.', checked: '상위 분류 표시 확인. 하위 경로는 공식 문서 기준, 실행은 미확인.', href: '/guide/ble/', linkLabel: 'BLE 기능 가이드' },
  { id: '24ghz', name: '2.4GHz', ko: '2.4GHz 대역', role: '2.4GHz 대역의 신호 에너지를 살펴보는 도구 모음입니다.', next: '2.4GHz를 고르면 기능 목록이 나옵니다.', checked: '상위 분류 표시 확인. 하위 경로는 공식 문서 기준, 실행은 미확인.', href: '/guide/24ghz/', linkLabel: '2.4GHz 기능 가이드' },
  { id: 'subghz', name: 'SubGHz', ko: '1GHz 아래 대역', role: '리모컨 등이 쓰는 낮은 주파수를 다루는 도구 모음입니다.', next: 'SubGHz를 고르면 기능 목록이 나옵니다.', checked: '상위 분류 표시 확인. 하위 경로는 공식 문서 기준, 실행은 미확인.', href: '/guide/subghz/', linkLabel: 'Sub-GHz 기능 가이드' },
  { id: 'more', name: 'More', ko: '더보기', role: 'IR Remote, RFID/NFC, GPS, Games를 모아 둔 메뉴입니다.', next: 'NFC 실험은 More → RFID/NFC → Card Reader 순서로 갑니다.', checked: '하위 메뉴까지 확인. NFC 읽기만 실행 확인.', href: '#more', linkLabel: 'More 화면 보기' },
  { id: 'tools', name: 'Tools', ko: '도구', role: '시리얼 모니터, 펌웨어 업데이트, 터치 보정, SD 파일 관리 같은 관리 도구입니다.', next: 'Tools를 고르면 기능 목록이 나옵니다.', checked: '상위 분류 표시 확인. 하위 경로는 공식 문서 기준, 실행은 미확인.', href: '/guide/system/', linkLabel: '시스템 기능 가이드' },
  { id: 'settings', name: 'Settings', ko: '설정', role: '밝기, 화면 테마, 표시등, 자동 스캔을 바꿉니다.', next: 'Settings를 고르면 설정 화면이 바로 열립니다.', checked: '상위 분류 표시 확인. 하위 경로는 공식 문서 기준, 실행은 미확인.', href: '/guide/system/#settings', linkLabel: '설정 가이드' },
  { id: 'about', name: 'About', ko: '기기 정보', role: '기기 이름, 펌웨어, 보드, 빌드 이름을 보여 줍니다.', next: 'About을 고르면 정보 화면이 열립니다.', checked: '화면 내용까지 확인.', href: '#about', linkLabel: 'About 화면 보기' },
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
  { title: '화면에 표시', field: true, powered: true, state: '기기 안에서 처리', body: 'PN532 칩이 받은 값을 ESP32-S3로 넘기고 화면에 그립니다. 이 과정에 Wi-Fi 접속이나 인터넷 전송은 필요하지 않습니다.' },
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
  ['/learn/glossary/', '용어 사전', '낯선 말을 찾을 때'],
  ['/learn/projects/', '기술노트', 'NFC 실험 다음에 해 볼 주제를 고를 때'],
  ['/device/', '기기 알아보기', '부품과 표기를 원본 사진으로 볼 때'],
  ['/guide/', '기능 가이드', '메뉴의 기능을 찾아볼 때'],
  ['/lab/', '관찰 실험 모음', 'Wi-Fi, BLE, IR, GPS 관찰 주제를 볼 때'],
  ['/update/', '업데이트·문제 해결', '문제가 생겼거나 펌웨어가 궁금할 때'],
];
