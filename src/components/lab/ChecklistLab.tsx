import { useRef, useState } from 'react';

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
