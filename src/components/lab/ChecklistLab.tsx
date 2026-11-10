import { useRef, useState } from 'react';
import type { ChecklistKind } from '../../lib/checklist';

export function FileDigest({ onHash }: { onHash: (hash: string, name: string) => void }) {
  const [message, setMessage] = useState('');
  const request = useRef(0);
  return <div className="callout"><h3>선택: 내 PC 파일의 SHA-256 계산</h3><p>32MB 이하 파일을 이 브라우저에서 읽습니다. 서버로 업로드하거나 기기에 설치하지 않습니다. 계산 결과는 아래 파일명·내 파일 해시 칸에 들어갑니다. 출처와 버전은 직접 확인해야 합니다.</p><label htmlFor="firmware-hash-file">해시를 계산할 파일 선택</label><input id="firmware-hash-file" type="file" onChange={async e=>{
    const token=++request.current, file=e.target.files?.[0]; if(!file)return;
    setMessage('파일 해시 계산 중');
    try {
      if(file.size>32*1024*1024) throw new Error('32MB 이하 파일을 선택하세요.');
      if(!globalThis.crypto?.subtle) throw new Error('이 환경은 Web Crypto를 지원하지 않습니다. PC의 해시 도구 결과를 수동 입력하거나 미계산으로 남기세요.');
      const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
      if(token!==request.current)return;
      const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
      onHash(hash,file.name);setMessage(`계산 완료: ${hash}. 공식 해시와 출처를 별도로 대조하세요.`);
    } catch(error) { if(token===request.current)setMessage((error as Error).message); }
    e.target.value='';
  }} /><p role="status" style={{overflowWrap:'anywhere'}}>{message}</p></div>;
}

export function ChecklistSummary({ kind, rows }: { kind: ChecklistKind; rows: Record<string,string>[] }) {
  const observed=rows.filter(r=>r.observation_status==='observed');
  if(kind==='ssid-map')return <><p>내 AP 별칭 {new Set(observed.map(r=>r.alias)).size}개 · 같은 SSID에서 다른 BSSID 확인 {observed.filter(r=>r.different_bssid==='yes').length}건 · 자동 연결 켜짐 {observed.filter(r=>r.auto_connect==='enabled').length}건 · 자동 연결 미확인 {observed.filter(r=>r.auto_connect==='unchecked').length}건.</p><p>동일 SSID의 주소 차이는 여러 AP·대역·메시 구성에서도 생깁니다. SSID·BSSID 하나만으로 진위를 판정하지 않습니다. 내 관리자 목록·물리 장비·연결 설정을 대조한 근거와 확인 한계를 보고서에 적습니다.</p></>;
  if(kind==='wpa-pmf')return <><p>WPA2 지원 확인 {observed.filter(r=>r.wpa2_support==='yes').length}건 · WPA3 지원 확인 {observed.filter(r=>r.wpa3_support==='yes').length}건 · PMF 필수 {observed.filter(r=>r.pmf==='required').length}건 · PMF 가능/선택 {observed.filter(r=>r.pmf==='capable').length}건 · PMF 사용 안 함 {observed.filter(r=>r.pmf==='disabled').length}건 · PMF 미확인 {observed.filter(r=>r.pmf==='unchecked').length}건.</p><p>지원 여부와 현재 설정은 별개입니다. 비밀번호·인증 방식은 접속 권한을, PMF는 적용 대상 관리 프레임의 보호를 다룹니다. PMF만으로 모든 끊김이나 공격을 막는다고 결론 내리지 않습니다. 암호 길이·내용을 수집하지 않고 역할과 확인 근거만 설명합니다.</p></>;
  const comparable=observed.filter(r=>r.expected_sha256 && r.actual_sha256), matches=comparable.filter(r=>r.expected_sha256.toLowerCase()===r.actual_sha256.toLowerCase()).length;
  return <><p>해시 대조 가능 {comparable.length}건 · 일치 {matches}건 · 불일치 {comparable.length-matches}건 · 해시 대조 불가 {observed.length-comparable.length}건. 서명 유효 확인 기록 {observed.filter(r=>r.signature==='valid').length}건 · 서명 미검증 {observed.filter(r=>r.signature==='unchecked').length}건 · 복구 준비 확인 {observed.filter(r=>r.recovery==='ready').length}건.</p><p>해시 일치는 두 값의 일치이며 작성자 인증이 아닙니다. 변조된 파일과 같은 곳에서 받은 해시도 함께 바뀔 수 있습니다. 이 웹 도구는 서명을 자동 검증하지 않습니다. 신뢰한 배포 경로·서명 키·검증 도구의 근거를 구분하고, 불일치·출처 불명·복구 미준비면 설치하지 않는 판단을 보고서에 남깁니다.</p></>;
}
