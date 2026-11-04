// NFC 실험 상태. 여러 React 섬이 같은 상태를 보고, localStorage에 저장한다.
import { useSyncExternalStore } from 'react';
import { DEFAULT_QUESTION, MAX_NOTE_FIELD, NOTE_KEYS, demoTrials, mergeTrials, validateTrial, type DataType, type Notes, type Trial } from '../../lib/nfc';

const KEY = 'esp32div.nfc.v1';

export interface LabState {
  trials: Trial[];
  notes: Notes;
  view: DataType;
  saveError: string | null;
  loadWarning: string | null;
}

const EMPTY: LabState = { trials: [], notes: { question: DEFAULT_QUESTION }, view: 'real', saveError: null, loadWarning: null };

let state = EMPTY;
// 읽지 못한 원본을 따로 보관하지도 못했을 때 true. 이후 저장이 원본을 덮어쓰지 않게 막는다.
let writeBlocked = false;
const listeners = new Set<() => void>();

function emit(next: LabState): void {
  state = next;
  listeners.forEach((l) => l());
}

function persist(next: LabState): LabState {
  if (writeBlocked) return next;
  try {
    localStorage.setItem(KEY, JSON.stringify({ trials: next.trials, notes: next.notes }));
    return { ...next, saveError: null };
  } catch {
    return { ...next, saveError: '이 브라우저에 저장하지 못했습니다. 저장 공간이 가득 찼거나 사생활 보호 모드일 수 있습니다. 창을 닫기 전에 CSV로 백업하세요.' };
  }
}

const commit = (patch: Partial<LabState>): void => emit(persist({ ...state, ...patch }));

/** 덮어쓰기 전에 읽지 못한 원본을 다른 키에 보관한다. 성공 여부를 돌려준다. */
function keepOriginal(raw: string): boolean {
  try {
    const slot = `${KEY}.broken`;
    const existing = localStorage.getItem(slot);
    if (existing === raw) return true;
    localStorage.setItem(existing === null ? slot : `${slot}.${Date.now()}`, raw);
    return true;
  } catch {
    return false;
  }
}

function readStorage(): Pick<LabState, 'trials' | 'notes' | 'loadWarning' | 'saveError'> {
  writeBlocked = false;
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { trials: [], notes: EMPTY.notes, loadWarning: null, saveError: '이 브라우저의 저장 공간을 쓸 수 없습니다. 입력은 이 창에서만 유지되니 CSV로 백업하세요.' };
  }
  if (!raw) return { trials: [], notes: EMPTY.notes, loadWarning: null, saveError: null };

  const blocked = (detail: string) => {
    writeBlocked = true;
    return `${detail} 원본을 따로 보관하지 못해, 원본을 지키려고 이 브라우저에 새로 저장하지 않습니다. 이번 입력은 이 창에서만 유지되니 CSV로 백업하세요.`;
  };

  try {
    const data = JSON.parse(raw) as { trials?: unknown; notes?: unknown };
    const stored = Array.isArray(data.trials) ? (data.trials as Partial<Trial>[]) : [];
    let dropped = 0;
    const trials: Trial[] = [];
    for (const t of stored) {
      const v = validateTrial(
        { trial: String(t.trial), condition: String(t.condition ?? ''), contents: String(t.contents ?? ''), distance_cm: String(t.distanceCm), orientation: String(t.orientation ?? ''), success: String(t.success), note: String(t.note ?? '') },
        t.dataType === 'demo' ? 'demo' : 'real',
      );
      if (typeof v === 'string') dropped++;
      else trials.push(typeof t.id === 'string' ? { ...v, id: t.id } : v);
    }
    const notes: Notes = { ...EMPTY.notes };
    if (data.notes && typeof data.notes === 'object') {
      for (const key of NOTE_KEYS) {
        const value = (data.notes as Notes)[key];
        if (typeof value === 'string') notes[key] = value.slice(0, MAX_NOTE_FIELD);
      }
    }
    if (!dropped) return { trials, notes, saveError: null, loadWarning: null };
    const message = `저장된 기록 중 ${dropped}건의 형식이 맞지 않아 불러오지 않았습니다.`;
    return keepOriginal(raw)
      ? { trials, notes, saveError: null, loadWarning: `${message} 원본은 브라우저에 따로 보관했습니다.` }
      : { trials, notes, loadWarning: null, saveError: blocked(message) };
  } catch {
    const message = '저장된 자료를 읽지 못했습니다.';
    return keepOriginal(raw)
      ? { trials: [], notes: EMPTY.notes, saveError: null, loadWarning: `${message} 원본은 브라우저에 따로 보관했고, 빈 상태로 시작합니다.` }
      : { trials: [], notes: EMPTY.notes, loadWarning: null, saveError: blocked(message) };
  }
}

if (typeof window !== 'undefined') {
  state = { ...EMPTY, ...readStorage() };
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) emit({ ...state, ...readStorage() });
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useLab = (): LabState => useSyncExternalStore(subscribe, () => state, () => EMPTY);

export const visibleTrials = (s: LabState): Trial[] => s.trials.filter((t) => t.dataType === s.view);

export const setNote = (key: string, value: string): void => commit({ notes: { ...state.notes, [key]: value } });
export const addTrial = (t: Trial): void => commit({ trials: [...state.trials, t], view: 'real' });
export const removeTrial = (id: string): void => commit({ trials: state.trials.filter((t) => t.id !== id) });
/** 지운 한 건만 되살린다. 그사이 들어온 다른 기록은 그대로 둔다. */
export const restoreTrial = (t: Trial): void => {
  if (!state.trials.some((x) => x.id === t.id)) commit({ trials: [...state.trials, t] });
};
export const setView = (view: DataType): void => emit({ ...state, view });
export const clearReal = (): void => commit({ trials: state.trials.filter((t) => t.dataType !== 'real') });
export const loadDemo = (): void => commit({ trials: [...state.trials.filter((t) => t.dataType !== 'demo'), ...demoTrials()], view: 'demo' });
export const clearDemo = (): void => commit({ trials: state.trials.filter((t) => t.dataType !== 'demo'), view: 'real' });

export function importTrials(incoming: Trial[], replace: boolean): { added: number; skipped: number } {
  if (replace) {
    commit({ trials: incoming, view: 'real' });
    return { added: incoming.length, skipped: 0 };
  }
  const merged = mergeTrials(state.trials, incoming);
  commit({ trials: merged.trials });
  return { added: merged.added, skipped: merged.skipped };
}

export const importNotes = (notes: Notes): void => commit({ notes: { ...state.notes, ...notes } });

export function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
