// 수업 입구의 정적 정보. 웹 구현, 실기기 실행, 교실 파일럿은 서로 다른 상태다.
export const CLASSROOM_STATUS = '교실 파일럿 미검증';
export const READINESS = {
  nfc: { web: '사용 가능', device: 'UID·P4~P7 읽기 확인', basis: '사용자 관찰 화면·NFC 워크북', pilot: CLASSROOM_STATUS },
  wifi: { web: '수동 기록 사용 가능', device: 'Wi-Fi 실행 미검증', basis: '수동 입력·CSV·분석 웹 검사', pilot: CLASSROOM_STATUS },
  planned: { web: '워크북 개발 예정', device: '실행 미검증', basis: '메뉴 표시·배경 기술노트', pilot: CLASSROOM_STATUS },
};
export const BASIC_CLASSES = [
  { id: 'A', title: '배경·준비·첫 태그', steps: [0, 1, 2], output: '준비표·메뉴 경로·첫 읽기 또는 실패 관찰' },
  { id: 'B', title: '원리·위협·설계', steps: [3, 4, 5], output: '통신 단계 설명·위협 모델·탐구 가설' },
  { id: 'C', title: 'NFC 관찰과 기록', steps: [6], output: '반복 원자료·실패 메모·관찰/서술 CSV' },
  { id: 'D', title: '분석과 방어', steps: [6], output: '표·그래프·근거와 추정·방어 제안' },
  { id: 'E', title: '보고서와 자기 설명', steps: [6], output: '보고서 초안·출처·1분 설명' },
];
// /lab/의 기존 이미지 순서와 대응한다. 실제 활동 경로는 기존 카드의 href만 사용한다.
export const MISSION_DETAILS = [
  { id: 'wifi-rssi', time: '선택 W · 1~2차시(50~100분 제안)', prep: '내 공유기, RSSI를 볼 수 있는 휴대폰·PC, 거리 기록 도구', prerequisite: '/learn/network/', prerequisiteLabel: '4단계 네트워크·5단계 보안 이후 권장', alternative: '기기에서 RSSI를 못 읽으면 사용 허락을 받은 휴대폰·PC의 수동 값으로 기록합니다. 도구가 없으면 데모를 선택해 분석하고 실제 결과와 구분합니다.' },
  { id: 'ssid-map', time: '선택 심화 · 1차시(50분 제안)', prep: '내 공유기·관리자 화면·내 휴대폰', prerequisite: '/lab/wifi-rssi/', prerequisiteLabel: '선택 W Wi-Fi RSSI 이후 권장', alternative: '관리 권한이 없으면 익명 AP 사례를 기술노트와 비교하는 문서 활동으로 준비합니다.' },
  { id: 'wpa-pmf', time: '선택 심화 · 1차시(50분 제안)', prep: '설정을 지원하는 내 공유기·관리자 화면·휴대폰', prerequisite: '/learn/security/#wifi', prerequisiteLabel: '5단계 Wi-Fi 보안', alternative: '설정에 접근할 수 없으면 문서의 설정 사례를 비교하고 실제 설정 확인과 구분합니다.' },
  { id: 'channel', time: '선택 심화 · 1~2차시(50~100분 제안)', prep: '내 공유기, 관찰 PC·휴대폰, 이용 가능한 백업 연결', prerequisite: '/lab/wifi-rssi/', prerequisiteLabel: '선택 W Wi-Fi RSSI 이후 권장', alternative: '수치를 읽지 못하면 시간대별 사례와 백업 경로를 기술노트에서 비교합니다.' },
  { id: 'ble-ad', time: '우선 심화 · 1~2차시(50~100분 제안)', prep: '내 BLE 이어폰·밴드, 내 휴대폰, 거리 기록 도구', prerequisite: '/learn/network/', prerequisiteLabel: '4단계 네트워크·5단계 보안', alternative: '기기 메뉴 실행이 막히면 사용 허락을 받은 휴대폰 도구를 확인하거나 배경 기술노트의 광고/연결 설명을 비교합니다. 실제 관찰과 문서 활동을 구분합니다.' },
  { id: 'ble-pair', time: '선택 심화 · 1차시(50분 제안)', prep: '내 BLE 기기·휴대폰·앱 권한 화면', prerequisite: '/learn/security/#ble', prerequisiteLabel: '5단계 BLE 보안·광고와 연결의 차이', alternative: '연결 기능을 확인하지 못하면 내 휴대폰이나 익명 페어링 사례의 방식·권한을 비교합니다.' },
  { id: 'interference', time: '우선 심화 · 1~2차시(50~100분 제안)', prep: '내 공유기·정상 작동 생활 기기·관찰 기록 도구', prerequisite: '/lab/wifi-rssi/', prerequisiteLabel: '선택 W와 2.4GHz 배경 노트', alternative: '화면에 단위·값이 없으면 임의 수치를 만들지 않고 문서 사례의 증거와 원인 후보를 비교합니다.' },
  { id: 'ir', time: '우선 심화 · 1~2차시(50~100분 제안)', prep: '내 리모컨·가전·거리와 방향 기록 도구', prerequisite: '/learn/security/#remote', prerequisiteLabel: '기본 NFC 이후 리모컨 보안 노트', alternative: '수신이 안 되면 기록 사례와 문서를 비교합니다. 실제 재전송 성공을 만들어 적지 않습니다.' },
  { id: 'subghz', time: '선택 심화 · 1~2차시(50~100분 제안)', prep: '별도의 내 433MHz 실험 송수신기·설명서', prerequisite: '/learn/security/#remote', prerequisiteLabel: '고정 명령과 리모컨 보안 노트', alternative: '별도 장비가 없으면 고정/롤링 코드 문서 비교로 준비합니다. 실제 출입·차량 장비를 대체품으로 쓰지 않습니다.' },
  { id: 'gps', time: '우선 심화 · 1~2차시(50~100분 제안)', prep: '내 위치 기기·휴대폰·지도·시계, 허가된 관찰 장소', prerequisite: '/learn/security/#gps', prerequisiteLabel: '기본 NFC 이후 위치 신뢰 노트', alternative: '수업의 대기 상한 안에 수신하지 못하면 미수신으로 남기고 다른 내 도구나 위치 사례를 교차 확인합니다.' },
  { id: 'firmware', time: '선택 심화 · 1차시(50분 제안)', prep: 'PC·공식 배포 파일·출처와 검증 정보', prerequisite: '/update/', prerequisiteLabel: '업데이트 주의·5단계 기기 보안', alternative: '신뢰할 검증 정보가 없으면 미확인으로 남기고 준비된 파일 사례를 비교합니다. 실제 플래싱은 필수가 아닙니다.' },
  { id: 'csv', time: '우선 심화 · 1차시(50분 제안)', prep: 'PC와 직접 준비한 익명 예시 CSV 또는 내 백업', prerequisite: '/lab/nfc/#data', prerequisiteLabel: 'NFC 또는 Wi-Fi의 CSV 백업 경험', alternative: '민감한 실제 파일 없이 웹 워크북의 가상 샘플로 가명 처리·원본 분리 보관을 연습할 수 있습니다. 자바스크립트를 쓸 수 없으면 공책에서 원본 표와 가명 표를 나눠 비교합니다.' },
];
