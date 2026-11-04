// 한글 용어 사전. 각 항목은 뜻, 실제 예, 헷갈리는 점, 관련 학습 위치를 함께 적는다.

export const GLOSSARY_CATEGORIES = ['NFC', '데이터 표현', 'Wi-Fi', '인터넷', 'BLE', '탐구 방법'] as const;
export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];

export interface Term {
  id: string;
  ko: string;
  en: string;
  aliases: string[];
  category: GlossaryCategory;
  mean: string;
  example: string;
  confuse: string;
  href: string;
  hrefLabel: string;
}

type Row = [id: string, ko: string, en: string, aliases: string[], mean: string, example: string, confuse: string, href: string, hrefLabel: string];

const NFC_FLOW = ['/learn/nfc/#flow', 'NFC 통신 단계'] as const;
const NFC_SCREEN = ['/learn/nfc/#screen', '화면 해석'] as const;
const NFC_BYTES = ['/learn/nfc/#bytes', '바이트 실습'] as const;
const NFC_MEM = ['/learn/nfc/#memory', '메모리 읽기'] as const;
const NFC_COUPLING = ['/learn/nfc/#coupling', '결합과 거리'] as const;
const SCAN = ['/learn/network/#scan', 'Wi-Fi 탐색'] as const;
const LIST = ['/learn/network/#list', '목록 읽기'] as const;
const WEB = ['/learn/network/#web', '웹 요청 흐름'] as const;
const LAYERS = ['/learn/network/#layers', '데이터 계층'] as const;
const MONITOR = ['/learn/network/#monitor', '보이는 것과 안 보이는 것'] as const;
const BLE = ['/learn/network/#ble', 'BLE 이해하기'] as const;
const DESIGN = ['/lab/nfc/#design', '실험 설계'] as const;
const CHART = ['/lab/nfc/#chart', '인식률 그래프'] as const;
const DATA = ['/lab/nfc/#data', 'CSV 백업'] as const;

const group = (category: GlossaryCategory, rows: Row[]): Term[] =>
  rows.map(([id, ko, en, aliases, mean, example, confuse, href, hrefLabel]) => ({ id, ko, en, aliases, category, mean, example, confuse, href, hrefLabel }));

export const GLOSSARY: Term[] = [
  ...group('NFC', [
    ['nfc', '근거리 무선 통신', 'NFC', ['Near Field Communication'], '아주 가까운 거리에서 13.56MHz 자기장으로 데이터를 주고받는 기술입니다.', '교통카드를 단말기에 대는 동작이 같은 계열입니다.', '가깝다는 뜻이지 안전하다는 뜻은 아닙니다. 보안은 태그와 응용 설계에 달려 있습니다.', ...NFC_FLOW],
    ['rfid', '무선 식별', 'RFID', ['Radio Frequency Identification'], '전파로 물건이나 태그를 알아보는 기술 전체를 부르는 말입니다.', '도서관 책 태그, 물류 태그가 있습니다.', 'NFC는 RFID 가운데 13.56MHz 근거리 쪽 일부입니다. 모든 RFID가 NFC는 아닙니다.', ...NFC_FLOW],
    ['reader', '리더', 'Reader', ['판독기', 'PCD'], '자기장을 만들고 태그에 먼저 말을 거는 쪽입니다.', '이 기기의 PN532가 리더 역할을 합니다.', '화면의 Reader는 리더 칩을 말하고, 메뉴의 Card Reader는 그 기능 이름입니다.', ...NFC_FLOW],
    ['tag', '태그', 'Tag', ['카드', 'PICC', 'Transponder'], '코일과 칩으로 이루어져 리더의 요청에 답하는 작은 장치입니다.', '실험에 쓰는 25mm 접착식 NFC 스티커입니다.', '메뉴 이름에 Card가 있어도 카드 모양일 필요는 없습니다.', ...NFC_FLOW],
    ['passive-tag', '수동 태그', 'Passive tag', ['패시브'], '배터리 없이 리더 자기장에서 에너지를 얻어 동작하는 태그입니다.', '실험용 NFC 스티커는 수동 태그입니다.', '수동이라고 해서 전혀 응답하지 않는 것은 아닙니다. 부하 변조로 답합니다.', ...NFC_COUPLING],
    ['active-tag', '능동 태그', 'Active tag', ['액티브'], '자체 전원으로 신호를 내는 태그입니다.', '먼 거리 추적에 쓰는 전지 내장 태그가 있습니다.', '이번 실험의 태그는 능동 태그가 아닙니다.', ...NFC_COUPLING],
    ['frequency', '주파수', 'Frequency', ['진동수'], '신호가 1초에 몇 번 반복되는지를 나타내는 값입니다.', 'NFC는 13.56MHz, 이 기기의 Wi-Fi는 2.4GHz 대역을 씁니다.', '주파수가 높다고 항상 더 멀리 가거나 더 좋은 것은 아닙니다.', ...NFC_COUPLING],
    ['hertz', '헤르츠', 'Hz, MHz, GHz', ['메가헤르츠', '기가헤르츠', '킬로헤르츠', 'kHz'], '주파수의 단위입니다. 1MHz는 100만 Hz, 1GHz는 10억 Hz입니다.', '13.56MHz는 1초에 1356만 번 반복됩니다.', '데이터 속도 단위(bps)와 다릅니다.', ...NFC_COUPLING],
    ['antenna', '안테나', 'Antenna', ['코일'], '전기 신호와 전자기 신호를 서로 바꾸는 부품입니다.', '뒷면 단자의 막대 안테나, 태그 안의 평평한 코일이 있습니다.', '이 기기의 NFC 코일 위치는 확인하지 못했습니다. 인쇄 위치와 같다고 단정하지 않습니다.', ...NFC_COUPLING],
    ['magnetic-field', '자기장', 'Magnetic field', ['RF 필드'], '전류가 흐르는 코일 주변에 생기는, 자기력이 미치는 공간입니다.', '리더가 13.56MHz로 바뀌는 자기장을 만듭니다.', '거리에 따라 빠르게 약해져서 NFC 거리가 짧습니다.', ...NFC_COUPLING],
    ['inductive-coupling', '유도 결합', 'Inductive coupling', ['전자기 유도'], '한 코일의 자기장 변화가 가까운 다른 코일에 전기를 일으키는 현상입니다.', '태그 코일이 리더 자기장에서 전기를 얻습니다.', '두 코일의 거리와 방향이 바뀌면 결합 세기도 바뀝니다.', ...NFC_COUPLING],
    ['load-modulation', '부하 변조', 'Load modulation', ['로드 모듈레이션'], '태그가 자기 부하를 바꿔 리더 자기장에 작은 변화를 만들어 답하는 방식입니다.', '수동 태그의 ATQA 응답이 이렇게 전달됩니다.', '태그는 리더에서 얻은 에너지로 동작하며, 별도 송신기로 새 신호를 만들지 않습니다.', ...NFC_FLOW],
    ['protocol', '프로토콜', 'Protocol', ['통신 규칙', '규약'], '서로 어떤 순서와 형식으로 말할지 정한 약속입니다.', '화면의 Protocol: ISO14443A가 이번 태그의 규칙입니다.', '기계와 부품 이름이 아니라 규칙의 이름입니다.', ...NFC_SCREEN],
    ['iso14443a', 'ISO14443A', 'ISO/IEC 14443 Type A', ['타입 A', 'Type A'], '13.56MHz 근접 카드의 국제 표준 가운데 Type A 방식입니다.', 'Card Reader 대기 화면이 이 태그를 대 달라고 안내합니다.', '이 방식의 프레임은 인터넷 IP 패킷과 다릅니다.', ...NFC_FLOW],
    ['pn532', 'PN532', 'PN532', ['리더 칩', 'NFC 컨트롤러'], 'NXP의 NFC 컨트롤러 칩입니다. 이 기기 화면에 리더 칩으로 표시됩니다.', '화면의 PN532 0x32010607이 칩과 버전 정보입니다.', '0x32010607은 리더 칩 정보이고, About의 1.7.2는 기기 펌웨어 표시입니다.', ...NFC_SCREEN],
    ['uid', '고유 식별값', 'UID', ['Unique Identifier', '식별자'], '태그를 구분하는 번호입니다.', '이 실험 태그의 UID는 530105D0430001입니다.', '암호키, 계좌, 비밀번호가 아닙니다. UID를 읽었다고 메모리를 다 읽은 것도 아닙니다.', ...NFC_BYTES],
    ['ntag213', 'NTAG213', 'NTAG213', ['NTAG', 'NTAG21x'], 'NXP의 NFC 태그 칩입니다. 데이터시트 기준 사용자 메모리는 144바이트입니다.', '구매 화면의 표기가 NTAG213입니다.', '구매 표기와 기기 표시(Ultralight-compatible)가 달라, 실제 칩 모델은 확인하지 못했습니다.', '/learn/nfc/#capacity', '메모리 크기 질문'],
    ['ultralight', 'MIFARE Ultralight', 'MIFARE Ultralight', ['울트라라이트', 'Ultralight-compatible'], 'NXP의 소용량 태그 제품군 이름입니다. 호환이라는 말은 비슷한 방식으로 동작한다고 판단했다는 뜻입니다.', '화면의 Detected type: Ultralight입니다.', '화면의 종류 표시가 곧 실제 제조사나 칩 모델을 증명하지는 않습니다.', ...NFC_SCREEN],
    ['atqa', '탐색 응답', 'ATQA', ['Answer To Request'], '리더의 탐색 요청에 태그가 처음 돌려주는 값입니다.', '화면의 ATQA 0044입니다.', '종류를 가늠하는 단서이지 정확한 모델 번호가 아닙니다.', ...NFC_FLOW],
    ['sak', '선택 응답', 'SAK', ['Select Acknowledge'], '선택 명령에 태그가 답하는 값입니다.', '화면의 SAK 00입니다.', 'ATQA처럼 단서입니다. 같은 값을 쓰는 칩이 여럿일 수 있습니다.', ...NFC_FLOW],
    ['reqa', '탐색 요청', 'REQA', ['Request Type A'], '리더가 쉬고 있는 Type A 태그를 찾는 짧은 요청입니다.', '통신의 시작 단계입니다.', '이 실험은 무선 캡처가 없어서 실제 순서를 화면으로 보지는 못합니다.', ...NFC_FLOW],
    ['wupa', '깨우기 요청', 'WUPA', ['Wake-Up Type A'], 'REQA와 비슷하지만 대기(HALT) 상태의 태그까지 깨우는 요청입니다.', '한 번 읽은 태그를 다시 부를 때 쓰일 수 있습니다.', '이 기기 펌웨어가 어느 요청을 쓰는지는 확인하지 못했습니다.', ...NFC_FLOW],
    ['anticollision', '충돌 방지', 'Anticollision', ['충돌 회피'], '여러 태그가 함께 답해도 하나씩 가려내는 절차입니다.', '지갑에 태그가 둘 있으면 이 절차가 중요해집니다.', '충돌 방지가 있어도 여러 태그를 섞으면 실험 변수가 늘어납니다.', ...NFC_FLOW],
    ['select', '선택', 'SELECT', ['선택 명령'], '찾은 UID의 태그를 대화 상대로 고르는 명령입니다.', '선택되면 태그가 SAK로 답합니다.', '화면 메뉴에서 고르는 Select 키와 다른 말입니다.', ...NFC_FLOW],
    ['read-command', '읽기 명령', 'READ', ['읽기'], '지정한 페이지의 내용을 돌려 달라는 명령입니다.', 'P4~P7 값을 보려면 이 단계가 필요합니다.', '읽기는 태그 내용을 바꾸지 않습니다. 쓰기와 지우기는 다른 기능입니다.', ...NFC_MEM],
    ['crc', '오류 검사값', 'CRC', ['Cyclic Redundancy Check'], '전송 중 값이 깨졌는지 확인하려고 덧붙이는 값입니다.', '무선 프레임 뒤에 붙어 전달됩니다.', '오류를 찾는 값이지 내용을 숨기는 암호가 아닙니다.', ...NFC_FLOW],
    ['ndef', 'NFC 데이터 형식', 'NDEF', ['NFC Data Exchange Format'], 'URL이나 글처럼 NFC로 전할 내용을 담는 표준 형식입니다.', '휴대폰이 태그의 URL을 여는 데 쓰입니다.', '메모리 샘플의 03 00은 길이가 0인 NDEF 자리로 읽을 수 있습니다.', ...NFC_MEM],
    ['tlv', '종류-길이-값', 'TLV', ['Type Length Value'], '데이터를 종류, 길이, 값 순서로 적는 방법입니다.', 'P4의 01 03 A0 0C 34가 이 구조로 읽힙니다.', '값 하나하나의 뜻을 알려면 해당 표준을 함께 봐야 합니다.', ...NFC_MEM],
    ['memory-sample', '메모리 샘플', 'Memory sample', ['User memory sample'], '메모리 전체가 아니라 일부 페이지만 보여 주는 표시입니다.', 'Info 2/2의 P4~P7, 16바이트입니다.', '이 16바이트로 태그의 전체 용량을 판정할 수 없습니다.', ...NFC_MEM],
    ['firmware', '펌웨어', 'Firmware', ['기기 소프트웨어'], '기기 안에 들어 있어 기기를 움직이는 프로그램입니다.', 'About의 1.7.2 stable by MK_SIGNAL_V1입니다.', '하드웨어 버전(V2.1), 판매자 빌드 이름(V1.2), 상위 프로젝트 번호는 서로 다른 값입니다.', '/learn/device/#about', 'About 화면 읽기'],
  ]),
  ...group('데이터 표현', [
    ['bit', '비트', 'bit', ['이진수 한 자리'], '0 또는 1 한 자리입니다.', '0x01은 00000001로 비트 8개입니다.', '비트(bit)와 바이트(byte)는 8배 차이입니다.', ...NFC_BYTES],
    ['byte', '바이트', 'byte', ['옥텟'], '비트 8개를 묶은 단위입니다.', 'UID는 7바이트입니다.', '16진수 두 자리가 1바이트입니다. 글자 수와 바이트 수를 헷갈리지 마세요.', ...NFC_BYTES],
    ['hex', '16진수', 'Hexadecimal, hex', ['헥사', '0x'], '0~9와 A~F로 수를 적는 방법입니다.', '화면의 0C, FE가 16진수입니다. 0xFE는 10진수 254입니다.', '0x는 16진수라는 표시이지 값의 일부가 아닙니다.', ...NFC_BYTES],
    ['page', '페이지', 'Page', ['메모리 페이지'], '태그 메모리를 나눈 단위입니다. NTAG213은 페이지마다 4바이트입니다.', 'P4는 4번 페이지입니다.', '화면 설명의 페이지가 아니라 메모리의 칸 묶음입니다.', ...NFC_MEM],
  ]),
  ...group('Wi-Fi', [
    ['wifi', '와이파이', 'Wi-Fi', ['802.11', '무선랜'], 'IEEE 802.11 표준을 쓰는 무선 네트워크입니다.', '집 공유기에 휴대폰을 연결합니다.', 'Wi-Fi는 무선 구간의 이름이고 인터넷 자체가 아닙니다.', ...SCAN],
    ['ap', '접속 지점', 'AP', ['Access Point', '공유기'], '단말기들이 무선으로 연결하는 지점입니다.', '집 공유기 안에 AP 기능이 있습니다.', '공유기는 AP 외에 라우터, DHCP 같은 기능을 함께 가진 경우가 많습니다.', ...SCAN],
    ['station', '단말기', 'Station', ['STA', '클라이언트'], 'AP에 연결해 통신하는 기기입니다.', '휴대폰, 노트북입니다.', '스캔 장비는 연결하지 않고 목록만 볼 수도 있습니다.', ...SCAN],
    ['ssid', '네트워크 이름', 'SSID', ['와이파이 이름'], '사람이 보는 Wi-Fi 네트워크 이름입니다.', 'MyHome_2G 같은 이름입니다.', '이름은 겹칠 수 있어 AP 하나를 정확히 가리키지 않습니다.', ...LIST],
    ['bssid', 'AP 주소', 'BSSID', ['Basic Service Set Identifier'], 'AP의 무선 인터페이스를 구별하는 주소입니다. 보통 MAC 주소 형식입니다.', 'AA:BB:CC:11:22:33 형식입니다.', '같은 SSID라도 AP가 다르면 BSSID가 다릅니다.', ...LIST],
    ['mac', 'MAC 주소', 'MAC address', ['맥 주소', '하드웨어 주소'], '같은 네트워크 구간에서 기기를 구별하는 주소입니다.', 'Wi-Fi 헤더에 들어갑니다.', '요즘 기기는 임의 주소를 쓰기도 해서 한 사람을 뜻한다고 단정할 수 없습니다.', ...LAYERS],
    ['rssi', '수신 신호 세기', 'RSSI', ['Received Signal Strength Indicator', '신호 세기'], '받은 신호의 세기를 나타내는 값입니다. 보통 dBm으로 표시합니다.', '-40dBm이 -70dBm보다 강합니다.', '거리나 도청 가능성을 정확히 알려 주는 값이 아닙니다. 벽, 방향, 혼잡에 따라 달라집니다.', '/learn/network/#rssi', 'RSSI 읽기'],
    ['dbm', '디비엠', 'dBm', ['데시벨 밀리와트'], '전력을 1mW 기준의 로그 값으로 나타내는 단위입니다.', '3dB 차이는 전력이 약 2배 차이입니다.', '음수가 약하다는 뜻이 아니라, 0에 가까울수록 강하다는 뜻입니다.', '/learn/network/#rssi', 'RSSI 읽기'],
    ['channel', '채널', 'Channel', ['무선 채널'], '대역을 나눈 주파수 구간입니다.', '2.4GHz의 1, 6, 11번 채널이 자주 쓰입니다.', '같은 채널을 쓰면 서로 간섭할 수 있습니다.', ...LIST],
    ['bandwidth', '대역폭', 'Bandwidth', ['채널 폭', '주파수 폭'], '신호가 차지하는 주파수의 폭입니다.', '20MHz, 40MHz 폭이 있습니다.', '인터넷 요금제의 속도를 부르는 말과 뜻이 겹쳐 헷갈리기 쉽습니다.', ...LIST],
    ['beacon', '비콘', 'Beacon', ['Beacon frame'], 'AP가 자기 존재를 알리려고 주기적으로 보내는 프레임입니다.', '수동 탐색이 이것을 듣습니다.', '위치 추적용 BLE 비콘과 이름만 같습니다.', ...SCAN],
    ['probe', '탐색 요청과 응답', 'Probe Request, Probe Response', ['프로브', 'Probe'], '단말기가 AP를 찾으려고 묻고 AP가 답하는 프레임입니다.', '능동 탐색이 이것을 씁니다.', '스캔이 언제나 듣기만 하는 것은 아닙니다. 능동 탐색은 전파를 보냅니다.', ...SCAN],
    ['frame', '프레임', 'Frame', ['Wi-Fi 프레임'], '같은 링크 구간에서 전달되는 데이터 묶음입니다.', 'Wi-Fi 프레임 안에 IP 패킷이 들어갑니다.', '패킷과 자주 섞어 쓰지만 계층이 다릅니다.', ...LAYERS],
    ['packet', '패킷', 'Packet', ['IP 패킷'], '주소가 든 헤더를 달고 목적지를 찾아가는 데이터 묶음입니다.', 'IP 패킷은 인터넷뿐 아니라 내부망에서도 쓰입니다.', 'NFC의 ISO14443A 프레임은 IP 패킷이 아닙니다.', ...LAYERS],
    ['header', '헤더', 'Header', ['머리글'], '데이터 앞에 붙는 주소, 순서 같은 안내 정보입니다.', 'IP 헤더에 목적지 주소가 있습니다.', '내용물이 아니라 배달 정보입니다.', ...LAYERS],
    ['payload', '페이로드', 'Payload', ['실제 내용'], '헤더를 뺀 전달 내용입니다.', 'HTTPS의 페이로드는 암호화되어 있습니다.', '한 계층의 페이로드 안에 다음 계층의 헤더가 들어 있습니다.', ...LAYERS],
    ['scan', '스캔', 'Scan', ['탐색', '주변 검색'], '주변 네트워크나 신호를 찾아보는 동작입니다.', 'WiFi Scanner 메뉴입니다.', '방식은 수동과 능동이 있습니다. 이 기기 방식은 아직 확인하지 못했습니다.', ...SCAN],
    ['sniffing', '스니핑', 'Sniffing', ['패킷 수집', '엿듣기'], '오가는 프레임을 받아 기록하는 일입니다.', 'Packet Monitor가 채널 활동량을 보여 줍니다.', '받는다고 내용을 읽는 것은 아닙니다. 암호화된 내용은 그대로 읽을 수 없습니다.', ...MONITOR],
    ['pcap', '패킷 기록 파일', 'PCAP', ['packet capture', '캡처 파일'], '수집한 프레임을 저장하는 파일 형식입니다.', 'Packet Monitor가 SD 카드에 저장할 수 있다고 문서에 적혀 있습니다.', '주변 통신 정보가 담길 수 있어 내 네트워크 실험에만 저장합니다.', ...MONITOR],
    ['spectrum', '에너지 스캔', 'Spectrum scan', ['스펙트럼', '2.4GHz Scanner'], '주파수별 신호 에너지를 보는 일입니다.', '2.4GHz Scanner 메뉴입니다.', '메시지를 해독하는 기능이 아닙니다. 어떤 기기의 신호인지도 알려 주지 않습니다.', '/learn/network/#energy', '에너지 스캔'],
  ]),
  ...group('인터넷', [
    ['ip', 'IP 주소', 'IP address', ['아이피', 'IPv4'], '네트워크에서 기기를 찾아가는 주소입니다.', '192.168.0.10 같은 값입니다.', '192.168로 시작하는 주소는 내부망 주소라 인터넷에서 그대로 쓰지 못합니다.', ...LAYERS],
    ['dhcp', '자동 주소 설정', 'DHCP', ['Dynamic Host Configuration Protocol'], '연결한 기기에 IP 주소 등을 자동으로 나눠 주는 규칙입니다.', 'Wi-Fi에 붙으면 주소를 받습니다.', '고정 IP를 쓰면 이 단계가 없습니다.', ...WEB],
    ['dns', '도메인 이름 변환', 'DNS', ['Domain Name System'], 'example.com 같은 이름을 IP 주소로 바꾸는 체계입니다.', '브라우저가 주소창의 이름을 먼저 바꿉니다.', '이미 저장해 둔 값이 있으면 다시 묻지 않기도 합니다.', ...WEB],
    ['arp', '주소 확인', 'ARP', ['Address Resolution Protocol'], '같은 구간에서 IPv4 주소에 해당하는 MAC 주소를 찾는 규칙입니다.', 'ARP Scanner 메뉴가 표로 보여 줍니다.', '인터넷 건너편 기기의 MAC을 알려 주지 않습니다.', '/learn/network/#arp-nat', 'ARP와 NAT'],
    ['nat', '주소 변환', 'NAT', ['Network Address Translation'], '오가는 패킷의 주소를 바꿔 주는 기능입니다.', '가정용 공유기가 집안 기기 여러 대를 공인 주소 하나로 내보내는 것이 대표적입니다.', 'ARP와 전혀 다른 개념입니다. 보안 기능으로 만든 것도 아닙니다.', '/learn/network/#arp-nat', 'ARP와 NAT'],
    ['tcp', '전송 제어', 'TCP', ['Transmission Control Protocol'], '순서와 재전송을 챙겨 데이터를 안정적으로 전하는 규칙입니다.', '웹 요청에 자주 쓰입니다.', '안정적이라는 뜻이지 암호화한다는 뜻이 아닙니다.', ...WEB],
    ['udp', '사용자 데이터그램', 'UDP', ['User Datagram Protocol'], '재전송 절차 없이 간단히 데이터를 보내는 규칙입니다.', 'DNS 질의에 자주 쓰입니다.', 'HTTP/3처럼 UDP 위에서 안정성을 따로 만드는 경우도 있습니다.', ...WEB],
    ['http', '웹 통신 규칙', 'HTTP, HTTPS', ['Hypertext Transfer Protocol', '웹 요청'], '브라우저와 서버가 요청과 응답을 주고받는 규칙입니다. HTTPS는 TLS로 보호합니다.', '주소창의 https://입니다.', 'HTTPS여도 어느 서버에 접속했는지 같은 정보는 일부 보일 수 있습니다.', ...WEB],
    ['tls', '전송 계층 보안', 'TLS', ['Transport Layer Security', 'SSL'], '서버를 확인하고 내용을 암호화하는 규칙입니다.', 'HTTPS의 S를 이룹니다.', 'Wi-Fi 비밀번호 암호화와 다른 구간의 보호입니다.', ...WEB],
    ['encryption', '암호화', 'Encryption', ['암호'], '키가 없으면 읽을 수 없게 데이터를 바꾸는 일입니다.', 'HTTPS의 내용입니다.', '인코딩이나 16진수 표기는 암호화가 아닙니다.', ...MONITOR],
    ['authn-authz', '인증과 인가', 'Authentication, Authorization', ['인증', '인가', '권한'], '인증은 누구인지 확인하는 일, 인가는 무엇을 해도 되는지 정하는 일입니다.', '로그인은 인증, 관리자 메뉴 접근 허용은 인가입니다.', 'UID를 읽는 것만으로 인증이 되어서는 안 됩니다.', ...MONITOR],
  ]),
  ...group('BLE', [
    ['ble', '저전력 블루투스', 'BLE', ['Bluetooth Low Energy', '블루투스 LE'], '적은 전력으로 짧은 데이터를 주고받는 블루투스 방식입니다.', '스마트밴드, 이어폰 케이스 등이 씁니다.', 'ESP32-S3 내장 Bluetooth는 LE만 지원합니다. 클래식 Bluetooth와 다릅니다.', ...BLE],
    ['classic-bt', '클래식 블루투스', 'Classic Bluetooth', ['BR/EDR'], '오디오처럼 연속 데이터에 많이 쓰는 기존 방식입니다.', '오래된 무선 스피커 연결이 있습니다.', 'BLE와 서로 다른 방식입니다.', ...BLE],
    ['advertising', '광고 패킷', 'Advertising', ['BLE 광고', 'Advertisement'], '기기가 “여기 있어요”라고 연결 없이 짧게 알리는 신호입니다.', 'BLE Scanner가 이것을 받아 목록을 만듭니다.', '상품 광고가 아닙니다. 연결된 뒤의 데이터와도 다릅니다.', ...BLE],
    ['ble-connection', 'BLE 연결', 'Connection', ['페어링'], '두 기기가 약속한 시간에 데이터를 주고받는 상태입니다.', '휴대폰과 밴드의 동기화입니다.', '광고를 받았다고 연결된 것이 아닙니다. 연결되면 광고를 멈추는 기기도 있습니다.', ...BLE],
  ]),
  ...group('탐구 방법', [
    ['independent-variable', '독립 변수', 'Independent variable', ['조작 변인'], '실험자가 일부러 바꾸는 값입니다.', '단독, 지갑, 가방 조건입니다.', '한 번에 하나만 바꿔야 원인을 나눌 수 있습니다.', ...DESIGN],
    ['dependent-variable', '종속 변수', 'Dependent variable', ['결과 변인', '측정값'], '그 결과로 달라지는지 재는 값입니다.', '인식 성공 여부와 인식률입니다.', '내가 정하는 값이 아니라 관찰하는 값입니다.', ...DESIGN],
    ['control-variable', '통제 변수', 'Controlled variable', ['통제 변인', '고정 조건'], '비교가 흐려지지 않도록 일정하게 두는 값입니다.', '같은 태그, 같은 방향, 같은 위치입니다.', '통제 못 한 값은 숨기지 말고 한계에 적습니다.', ...DESIGN],
    ['repetition', '반복', 'Repetition', ['반복 시험'], '같은 조건을 여러 번 시도하는 일입니다.', '조건마다 5회씩 합니다.', '직전 성공 화면을 그대로 세면 반복이 아닙니다.', ...DESIGN],
    ['sample', '표본', 'Sample', ['샘플', '시도 수'], '실제로 시험한 시도나 대상의 묶음입니다.', '45회 시도입니다.', '태그 한 개로 얻은 결과를 모든 태그로 넓히면 안 됩니다.', ...DESIGN],
    ['recognition-rate', '인식률', 'Recognition rate', ['성공률'], '성공 횟수를 시도 횟수로 나눈 값입니다.', '5회 중 4회면 80%입니다.', '5회의 100%가 항상 성공을 보장하지 않습니다.', ...CHART],
    ['hypothesis', '가설', 'Hypothesis', ['예상'], '이유와 함께 세운, 검증할 수 있는 예상입니다.', '천 가방은 거리를 늘려 인식률을 낮출 것입니다.', '틀려도 실패가 아닙니다. 맞게 고치기 위해 세웁니다.', ...DESIGN],
    ['error', '오차', 'Error', ['측정 오차'], '측정값과 실제 값의 차이입니다.', '자를 읽는 위치가 1mm씩 달라집니다.', '실수뿐 아니라 측정의 한계에서도 생깁니다.', ...DESIGN],
    ['reproducibility', '재현성', 'Reproducibility', ['재현'], '같은 방법으로 다시 해도 비슷한 결과가 나오는 정도입니다.', '다른 날 같은 설정으로 다시 잽니다.', '방법을 적어 두지 않으면 재현할 수 없습니다.', ...DESIGN],
    ['csv', '쉼표 구분 표', 'CSV', ['Comma-Separated Values'], '표를 쉼표로 구분해 글자로 저장한 파일입니다.', '이 사이트가 내려 주는 nfc-experiment.csv입니다.', '표 프로그램이 수식으로 실행할 수 있어 위험한 값을 막아 저장합니다.', ...DATA],
    ['groupby', '묶어 집계', 'groupby', ['그룹화'], '같은 값끼리 묶어 합계나 개수를 내는 일입니다.', 'pandas의 groupby로 조건별 성공 수를 셉니다.', '묶는 기준이 바뀌면 같은 자료도 다르게 보입니다.', '/lab/nfc/#python', '파이썬 분석'],
    ['control-group', '비교 기준', 'Baseline', ['대조군', '기준 조건'], '다른 조건과 비교할 기준입니다.', '단독 조건이 기준입니다.', '기준 조건도 반복해서 재야 합니다.', ...DESIGN],
  ]),
];
