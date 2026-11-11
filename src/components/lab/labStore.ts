import { useEffect, useSyncExternalStore } from 'react';

/** 한 워크북의 여러 입력 조각(island)이 같은 상태를 보도록 모듈 단위로 공유한다. */
export interface Snapshot<T> { state: T; ready: boolean; blocked: boolean; message: string }

export function persisted<T>(key: string, initial: T, restore: (raw: string) => { state: T; warning?: string }) {
  const first: Snapshot<T> = { state: initial, ready: false, blocked: false, message: '' };
  let snap = first;
  let started = false;
  const listeners = new Set<() => void>();
  const emit = (next: Partial<Snapshot<T>>) => { snap = { ...snap, ...next }; listeners.forEach((l) => l()); };

  function load() {
    if (started) return;
    started = true;
    let raw: string | null = null;
    try { raw = localStorage.getItem(key); }
    catch { emit({ ready: true, blocked: true, message: '이 브라우저 저장소를 읽지 못해 자동 저장을 멈췄습니다. 창을 닫기 전에 CSV를 내려받으세요.' }); return; }
    if (raw === null) { emit({ ready: true }); return; }
    try {
      const restored = restore(raw);
      emit({ ready: true, state: restored.state, message: restored.warning ?? '' });
    } catch {
      try {
        localStorage.setItem(`${key}.broken.${Date.now()}`, raw);
        emit({ ready: true, message: '저장 형식이 맞지 않아 원본을 별도 키에 보존하고 빈 상태로 시작했습니다. CSV 백업에서 복구하세요.' });
      } catch { emit({ ready: true, blocked: true, message: '저장 원본을 보존하지 못해 자동 저장을 멈췄습니다. 창을 닫기 전에 CSV를 내려받으세요.' }); }
    }
  }

  function set(update: (state: T) => T) {
    if (!snap.ready) return;
    const state = update(snap.state);
    let { blocked, message } = snap;
    if (!blocked) {
      try { localStorage.setItem(key, JSON.stringify(state)); }
      catch { blocked = true; message = '이 브라우저에 저장하지 못했습니다. 창을 닫기 전에 CSV를 내려받으세요.'; }
    }
    emit({ state, blocked, message });
  }

  function use(): Snapshot<T> {
    useEffect(load, []);
    return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => snap, () => first);
  }

  return { use, set, say: (message: string) => emit({ message }) };
}
