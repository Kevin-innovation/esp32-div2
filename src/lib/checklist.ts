export type ChecklistKind = 'ssid-map' | 'wpa-pmf' | 'firmware';
export const isChecklist = (kind: string): kind is ChecklistKind => ['ssid-map','wpa-pmf','firmware'].includes(kind);
export const CHECKLIST_FIELDS = {
  'ssid-map': ['alias','condition','observation_status','ssid_alias','bssid_alias','different_bssid','auto_connect','evidence','note'],
  'wpa-pmf': ['alias','condition','observation_status','wpa2_support','wpa3_support','configured','pmf','evidence','note'],
  firmware: ['alias','condition','observation_status','source_url','file_name','version','expected_sha256','actual_sha256','signature','signature_evidence','recovery','recovery_plan','evidence','note'],
};
export const CHECKLIST_TITLES = { 'ssid-map': 'SSID·BSSID와 자동 연결 확인', 'wpa-pmf': 'WPA·PMF의 보호 역할 비교', firmware: '펌웨어 출처·해시·복구 준비 확인' };
export const CHECKLIST_LABELS: Record<string,string> = { ssid_alias:'SSID 별칭(원래 이름 금지)', bssid_alias:'BSSID 별칭(원래 주소 금지)', different_bssid:'같은 SSID 별칭에서 다른 BSSID 별칭을 확인했나요?', auto_connect:'내 기기의 해당 네트워크 자동 연결 설정', evidence:'직접 확인한 근거·출처 또는 확인 못 한 이유', wpa2_support:'WPA2 지원 여부', wpa3_support:'WPA3 지원 여부', configured:'현재 설정(변경하지 않고 읽기)', pmf:'관리 프레임 보호(PMF) 표시', source_url:'공식 출처로 확인한 HTTPS 주소', file_name:'검토 파일명', version:'표시 버전', expected_sha256:'공식 출처가 제공한 SHA-256(없으면 빈 값)', actual_sha256:'내 파일의 SHA-256(계산 안 했으면 빈 값)', signature:'서명 검증 상태(해시 대조와 별개)', signature_evidence:'서명·검증 근거 또는 미검증 이유', recovery:'복구 준비 상태', recovery_plan:'백업·복구 계획과 확인 근거' };
const YESNO = { yes:'지원/관찰 확인', no:'지원 안 함/관찰 안 됨 확인', unchecked:'확인 안 함' };
export const CHECKLIST_OPTIONS: Record<string,Record<string,string>> = {
  different_bssid: { yes:'다른 주소 별칭 확인', no:'같은 주소 별칭만 확인', unchecked:'비교하지 못함' },
  auto_connect: { enabled:'켜짐 확인', disabled:'꺼짐 확인', unchecked:'확인 안 함' },
  wpa2_support:YESNO, wpa3_support:YESNO,
  configured:{ wpa2:'WPA2', wpa3:'WPA3', mixed:'WPA2/WPA3 혼합', other:'다른 설정(근거에 설명)', unchecked:'확인 안 함' },
  pmf:{ required:'필수로 표시', capable:'가능/선택으로 표시', disabled:'사용 안 함으로 표시', unchecked:'확인 안 함/표시 의미 미확인' },
  signature:{ valid:'검증 도구로 서명 유효 확인', invalid:'검증 도구로 서명 불일치 확인', absent:'배포 자료에서 서명 제공을 찾지 못함', unchecked:'서명 검증 안 함' },
  recovery:{ ready:'백업·복구 경로 확인', 'not-ready':'아직 준비 안 됨', unchecked:'확인 안 함' },
};
export const fieldMaxLength = (key: string) => ['source_url','evidence','signature_evidence','recovery_plan'].includes(key) ? 1000 : key === 'note' ? 500 : 80;
export function checklistDraft(kind: ChecklistKind): Record<string,string> {
  return { ...Object.fromEntries(CHECKLIST_FIELDS[kind].map(k=>[k,CHECKLIST_OPTIONS[k] ? 'unchecked' : ''])), alias:kind==='firmware'?'File-A':'AP-A', observation_status:'observed' };
}
export function validateChecklist(kind: ChecklistKind, row: Record<string,string>): string | null {
  for (const key of CHECKLIST_FIELDS[kind]) if (CHECKLIST_OPTIONS[key] && !Object.hasOwn(CHECKLIST_OPTIONS[key],row[key])) return '설정·확인 상태를 선택 항목에서 골라 주세요.';
  if (!row.evidence.trim()) return '확인 근거 또는 확인하지 못한 이유를 적어 주세요.';
  if (kind==='ssid-map') {
    for(const key of ['ssid_alias','bssid_alias']) if(row[key] && !/^[A-Za-z][A-Za-z0-9_-]{0,19}$/.test(row[key])) return '네트워크 식별자는 SSID-A·BSSID-A 같은 영문 별칭으로만 적습니다.';
    if(row.observation_status==='observed' && (!row.ssid_alias || !row.bssid_alias)) return '관찰한 내 AP의 SSID·BSSID 별칭을 모두 적습니다.';
    if(row.observation_status!=='observed' && (row.ssid_alias || row.bssid_alias || row.different_bssid!=='unchecked' || row.auto_connect!=='unchecked')) return '미관찰·미측정은 별칭을 비우고 비교·설정 상태를 확인 안 함으로 둡니다.';
  } else if(kind==='wpa-pmf') {
    if(row.observation_status!=='observed' && ['wpa2_support','wpa3_support','configured','pmf'].some(k=>row[k]!=='unchecked')) return '미관찰·미측정은 지원·설정을 확인 안 함으로 둡니다.';
    if((row.configured==='wpa3'||row.configured==='mixed') && row.wpa3_support==='no') return 'WPA3 미지원과 현재 WPA3 설정은 함께 확정할 수 없습니다. 근거를 다시 확인하세요.';
    if((row.configured==='wpa2'||row.configured==='mixed') && row.wpa2_support==='no') return 'WPA2 미지원과 현재 WPA2 설정은 함께 확정할 수 없습니다.';
  } else {
    if(row.source_url) { try { const u=new URL(row.source_url); if(u.protocol!=='https:' || u.username || u.password) return '출처는 계정 정보 없는 HTTPS 주소로 적습니다.'; } catch { return '출처 URL 형식을 확인하세요.'; } }
    if(row.observation_status==='observed' && (!row.source_url || !row.file_name.trim() || !row.version.trim())) return '관찰한 출처 주소·파일명·버전을 적습니다. 버전을 찾지 못했으면 미표시라고 적습니다.';
    for(const key of ['expected_sha256','actual_sha256']) if(row[key] && !/^[a-fA-F0-9]{64}$/.test(row[key])) return 'SHA-256은 64자리 16진수 또는 빈 값이어야 합니다.';
    if(['valid','invalid'].includes(row.signature) && !row.signature_evidence.trim()) return '서명을 확인한 도구·신뢰한 키 출처·검증 결과를 근거에 남깁니다. 해시 일치는 서명 검증이 아닙니다.';
    if(row.recovery==='ready' && !row.recovery_plan.trim()) return '복구 준비를 확인한 백업·문서 경로와 근거를 적습니다.';
    if(row.observation_status!=='observed' && (row.source_url || row.file_name || row.version || row.expected_sha256 || row.actual_sha256 || row.signature!=='unchecked' || row.recovery!=='unchecked')) return '미관찰·미측정은 파일·출처·해시를 비우고 검증·복구를 확인 안 함으로 둡니다.';
  }
  return null;
}
export function checklistDemo(kind: ChecklistKind, index: number): Record<string,string> {
  const draft=checklistDraft(kind);
  if(index>0) return { ...draft, condition:'가상 문서 사례', observation_status:index===1?'not-observed':'unchecked', evidence:'가상 예시: 확인할 자료를 얻지 못함', note:'실제 결과 아님' };
  return { ...draft, condition:'가상 문서 사례', evidence:'가상 예시이며 실제 기기 설정·배포 파일 아님', ...(kind==='ssid-map'? { ssid_alias:'SSID-A',bssid_alias:'BSSID-A',different_bssid:'yes',auto_connect:'enabled' }:kind==='wpa-pmf'?{ wpa2_support:'yes',wpa3_support:'yes',configured:'mixed',pmf:'capable' }:{ source_url:'https://example.org/firmware',file_name:'demo.bin',version:'가상 1.0',expected_sha256:'a'.repeat(64),actual_sha256:'a'.repeat(64),signature:'unchecked',recovery:'not-ready',recovery_plan:'백업 준비 전' }), note:'실제 결과 아님' };
}
