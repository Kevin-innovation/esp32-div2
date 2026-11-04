// 기능 가이드 내용. 메뉴 이름은 펌웨어 v1.7.2 코드의 표기를 그대로 쓴다.
import { GLOSSARY } from './glossary';
import { WIKI } from './sources';

export interface Observe {
  kind: 'observe';
  device?: string;
  id: string;
  en: string;
  ko: string;
  aliases?: string[];
  path: string;
  manual: string | null;
  wiki?: string;
  purpose: string;
  prep: string[];
  steps: string[];
  read: string[];
  exit: string;
  trouble: string[];
}

export interface Lab {
  kind: 'lab';
  device?: string;
  id: string;
  en: string;
  ko: string;
  aliases?: string[];
  manual: string | null;
  wiki?: string;
  principle: string;
  impact: string;
  permit: string;
}

export type Feature = Observe | Lab;

export interface Group {
  slug: string;
  title: string;
  en: string;
  summary: string;
  hardware: string;
  note?: string;
  features: Feature[];
}

const EXIT_ICON = '화면 위 상태 표시줄의 종료 아이콘을 누릅니다. 기능마다 동작이 조금 다르므로 화면에 보이는 종료·뒤로 표시를 먼저 따릅니다.';
const NEARBY = '주변 사람의 기기 이름과 주소가 보일 수 있습니다. 화면을 찍어 공유하거나 파일로 남기지 않습니다.';
const WIRELESS_PERMIT = '전파 차폐 공간이나 허가받은 실험실에서, 시설 책임자와 모든 대상 기기 소유자의 동의를 받은 경우에만 다룹니다. 공공장소와 학교·집 공용 네트워크에서는 하지 않습니다.';

export const GROUPS: Group[] = [
  {
    slug: 'wifi',
    title: 'Wi-Fi',
    en: 'WiFi',
    summary: '주변 네트워크와 채널 혼잡을 읽는 도구부터 시작합니다.',
    hardware: '공식 문서 기준 ESP32-S3 내장 Wi-Fi를 씁니다. 어느 안테나 단자와 연결되는지는 이 기기에서 확인하지 못했습니다.',
    features: [
      {
        kind: 'observe', id: 'wifi-scanner', en: 'WiFi Scanner', ko: 'Wi-Fi 스캐너', aliases: ['와이파이 스캔', '네트워크 검색', 'SSID', 'RSSI', '채널'],
        path: 'WiFi → WiFi Scanner', manual: 'Wi-Fi Scanner', wiki: 'Wi-Fi-Scanner',
        purpose: '주변 공유기의 이름(SSID), 채널, 신호 세기(RSSI), 보안 방식을 목록으로 봅니다. 첫 스캔으로 가장 알맞습니다.',
        prep: ['안테나 체결 확인', '전원 켬', '내 공유기 이름을 미리 확인'],
        steps: ['메인 메뉴에서 WiFi를 고릅니다.', 'WiFi Scanner를 고릅니다.', '스캔이 끝날 때까지 기다립니다. 다시 스캔 표시가 있으면 한 번 더 눌러 봅니다.', '내 공유기 이름을 찾아 채널과 RSSI를 적습니다.'],
        read: ['RSSI는 음수이며 0에 가까울수록 강합니다.', '이름이 없는 줄은 이름을 숨긴 네트워크일 수 있습니다.', '보안 방식은 펌웨어가 판별 가능한 경우에만 표시된다고 문서에 적혀 있습니다.'],
        exit: EXIT_ICON,
        trouble: ['목록이 비거나 멈추면: 공식 FAQ는 v1.53 이후 저장 공간(NVS)이 차는 문제를 알려진 문제로 적고 있습니다. 해결은 재설치이므로 업데이트 페이지의 주의를 먼저 읽습니다.'],
      },
      {
        kind: 'observe', id: 'packet-monitor', en: 'Packet Monitor', ko: '패킷 모니터', aliases: ['폭포 그래프', '채널 혼잡', 'waterfall', 'PCAP'],
        path: 'WiFi → Packet Monitor', manual: 'Packet Monitor', wiki: 'Wi-Fi-Packet-Monitor',
        purpose: '채널별 활동량을 폭포 그래프로 보며 어느 채널이 붐비는지 관찰합니다.',
        prep: ['안테나 체결 확인', 'PCAP 저장을 쓸 경우 SD 카드. 파일에 주변 통신 정보가 담길 수 있어 내 네트워크 실험에만 저장'],
        steps: ['WiFi에서 Packet Monitor를 고릅니다.', '화면이 갱신되기 시작할 때까지 기다립니다.', '시간대나 위치를 바꿔 같은 채널의 변화를 비교합니다.'],
        read: ['활동량은 해당 채널이 붐비는 정도를 보여 줄 뿐, 통신 내용을 읽었다는 뜻이 아닙니다.', '기기를 옮기면 값이 바뀌므로 비교할 때는 위치를 고정합니다.'],
        exit: EXIT_ICON,
        trouble: ['화면이 갱신되지 않으면 안테나 체결을 확인하고 공유기가 보이는 곳으로 옮깁니다.', 'PCAP이 저장되지 않으면 SD 카드 삽입과 FAT 형식을 확인합니다.'],
      },
      {
        kind: 'observe', id: 'deauth-detector', en: 'Deauth Detector', ko: '연결 해제 공격 감지', aliases: ['디어스 감지', '방어', 'deauthentication'],
        path: 'WiFi → Deauth Detector', manual: 'Deauth Detector', wiki: 'Wi-Fi-Deauth-Detector',
        purpose: '연결 해제 프레임과 비슷한 패턴을 듣기만 하며 경고로 보여 주는 방어 쪽 도구입니다.',
        prep: ['관찰할 내 네트워크 정하기'],
        steps: ['WiFi에서 Deauth Detector를 고릅니다.', '표시기나 목록을 지켜봅니다.', '경고가 뜨면 시각과 채널을 적습니다.'],
        read: ['경고는 공격의 증거가 아닙니다. 공유기 재시작 같은 정상 동작과 구분되지 않을 수 있어 관찰 기록으로만 다룹니다.'],
        exit: EXIT_ICON,
        trouble: ['아무것도 표시되지 않아도 고장이 아닐 수 있습니다. 해당 패턴이 없으면 조용한 것이 정상입니다.'],
      },
      {
        kind: 'observe', id: 'wps-scanner', en: 'WPS Scanner', ko: 'WPS 스캐너', aliases: ['WPS 점검'],
        path: 'WiFi → WPS Scanner', manual: null,
        purpose: 'WPS가 켜진 공유기를 찾습니다. 내 공유기 설정 점검에 씁니다.',
        prep: ['내 공유기 이름 확인'],
        steps: ['WiFi 메뉴의 다음 페이지로 넘깁니다.', 'WPS Scanner를 고릅니다.', '내 공유기의 WPS 표시만 확인합니다.'],
        read: ['WPS가 켜져 있다면 공유기 관리 화면에서 필요 여부를 다시 판단합니다.'],
        exit: EXIT_ICON,
        trouble: ['내 공유기가 안 보이면 2.4GHz 라디오가 켜져 있는지 확인하고 다시 스캔합니다.'],
      },
      {
        kind: 'observe', id: 'arp-scanner', en: 'ARP Scanner', ko: 'ARP 스캐너', aliases: ['내부망 기기 목록', 'IP', 'MAC'],
        path: 'WiFi → ARP Scanner', manual: null,
        purpose: '접속한 네트워크 안의 기기 IP와 MAC을 표로 봅니다. 공식 설명상 네트워크에 먼저 접속해야 합니다.',
        prep: ['관리 권한이 있는 내 네트워크'],
        steps: ['내 네트워크에 접속합니다.', 'WiFi 메뉴의 다음 페이지에서 ARP Scanner를 고릅니다.', '내가 아는 기기 수와 표의 기기 수를 비교합니다.'],
        read: ['응답하지 않는 기기는 표에 없을 수 있어, 목록이 전부라고 단정하지 않습니다.'],
        exit: EXIT_ICON,
        trouble: ['접속에 실패하면 비밀번호와 2.4GHz 지원 여부를 확인합니다.'],
      },
      { kind: 'lab', id: 'beacon-spammer', en: 'Beacon Spammer', ko: '가짜 네트워크 이름 방송', manual: 'Beacon Spammer', wiki: 'Wi-Fi-Beacon-Spammer', principle: '공유기가 이름을 알리는 비콘 프레임을 임의의 이름으로 반복 송신합니다.', impact: '주변 사람의 네트워크 목록을 어지럽히고 혼란을 줄 수 있습니다.', permit: WIRELESS_PERMIT },
      { kind: 'lab', id: 'wifi-deauther', en: 'WiFi Deauther', ko: '연결 해제 프레임 송신', aliases: ['Deauth Attack', '디어스'], manual: 'Wi-Fi Deauthentication Attack', wiki: 'Wi-Fi-Deauther', principle: '관리 프레임을 위조해 기기와 공유기의 연결을 끊습니다. 공식 FAQ는 802.11w(PMF)를 쓰는 공유기에는 효과가 없다고 적습니다.', impact: '다른 사람의 통신을 실제로 끊습니다. 업무, 수업, 응급 연락을 방해할 수 있습니다.', permit: WIRELESS_PERMIT },
      { kind: 'lab', id: 'probe-flood', en: 'Probe Request Flood', ko: '탐색 요청 대량 송신', manual: null, wiki: 'Wi-Fi-Probe-Request-Flood', principle: '공유기를 찾는 요청 프레임을 대량으로 보내 부하를 만듭니다.', impact: '주변 공유기와 채널 품질을 떨어뜨립니다.', permit: WIRELESS_PERMIT },
      { kind: 'lab', id: 'captive-portal', en: 'Captive Portal', ko: '위장 로그인 페이지', aliases: ['Evil Portal', '이블 포털'], manual: 'Evil Portal', wiki: 'Wi-Fi-Captive-Portal', principle: '기기가 접속 지점과 웹 서버 역할을 해, 공용 Wi-Fi 로그인처럼 보이는 페이지를 띄웁니다.', impact: '다른 사람이 비밀번호와 개인정보를 입력하게 만들 수 있습니다. 이 사이트는 자격 증명 수집 절차를 다루지 않습니다.', permit: '실제 사용자가 접속할 수 없는 격리 환경에서 내 시험 계정으로만 다룹니다. 다른 사람의 입력을 받거나 실제 서비스 화면을 베끼지 않습니다.' },
      { kind: 'lab', id: 'hidden-ssid', en: 'Hidden SSID Revealer', ko: '숨김 SSID 드러내기', manual: null, principle: '숨긴 네트워크가 이름을 드러내도록 유도합니다. 공식 표현에 따르면 강제 방식입니다.', impact: '소유자가 숨겨 둔 정보를 드러내고 연결에도 영향을 줄 수 있습니다.', permit: '내가 관리하는 시험 네트워크에서만 다룹니다.' },
      { kind: 'lab', id: 'karma', en: 'Karma Attack', ko: '저장 네트워크 위장', manual: null, principle: '기기가 찾는 네트워크 이름을 듣고 그 이름인 척 응답해 자동 접속을 유도합니다.', impact: '다른 사람의 기기를 동의 없이 연결시킵니다.', permit: '내 소유의 시험 기기만 있는 격리 환경에서만 다룹니다.' },
    ],
  },
  {
    slug: 'ble',
    title: 'Bluetooth·BLE',
    en: 'Bluetooth',
    summary: '내 이어폰이나 밴드가 보내는 광고 신호를 관찰합니다.',
    hardware: '공식 문서 기준 ESP32-S3 내장 BLE를 씁니다.',
    features: [
      {
        kind: 'observe', id: 'ble-scanner', en: 'BLE Scanner', ko: 'BLE 스캐너', aliases: ['블루투스 스캔', '주변 기기'],
        path: 'Bluetooth → BLE Scanner', manual: 'BLE Scanner', wiki: 'Bluetooth-BLE-Scanner',
        purpose: '주변 BLE 기기의 이름, 주소, RSSI를 목록으로 봅니다.',
        prep: ['내 BLE 기기 하나(이어폰, 밴드 등)'],
        steps: ['메인 메뉴에서 Bluetooth를 고릅니다.', 'BLE Scanner를 고릅니다.', '결과를 기다리고, 다시 스캔 표시가 있으면 한 번 더 누릅니다.', '내 기기를 켜고 끄면서 목록 변화를 비교합니다.'],
        read: ['주소가 시간에 따라 바뀌는 기기가 있어, 같은 주소가 곧 같은 기기라고 단정하지 않습니다.', NEARBY],
        exit: EXIT_ICON,
        trouble: ['내 기기가 안 보이면 페어링 모드나 광고 상태를 확인합니다. 이미 다른 기기에 연결되면 광고하지 않는 기기도 있습니다.'],
      },
      {
        kind: 'observe', id: 'ble-sniffer', en: 'Sniffer', ko: 'BLE 관찰', aliases: ['BLE Sniffer', '스니퍼', '패킷 수'],
        path: 'Bluetooth → Sniffer', manual: 'BLE Sniffer', wiki: 'Bluetooth-BLE-Sniffer',
        purpose: '주소, RSSI, 패킷 수, 마지막 확인 시각을 시간에 걸쳐 관찰합니다. 스캐너가 빠른 발견용이라면 이쪽은 긴 관찰용입니다.',
        prep: ['내 BLE 기기'],
        steps: ['Bluetooth에서 Sniffer를 고릅니다.', '내 기기를 가까이 두고 몇 분 관찰합니다.', '거리를 바꿔 RSSI 변화를 적습니다.'],
        read: ['RSSI는 몸, 벽, 방향에 민감합니다. 거리 측정값으로 곧바로 환산하지 않습니다.', '이상 징후 표시는 판단 보조일 뿐 증거가 아닙니다.'],
        exit: EXIT_ICON,
        trouble: ['내 기기가 안 보이면 페어링 모드를 켜고 가까이 둡니다.', '목록이 길면 RSSI가 큰 항목부터 찾습니다.'],
      },
      {
        kind: 'observe', id: 'airtag-sniffer', en: 'AirTag Sniffer', ko: '에어태그 감지', aliases: ['분실 추적기', '위치 추적'],
        path: 'Bluetooth → AirTag Sniffer', manual: null,
        purpose: '범위 안의 AirTag 신호를 찾아봅니다. 내 AirTag로 동작을 확인합니다.',
        prep: ['내 AirTag가 있으면 사용'],
        steps: ['Bluetooth에서 AirTag Sniffer를 고릅니다.', '내 태그를 가까이 두고 표시를 확인합니다.'],
        read: ['감지가 곧 나를 추적한다는 뜻은 아닙니다.'],
        exit: EXIT_ICON,
        trouble: ['내 태그가 안 보이면 태그 배터리와 거리를 확인합니다. 표시가 없다고 주변에 태그가 없다는 뜻은 아닙니다.'],
      },
      {
        kind: 'observe', id: 'skimmer-detect', en: 'Skimmer Detect', ko: '스키머 신호 감지', aliases: ['카드 복제기 감지'],
        path: 'Bluetooth → Skimmer Detect', manual: null,
        purpose: '알려진 카드 스키머 프로필과 닮은 BLE 신호를 찾는 도구로 소개되어 있습니다.',
        prep: ['특별한 준비 없음'],
        steps: ['Bluetooth 메뉴의 다음 페이지로 넘깁니다.', 'Skimmer Detect를 고르고 결과를 봅니다.'],
        read: ['일치 표시는 의심 신호일 뿐이며, 오탐이 있을 수 있습니다. 직접 조사하지 말고 시설 관리자에게 알립니다.'],
        exit: EXIT_ICON,
        trouble: ['결과가 나오지 않으면 다른 스캔과 Auto Scan을 끄고 다시 실행합니다.'],
      },
      { kind: 'lab', id: 'ble-jammer', en: 'BLE Jammer', ko: 'BLE 전파 방해', manual: 'BLE Jammer', wiki: 'Bluetooth-BLE-Jammer', principle: 'BLE 광고 채널과 연결을 방해하는 신호를 보냅니다. 설명서는 클래식 블루투스 간섭도 지원한다고 적습니다.', impact: '이어폰, 의료·보조 기기, 잠금장치의 동작을 방해할 수 있습니다.', permit: WIRELESS_PERMIT },
      { kind: 'lab', id: 'ble-spoofer', en: 'BLE Spoofer', ko: 'BLE 기기 위장', manual: 'BLE Spoofer', wiki: 'Bluetooth-BLE-Spoofer', principle: '다른 기기인 것처럼 광고 패킷을 보냅니다.', impact: '주변 사람의 화면에 가짜 기기나 알림이 뜰 수 있습니다.', permit: '내 시험 기기만 있는 격리 공간에서만 다룹니다.' },
      { kind: 'lab', id: 'sour-apple', en: 'Sour Apple', ko: '애플 근접 팝업 위장', manual: 'Sour Apple', wiki: 'Bluetooth-Sour-Apple', principle: '애플 기기의 근접 기능 광고를 흉내 냅니다.', impact: '주변 휴대폰에 반복 팝업을 띄워 사용을 방해할 수 있습니다.', permit: '내 기기만 있는 격리 공간에서만 다룹니다.' },
      { kind: 'lab', id: 'airtag-spoofer', en: 'AirTag Spoofer', ko: '에어태그 신호 위장', manual: null, principle: '가짜 AirTag 신호를 Find My 네트워크로 보낸다고 소개되어 있습니다.', impact: '다른 사람의 분실물 추적과 스토킹 경고를 혼란스럽게 합니다.', permit: '이 사이트는 실습을 권하지 않습니다. 필요하면 지도 교사와 원리만 다룹니다.' },
      { kind: 'lab', id: 'rubber-ducky', en: 'BLE Rubber Ducky', ko: 'BLE 키보드 입력 자동화', aliases: ['HID', '키 입력 주입', 'ducky'], manual: 'BLE Rubber Ducky', wiki: 'Bluetooth-BLE-Rubber-Ducky', principle: 'BLE 키보드로 페어링해 SD 카드의 스크립트대로 키를 입력합니다.', impact: '페어링된 컴퓨터에서 사용자 대신 명령이 실행됩니다.', permit: '내 시험 컴퓨터에서, 내용을 직접 읽어 이해한 스크립트만 사용합니다. 인터넷에서 받은 스크립트를 그대로 실행하지 않습니다.' },
    ],
  },
  {
    slug: '24ghz',
    title: '2.4GHz',
    en: '2.4GHz',
    summary: 'Wi-Fi 외의 신호까지 포함한 대역 전체의 에너지를 봅니다.',
    hardware: '공식 문서 기준 NRF24 모듈 3개를 씁니다. 이 기기 뒷면에는 2G4 표기 단자가 3개 있지만 내부 연결은 확인하지 못했습니다.',
    features: [
      {
        kind: 'observe', id: '24-scanner', en: 'Scanner', ko: '2.4GHz 스캐너', aliases: ['스펙트럼', 'NRF24', '지그비', 'Zigbee', '128채널'],
        path: '2.4GHz → Scanner', manual: '2.4GHz Scanner', wiki: '2-4GHz-Scanner',
        purpose: '128개 좁은 채널을 훑어 Wi-Fi와 그 밖의 2.4GHz 신호 에너지 분포를 봅니다.',
        prep: ['안테나 체결 확인'],
        steps: ['메인 메뉴에서 2.4GHz를 고릅니다.', 'Scanner를 고릅니다.', '그래프가 안정될 때까지 둡니다.', '전자레인지나 Wi-Fi 사용 전후의 모양을 비교합니다.'],
        read: ['그래프는 에너지의 분포입니다. 어떤 기기의 신호인지 알려 주지 않습니다.'],
        exit: EXIT_ICON,
        trouble: ['변화가 전혀 없으면: 공식 FAQ는 NRF24 모듈 체결을 확인하라고 합니다. 이 기기는 케이스를 열지 말고 판매처에 먼저 문의합니다.'],
      },
      { kind: 'lab', id: 'proto-kill', en: 'Proto Kill', ko: '2.4GHz 프로토콜 방해', aliases: ['Protokill', '재밍'], manual: 'Protokill', wiki: '2-4GHz-Protokill', principle: '2.4GHz 대역에 집중적으로 신호를 보내 통신을 방해합니다.', impact: 'Wi-Fi, 블루투스, 지그비 기기 전체에 영향을 줍니다.', permit: WIRELESS_PERMIT },
      { kind: 'lab', id: 'esb-sniffer', en: 'ESB Sniffer', ko: 'ESB 패킷 수신', manual: null, principle: 'NRF24 계열의 Enhanced ShockBurst 패킷을 수신합니다.', impact: '다른 사람의 무선 입력 장치 데이터가 포함될 수 있습니다.', permit: '내 장치만 있는 환경에서 다루고 기록은 바로 지웁니다.' },
      { kind: 'lab', id: 'esb-replay', en: 'ESB Replay', ko: 'ESB 패킷 재전송', manual: null, principle: '수신한 패킷을 다시 보냅니다.', impact: '다른 사람의 장치를 오동작시킬 수 있습니다.', permit: '내 시험 장치만 있는 환경에서만 다룹니다.' },
      { kind: 'lab', id: 'mousejack-scan', en: 'MouseJack Scan', ko: '취약 무선 입력 장치 찾기', manual: null, principle: '보호가 약한 무선 마우스·키보드 수신기를 찾습니다.', impact: '찾은 정보는 공격 대상 목록이 될 수 있습니다.', permit: '내가 소유한 장치만 점검합니다.' },
      { kind: 'lab', id: 'mousejack-inject', en: 'MouseJack Inject', ko: '무선 수신기 키 입력 주입', manual: null, principle: '취약한 수신기에 키 입력을 넣습니다.', impact: '다른 사람의 컴퓨터에서 명령이 실행될 수 있습니다.', permit: '내 시험 장치만 있는 격리 환경에서만 다룹니다.' },
    ],
  },
  {
    slug: 'subghz',
    title: 'Sub-GHz',
    en: 'SubGHz',
    summary: '수신과 저장 목록 관리까지만 입문 범위로 다룹니다.',
    hardware: '공식 문서 기준 CC1101 모듈을 씁니다. 이 기기에는 433M 표기 단자가 있습니다. 송신 주파수는 나라별 규정이 다릅니다.',
    note: '사용 가능한 주파수와 출력은 나라마다 다릅니다. 수신 기능부터 쓰고, 송신은 허가 조건을 먼저 확인합니다.',
    features: [
      {
        kind: 'observe', id: 'jamming-detector', en: 'Jamming Detector', ko: '전파 방해 감지', aliases: ['재밍 감지', '수신 전용'],
        path: 'SubGHz → Jamming Detector', manual: null,
        purpose: '공식 README는 이 기능을 Sub-GHz 수신 전용 방해 감지 도구로 설명합니다.',
        prep: ['433M 표기 단자의 안테나 체결 확인'],
        steps: ['메인 메뉴에서 SubGHz를 고릅니다.', 'Jamming Detector를 고릅니다.', '평소 값을 몇 분 관찰해 기준으로 적어 둡니다.'],
        read: ['경고는 의심 신호입니다. 강한 정상 신호와 구분되지 않을 수 있습니다.'],
        exit: EXIT_ICON,
        trouble: ['계속 조용하면 정상일 수 있습니다. FAQ는 주파수 대역 설정도 확인하라고 합니다.'],
      },
      {
        kind: 'observe', id: 'subghz-saved', en: 'Saved Profile', ko: '저장 프로필 관리', aliases: ['SD 저장 신호'],
        path: 'SubGHz → Saved Profile', manual: 'Saved Profiles', wiki: 'SubGHz-Saved-Profiles',
        purpose: 'SD 카드에 저장된 프로필의 주파수, 형식, 이름을 확인하고 정리합니다. 여기서는 보내기를 다루지 않습니다.',
        prep: ['FAT 형식 SD 카드'],
        steps: ['SubGHz에서 Saved Profile을 고릅니다.', '파일을 골라 정보를 읽습니다.', '필요 없는 항목을 지웁니다.'],
        read: ['주파수와 출력 규정은 나라마다 다릅니다.'],
        exit: EXIT_ICON,
        trouble: ['목록이 비면 SD 카드 삽입과 형식을 확인합니다.'],
      },
      { kind: 'lab', id: 'replay-attack', en: 'Replay Attack', ko: '신호 저장 후 재전송', manual: null, wiki: 'SubGHz-Replay-Attack', principle: '단순한 리모컨 신호를 받아 저장했다가 다시 보냅니다. 코드가 바뀌는 방식에는 그대로 통하지 않습니다.', impact: '다른 사람의 차고, 차단기, 경보기가 동작하면 안전 문제로 이어질 수 있습니다.', permit: '내 소유의 시험용 리모컨과 수신기에서만, 해당 주파수 규정을 확인한 뒤 다룹니다.' },
      { kind: 'lab', id: 'subghz-jammer', en: 'SubGHz Jammer', ko: 'Sub-GHz 전파 방해', manual: 'Sub-GHz Jammer', wiki: 'SubGHz-Jammer', principle: '특정 주파수 또는 범위에 신호를 보내 수신을 방해합니다.', impact: '경보기, 차량 키, 센서처럼 안전에 관계된 장치를 막을 수 있습니다.', permit: WIRELESS_PERMIT },
      { kind: 'lab', id: 'de-bruijn', en: 'De Bruijn / Brute', ko: '고정 코드 전수 시도', manual: null, principle: '고정 코드 리모컨에 가능한 코드를 차례로 보냅니다.', impact: '권한이 없는 사람에게 시설이 열릴 수 있습니다.', permit: '내 소유의 시험 수신기만 있는 차폐 환경에서 원리 확인용으로만 다룹니다.' },
    ],
  },
  {
    slug: 'ir',
    title: '적외선(IR)',
    en: 'IR Remote',
    summary: '내 리모컨 신호를 눈으로 보는 가장 안전한 실습입니다.',
    hardware: '공식 문서 기준 IR 송수신 회로가 쉴드에 있습니다. 이 기기의 IR 창 위치는 사진으로 확정하지 못했습니다.',
    features: [
      {
        kind: 'observe', id: 'ir-record', en: 'Record', ko: 'IR 신호 기록', aliases: ['IR Capture', '리모컨 학습', '적외선 캡처'],
        path: 'More → IR Remote → Record', manual: 'IR Capture / Replay', wiki: 'IR-Remote-Record',
        purpose: '리모컨 버튼의 시간 패턴과 반송파를 기록해 눈으로 봅니다.',
        prep: ['내 리모컨', '저장하려면 SD 카드'],
        steps: ['메인 메뉴에서 More를 고릅니다.', 'IR Remote, Record를 차례로 고릅니다.', '기기의 수신부 쪽으로 리모컨을 향해 버튼을 한 번 누릅니다.', '같은 버튼을 다시 눌러 파형이 비슷한지 봅니다.'],
        read: ['같은 버튼의 파형은 대체로 비슷해야 합니다. 많이 다르면 거리와 방향을 바꿉니다.', '반송파는 흔히 38kHz라고 문서에 적혀 있습니다.'],
        exit: EXIT_ICON,
        trouble: ['반응이 없으면 수신부 위치를 찾기 위해 방향을 바꿔 봅니다. 앞면 작은 구멍이 수신부인지는 확인되지 않았습니다.'],
      },
      {
        kind: 'observe', id: 'ir-saved', en: 'Saved Profile', ko: 'IR 저장 프로필', aliases: ['IR Saved Profiles'],
        path: 'More → IR Remote → Saved Profile', manual: 'IR Saved Profiles', wiki: 'IR-Remote-Saved-Profiles',
        purpose: '저장한 IR 신호를 살피고, 내 기기로 다시 보내 확인합니다.',
        prep: ['기록해 둔 프로필이 있는 SD 카드', '신호를 보낼 내 기기'],
        steps: ['More, IR Remote, Saved Profile을 차례로 고릅니다.', '프로필을 고릅니다.', '내 기기를 향해 한 번 보내고 반응을 봅니다.'],
        read: ['재전송이 안 되면 흔한 원인은 반송파 주파수라고 문서에 적혀 있습니다.'],
        exit: EXIT_ICON,
        trouble: ['SD 카드 파일 관리는 SD File Manager에서 합니다.'],
      },
      {
        kind: 'observe', id: 'ir-universal', en: 'Universal Controller', ko: '범용 리모컨', aliases: ['TV 리모컨', '에어컨'],
        path: 'More → IR Remote → Universal Controller', manual: null, wiki: 'IR-Remote-Universal-Controller',
        purpose: '가전 종류를 골라 내 기기를 조작해 봅니다.',
        prep: ['조작 허락을 받은 내 가전'],
        steps: ['More, IR Remote, Universal Controller를 차례로 고릅니다.', '종류와 제조사가 있으면 고릅니다.', '내 기기를 향해 버튼 하나씩 시험합니다.'],
        read: ['반응이 없으면 코드가 맞지 않는 것일 수 있습니다.'],
        exit: EXIT_ICON,
        trouble: ['반응이 없으면 거리를 줄이고 가리는 물체를 치웁니다. 반송파 설정이 보이면 바꿔 봅니다.'],
      },
    ],
  },
  {
    slug: 'nfc',
    title: 'RFID·NFC',
    en: 'RFID/NFC',
    summary: '실험용 태그를 읽는 것까지 다루고, NFC 탐구 프로젝트로 이어집니다.',
    hardware: '공식 문서 기준 PN532 모듈을 SPI로 연결합니다. 이 기기 화면에도 Reader: PN532 0x32010607이 표시되고 태그 읽기를 확인했습니다. 뒷면 NFC 인쇄 아래에 코일이 있는지는 확인하지 못했습니다.',
    note: '동봉 설명서에는 NFC 메뉴 설명이 없지만, 이 기기의 More 안에 RFID/NFC 메뉴가 있습니다. 확인한 것은 Card Reader뿐입니다.',
    features: [
      {
        kind: 'observe', device: '이 기기 확인: 태그 감지, UID, Info 화면, P4~P7 값 읽기.', id: 'card-reader', en: 'Card Reader', ko: '카드 리더', aliases: ['NFC 읽기', 'UID', '태그 읽기', 'PN532', 'NTAG'],
        path: 'More → RFID/NFC → Card Reader', manual: null, wiki: 'RFID-Card-Reader',
        purpose: '실험용 태그의 UID와 종류를 읽어 NFC가 동작하는지 확인합니다.',
        prep: ['실험용 NFC 태그(이 실험은 구매 표기 NTAG213, 25mm 스티커)', '결제 카드, 교통 카드, 학생증, 출입 카드는 쓰지 않음'],
        steps: ['메인 메뉴에서 More를 고릅니다.', 'RFID/NFC, Card Reader를 차례로 고릅니다.', '태그를 평평하게 대고 기다립니다. 공식 FAQ의 기준은 2~3cm 안, 움직이지 않는 상태입니다.', 'NFC 인쇄 주변부터 시작해 위치를 옮기며 잘 읽히는 곳을 찾아 적습니다.'],
        read: ['Mode: OK, Tag detected와 UID가 보이면 읽기 성공입니다.', 'Info에서 ATQA, SAK, 메모리 샘플을 볼 수 있습니다. 화면 문구의 뜻은 학습 2단계에 있습니다.'],
        exit: '화면의 뒤로 표시로 나옵니다. RFID 동작 중에는 SD 카드를 빼지 않습니다.',
        trouble: ['“No card detected”가 뜨면 태그를 평평하게 고정하고, 다른 스캔이 돌고 있으면 끕니다(공식 FAQ).'],
      },
      { kind: 'lab', device: '이 기기: 메뉴 표시만 확인, 실행은 미확인.', id: 'nfc-dump', en: 'Dump', ko: '메모리 읽기', manual: null, wiki: 'RFID-Dump', principle: '키를 아는 경우 태그의 메모리 블록을 읽습니다.', impact: '다른 사람의 카드에 쓰면 개인정보나 출입 정보가 드러날 수 있습니다.', permit: '직접 산 실험용 태그에만 씁니다.' },
      { kind: 'lab', device: '이 기기: 메뉴 표시만 확인, 실행은 미확인.', id: 'nfc-decode', en: 'Decode Access', ko: '접근 권한 해석', manual: null, wiki: 'RFID-Decode-Access', principle: '메모리의 접근 비트를 사람이 읽을 수 있게 풀이합니다.', impact: '출입 시스템 분석에 악용될 수 있습니다.', permit: '직접 산 실험용 태그에만 씁니다.' },
      { kind: 'lab', device: '이 기기: 메뉴 표시만 확인, 실행은 미확인.', id: 'nfc-erase', en: 'Erase', ko: '태그 지우기', manual: null, wiki: 'RFID-Erase', principle: '쓰기 가능한 태그의 내용을 지웁니다.', impact: '되돌릴 수 없습니다.', permit: '내 실험용 태그에만, 내용을 확인한 뒤 씁니다.' },
      { kind: 'lab', device: '이 기기: 메뉴 표시만 확인, 실행은 미확인.', id: 'nfc-clone', en: 'Card Clone', ko: '태그 복제', aliases: ['카드 복제'], manual: null, wiki: 'RFID-Card-Clone', principle: '지원되는 쓰기 가능 태그의 값을 다른 태그로 옮깁니다.', impact: '출입증이나 회원증의 권한을 소유자나 발급자의 동의 없이 옮기게 됩니다. 결제 카드 복제 방법은 이 사이트에서 다루지 않습니다.', permit: '직접 산 실험용 태그끼리만, 원리 확인 목적으로 다룹니다.' },
      { kind: 'lab', device: '이 기기: 메뉴 표시만 확인, 실행은 미확인.', id: 'nfc-jam', en: 'Jam Reader', ko: '리더 방해', manual: null, wiki: 'RFID-Jam-Reader', principle: 'RF 패턴으로 다른 리더의 동작을 방해합니다.', impact: '출입문이나 단말기의 정상 동작을 막을 수 있습니다.', permit: WIRELESS_PERMIT },
      { kind: 'lab', device: '이 기기: 메뉴 표시만 확인, 실행은 미확인.', id: 'nfc-disrupt', en: 'Tag Disrupt', ko: '태그 동작 방해', manual: null, wiki: 'RFID-Tag-Disrupt', principle: '공식 설명상 허가된 물리 시험용 방해 기능입니다.', impact: '주변 태그와 리더 통신을 방해할 수 있습니다.', permit: WIRELESS_PERMIT },
      { kind: 'lab', device: '이 기기: 메뉴 표시만 확인, 실행은 미확인.', id: 'nfc-emulate', en: 'Disrupt Emulate', ko: '방해와 에뮬레이션', manual: null, wiki: 'RFID-Disrupt-Emulate', principle: '방해와 태그 흉내 동작을 묶은 기능입니다.', impact: '리더가 잘못된 태그를 인식할 수 있습니다.', permit: WIRELESS_PERMIT },
    ],
  },
  {
    slug: 'gps',
    title: 'GPS',
    en: 'GPS',
    summary: '하늘이 보이는 곳에서 위성 수를 비교합니다.',
    hardware: '공식 문서 기준 Neo-6M 호환 모듈을 UART로 연결합니다. 이 기기 뒷면에 GPS 표기 단자가 있지만 모듈 종류는 확인하지 못했습니다.',
    note: '동봉 설명서에는 GPS 메뉴 설명이 없지만, 이 기기의 More 안에 GPS 메뉴가 있습니다. 실행은 확인하지 못했습니다.',
    features: [
      {
        kind: 'observe', id: 'satellite-scanner', en: 'Satellite Scanner', ko: '위성 스캐너', aliases: ['위성 수', 'GNSS', '위치 고정', 'fix', 'SNR'],
        path: 'More → GPS → Satellite Scanner', manual: null, wiki: 'GPS-Satellite-Scanner',
        purpose: '보이는 위성 수, 신호 세기, 위치 고정 상태를 봅니다.',
        prep: ['GPS 표기 단자의 안테나 체결 확인', '하늘이 트인 곳'],
        steps: ['메인 메뉴에서 More를 고릅니다.', 'GPS, Satellite Scanner를 차례로 고릅니다.', '야외에서 몇 분 기다립니다.', '휴대폰 GNSS 앱의 위성 수와 비교합니다.'],
        read: ['처음 위치를 잡는 데는 시간이 걸릴 수 있습니다. 실내에서 위성이 안 잡히는 것은 흔한 일입니다.'],
        exit: EXIT_ICON,
        trouble: ['야외에서도 위성이 0이면 안테나 체결을 확인합니다. 그래도 안 되면 모듈 탑재 여부를 판매처에 묻습니다.'],
      },
      { kind: 'lab', id: 'wardriver', en: 'Wardriver', ko: '위치와 네트워크 기록', aliases: ['워드라이빙'], manual: null, wiki: 'GPS-Wardriver', principle: '이동하면서 위치와 Wi-Fi·BLE 관찰 결과를 함께 SD 카드에 기록합니다.', impact: '다른 사람의 네트워크와 생활 동선이 지도처럼 쌓일 수 있고, 공개하면 그 정보가 드러납니다.', permit: '허가받은 구역에서 내 네트워크 커버리지를 확인할 때만 쓰고, 기록은 외부에 공유하지 않습니다.' },
    ],
  },
  {
    slug: 'system',
    title: '시스템·설정',
    en: 'Tools, Settings, About',
    summary: '화면, SD 카드, 설정을 정리합니다.',
    hardware: '공식 문서 기준 터치 컨트롤러 XPT2046, 버튼 확장 칩 PCF8574, SD 슬롯을 씁니다.',
    features: [
      {
        kind: 'observe', id: 'settings', en: 'Settings', ko: '설정', aliases: ['밝기', '테마', 'NeoPixel', 'Auto Scan', '자동 스캔', 'settings.json'],
        path: 'Settings', manual: 'Brightness & Display, NeoPixel Control, Background Scanning, Preferences Storage', wiki: 'Settings',
        purpose: '밝기, 화면 테마, NeoPixel, 자동 스캔을 바꿉니다.',
        prep: ['저장하려면 SD 카드'],
        steps: ['메인 메뉴에서 Settings를 고릅니다.', '값을 바꿉니다.', 'Save를 눌러 저장합니다.'],
        read: ['설정은 SD 카드의 /config/settings.json에 저장됩니다.', 'Auto Scan은 Wi-Fi와 BLE 자동 스캔을 함께 켭니다.'],
        exit: 'Back을 누릅니다. 바꾼 값을 확실히 남기려면 먼저 Save를 누릅니다.',
        trouble: ['다시 켰을 때 설정이 사라지면 SD 카드 삽입과 형식을 확인합니다.'],
      },
      {
        kind: 'observe', id: 'touch-calibrate', en: 'Touch Calibrate', ko: '터치 보정', aliases: ['Touch Calibration', '터치가 안 됨', '화면 터치'],
        path: 'Tools → Touch Calibrate', manual: 'Touch Calibration', wiki: 'Tools-Touch-Calibrate',
        purpose: '터치 위치가 어긋날 때 네 지점을 눌러 보정합니다.',
        prep: ['화면 보호 필름 상태 확인'],
        steps: ['Tools에서 Touch Calibrate를 고릅니다.', '표시된 지점을 정확히 누릅니다.', '끝나면 Settings에서 Save를 눌러 둡니다.'],
        read: ['보정 뒤 메뉴가 누른 위치대로 반응하면 성공입니다.'],
        exit: '보정을 끝내면 메뉴로 돌아옵니다.',
        trouble: ['글자가 엉뚱하게 입력되면 보정을 다시 합니다(공식 FAQ).'],
      },
      {
        kind: 'observe', id: 'sd-file-manager', en: 'SD File Manager', ko: 'SD 파일 관리자', aliases: ['SD 카드', '파일 보기'],
        path: 'Tools → SD File Manager', manual: null, wiki: 'Tools-SD-File-Manager',
        purpose: 'SD 카드의 파일을 기기에서 살펴보고 정리합니다.',
        prep: ['FAT 형식 SD 카드'],
        steps: ['Tools에서 SD File Manager를 고릅니다.', '폴더를 열어 파일을 확인합니다.'],
        read: ['/config/settings.json을 지우면 설정이 초기화됩니다.', '저장 신호는 /captures, 스크립트는 /ducky에 있는 경우가 많습니다.'],
        exit: EXIT_ICON,
        trouble: ['카드가 안 보이면 전원을 끈 뒤 다시 넣습니다.'],
      },
      {
        kind: 'observe', id: 'serial-monitor', en: 'Serial Monitor', ko: '시리얼 모니터', aliases: ['115200', '로그'],
        path: 'Tools → Serial Monitor', manual: 'Serial Monitor', wiki: 'Tools-Serial-Monitor',
        purpose: '시리얼 로그를 화면에서 봅니다. 문제가 생겼을 때 기록을 남기는 데 씁니다.',
        prep: ['없음'],
        steps: ['Tools에서 Serial Monitor를 고릅니다.', '짧은 로그를 읽습니다.'],
        read: ['긴 로그는 화면 밖으로 밀려납니다. 컴퓨터에서 볼 때 공식 문서 기준 속도는 115200입니다.'],
        exit: EXIT_ICON,
        trouble: ['글자가 깨지면 속도 설정을 확인합니다.'],
      },
      {
        kind: 'observe', id: 'update-firmware', en: 'Update Firmware', ko: '펌웨어 업데이트', aliases: ['Firmware Update', 'SD Update', 'firmware.bin', 'update.bin'],
        path: 'Tools → Update Firmware', manual: 'Firmware Update', wiki: 'Tools-Update-Firmware',
        purpose: '이 메뉴의 존재만 확인합니다. 실행 전에 업데이트 페이지의 버전 차이를 꼭 읽습니다.',
        prep: ['업데이트 페이지 읽기', '현재 버전 기록', '안정적인 전원'],
        steps: ['Tools에서 Update Firmware가 보이는지 확인합니다.', '화면에 적힌 파일 이름을 그대로 적어 둡니다.', '실행은 업데이트 페이지를 읽은 뒤 결정합니다.'],
        read: ['설명서와 공식 문서의 파일 이름이 다릅니다. 화면 표시가 가장 직접적인 근거입니다.'],
        exit: '업데이트를 시작하지 않고 Back으로 나옵니다.',
        trouble: ['잘못된 이미지나 전원 차단은 기기를 못 쓰게 만들 수 있습니다(공식 위키).'],
      },
      {
        kind: 'observe', device: '이 기기 확인: 아래 값까지 화면으로 확인.', id: 'about', en: 'About', ko: '기기 정보', aliases: ['버전 확인', '펌웨어 버전', 'MK SIGNAL'],
        path: 'About', manual: null,
        purpose: '기기 이름, 펌웨어, 보드, 빌드 이름을 확인합니다.',
        prep: ['없음'],
        steps: ['메인 메뉴에서 About을 고릅니다.', '보이는 값을 적거나 사진으로 남깁니다.'],
        read: ['이 기기의 표시: MK SIGNAL DIV V2.1, 1.7.2 stable by MK_SIGNAL_V1, Board: ESP32 DIV V2.1 by MK, Build: V1.2 Stable by MK SIGNAL, Credits: CiferTech ESP32 DIV Project.', '하드웨어 판, 판매자 빌드 이름, 펌웨어 번호는 서로 다른 값입니다.'],
        exit: '화면의 SELECT / tap to go back 안내대로 돌아옵니다.',
        trouble: ['값이 이 표시와 다르면 다른 판매 판이나 펌웨어일 수 있으니 내 값을 기준으로 적습니다.'],
      },
      {
        kind: 'observe', device: '이 기기: 메뉴 표시만 확인, 게임 내용은 미확인.', id: 'games', en: 'Games', ko: '게임', aliases: ['More 게임', '판매자 메뉴'],
        path: 'More → Games', manual: null,
        purpose: '이 기기의 More에 있는 메뉴입니다. 공식 위키의 More 목록에는 없습니다.',
        prep: ['없음'],
        steps: ['메인 메뉴에서 More를 고릅니다.', 'Games가 보이는지 확인합니다.'],
        read: ['공식 펌웨어와 이 기기의 펌웨어가 완전히 같지 않을 수 있다는 단서입니다.'],
        exit: 'More의 Main Menu로 돌아갑니다.',
        trouble: ['게임 종류와 조작은 확인하지 못했습니다.'],
      },
    ],
  },
];

export const wikiUrl = (slug?: string): string | null => (slug ? `${WIKI}/${slug}` : null);

export interface SearchItem {
  title: string;
  sub: string;
  href: string;
  terms: string;
}

const TOPICS: SearchItem[] = [
  { title: '0단계: 왜 이렇게 많은 무선 기술이 있을까', sub: '학습', href: '/learn/why/', terms: '0단계 왜 생겼나 역사 파장 주파수 변조 OOK FSK 433MHz 2.4GHz 안테나 c=fλ 프로토콜 GPS' },
  { title: '실험과 개발 기술노트', sub: '학습', href: '/learn/projects/', terms: '프로젝트 실험 주제 개발 기술노트 방별 RSSI 채널 혼잡 롤링 코드 첫 위치 CSV 분석' },
  { title: '정보보호학 관점에서 이해하기', sub: '학습 5단계', href: '/learn/security/', terms: '정보보호 보안 위협 모델 CIA 기밀성 무결성 가용성 WPA3 PMF TLS Just Works 챌린지 응답 nonce 해시 MAC 서명 진로 진학 NIST CSF 면접' },
  { title: '학습 홈', sub: '학습', href: '/learn/', terms: '학습 시작 목표 동선 learn 교재 준비물' },
  { title: '메뉴부터 태그 읽기까지 따라 하기', sub: '학습', href: '/learn/device/', terms: '화면 따라 하기 메인 메뉴 About More Card Reader Waiting for tag Mode OK SCAN Info Cancel Exit Back Prev Next' },
  { title: 'About의 버전 세 가지', sub: '학습', href: '/learn/device/#about', terms: 'About 버전 1.7.2 MK SIGNAL V1.2 V2.1 Games' },
  { title: 'NFC 통신 단계', sub: '학습', href: '/learn/nfc/#flow', terms: 'NFC 원리 유도 결합 부하 변조 REQA ATQA SAK READ 자기장 13.56MHz' },
  { title: 'UID와 메모리 읽기 실습', sub: '학습', href: '/learn/nfc/#bytes', terms: 'UID 바이트 16진수 2진수 메모리 P4 P7 페이지 TLV NDEF 144바이트 48바이트 pages 4-15' },
  { title: 'Wi-Fi 탐색과 웹 요청', sub: '학습', href: '/learn/network/', terms: 'Wi-Fi 탐색 수동 능동 Beacon Probe RSSI dBm 패킷 프레임 DHCP DNS TCP TLS HTTPS BLE 광고 ARP NAT' },
  { title: '한글 용어 사전', sub: '학습', href: '/learn/glossary/', terms: '용어 사전 glossary 뜻 설명' },
  { title: '실험 절차와 성공 기준', sub: 'NFC 실험', href: '/lab/nfc/#procedure', terms: '실험 절차 성공 기준 예비 실험 거리 측정 재인식 Exit Card Reader 5초' },
  { title: '구성품 확인', sub: '1단계 기기 준비', href: '/start/#parts', terms: '구성품 박스 parts' },
  { title: '안테나 연결', sub: '1단계 기기 준비', href: '/start/#antenna', terms: '안테나 antenna 433M 2G4 SMA 단자' },
  { title: '전원과 충전', sub: '1단계 기기 준비', href: '/start/#power', terms: '전원 충전 배터리 power battery USB-C IP5306 스위치 ON OFF' },
  { title: '버튼과 터치 조작', sub: '1단계 기기 준비', href: '/start/#controls', terms: '버튼 조작 터치 touch controls select 방향키' },
  { title: 'SD 카드 준비', sub: '1단계 기기 준비', href: '/start/#sd', terms: 'SD 카드 FAT32 32GB 포맷 format' },
  { title: '첫 스캔', sub: '1단계 기기 준비', href: '/start/#first-scan', terms: '첫 스캔 first scan' },
  { title: '부품과 미확인 항목', sub: '기기 알아보기', href: '/device/', terms: '부품 하드웨어 hardware ESP32-S3 ILI9341 CP2102 IP5306 PCF8574 MK SIGNAL USB-C 포트' },
  { title: 'update.bin과 firmware.bin 차이', sub: '업데이트·문제 해결', href: '/update/#versions', terms: 'update.bin firmware.bin 파일 이름 버전 version v1.7.2 1.7.0' },
  { title: '플래시 주소 차이', sub: '업데이트·문제 해결', href: '/update/#versions', terms: '플래시 주소 flash address 0x8000 0x10000 0x80000 0x100000' },
  { title: 'BOOT와 RESET, 연결 실패', sub: '업데이트·문제 해결', href: '/update/#trouble', terms: 'BOOT RESET Failed to connect esptool 연결 실패 CP2102 드라이버' },
  { title: '문제 해결 목록', sub: '업데이트·문제 해결', href: '/update/#trouble', terms: '문제 해결 troubleshooting FAQ 고장 안 됨' },
  { title: 'NFC는 지갑·가방 안에서도 인식될까?', sub: '학습 6단계', href: '/lab/nfc/', terms: 'NFC 실험 프로젝트 지갑 가방 탐구 태그 wallet bag' },
  { title: '실험 기록과 CSV', sub: 'NFC 실험', href: '/lab/nfc/#data', terms: 'CSV 백업 가져오기 내보내기 기록 export import' },
  { title: '파이썬 분석과 노트북', sub: 'NFC 실험', href: '/lab/nfc/#python', terms: '파이썬 python pandas matplotlib notebook ipynb 노트북' },
  { title: '일반 태그와 EMV 결제 보안', sub: 'NFC 실험', href: '/lab/nfc/#security', terms: 'EMV 신용카드 결제 보안 credit card payment 복제 security' },
  { title: '보고서 만들기', sub: 'NFC 실험', href: '/lab/nfc/#report', terms: '보고서 report Markdown 인쇄 print' },
  { title: '자소서·면접 질문', sub: 'NFC 실험', href: '/lab/nfc/#interview', terms: '자소서 면접 interview 생기부' },
];

export function buildSearchIndex(): SearchItem[] {
  const features = GROUPS.flatMap((g) =>
    g.features.map((f) => ({
      title: `${f.ko} (${f.en})`,
      sub: `${g.title}, ${f.kind === 'lab' ? '실험실 고급 기능' : '관찰·기본 기능'}`,
      href: `/guide/${g.slug}/#${f.id}`,
      terms: [f.ko, f.en, g.title, g.en, f.manual ?? '', ...(f.aliases ?? [])].join(' '),
    })),
  );
  const terms = GLOSSARY.map((t) => ({ title: `${t.ko} (${t.en})`, sub: '용어 사전', href: `/learn/glossary/#${t.id}`, terms: [t.ko, t.en, ...t.aliases].join(' ') }));
  return [...features, ...TOPICS, ...terms];
}
