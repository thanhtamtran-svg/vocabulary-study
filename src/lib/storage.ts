import { STORAGE_KEY } from './constants';

export function loadState(key?: string) {
  try {
    const raw = localStorage.getItem(key || STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveState(state, key?: string) {
  try {
    localStorage.setItem(key || STORAGE_KEY, JSON.stringify(state));
  } catch(e) { console.warn('Save failed', e); }
}
