// 워크북 한 권의 본문. 장 순서는 LabGuide.astro가 정하고, 내용은 주제마다 따로 쓴다.
export interface Ref { title: string; url: string; note?: string }
export interface NoteText { label: string; help: string; example: string; why: string }
export interface Project {
  title: string;
  /** 현업에서 이 일이 어떻게 쓰이는지 */
  practice: string;
  input: string; process: string; output: string;
  parts: string[];
  mvp: string[];
  check: string[];
  limits: string[];
}
export interface Guide {
  id: string;
  title: string;
  lead: string;
  mission: string;
  question: string;
  time: string;
  prep: string;
  outputs: string[];
  status: { web: string; device: string };
  /** 1장 미션과 생활 사례 */
  scene: string[];
  questions: string[];
  goals: string[];
  /** 2장 우리 장비와 외부 도구 */
  device: {
    menu: string;
    verified: string;
    reads: [string, string][];
    external: [string, string][];
    prep: [string, string][];
    safety: string[];
  };
  /** 3장 용어: 용어, 뜻, 화면에서 읽는 위치 */
  terms: [string, string, string][];
  termsDo: string[];
  /** 4장 원리 */
  flow: { intro: string[]; steps: [string, string][]; visible: string[]; hidden: string[]; example: string };
  /** 5장 설계 */
  design: { change: string; fixed: string[]; measured: string[]; repeats: string; success: string; order: string };
  /** 6장 한 번의 측정 */
  procedure: string[];
  procedureNote: string[];
  fieldHelp?: Record<string, string>;
  /** 7장 골든 데이터 */
  golden: { story: string[]; reading: string[] };
  /** 8장 분석 */
  analysis: { pipeline: [string, string][]; reading: string[] };
  /** 9장 Colab */
  colab: { notes: string[]; change: string[] };
  /** 10장 문제 해결: 상황, 원인 후보, 할 일 */
  trouble: [string, string, string][];
  /** 11장 위협과 방어: 위협, 성립 조건과 영향, 방어, 검증 근거와 한계 */
  threats: { intro: string[]; rows: [string, string, string, string][]; boundary: string[] };
  /** 12장 현업과 확장 */
  industry: { intro: string[]; projects: Project[] };
  /** 13장 보고서 평가 */
  rubric: [string, string][];
  notes: Record<'question' | 'hypothesis' | 'controls' | 'interpretation' | 'conclusion' | 'defense' | 'limits' | 'application' | 'explain', NoteText>;
  /** 장마다 확인 질문 */
  checks: Record<'mission' | 'device' | 'terms' | 'flow' | 'design' | 'procedure' | 'golden' | 'analysis' | 'colab' | 'trouble' | 'threats' | 'industry' | 'report', string[]>;
  refs: Ref[];
}
