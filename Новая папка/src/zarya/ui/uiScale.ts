import { createContext, useContext } from 'react';

/** Масштаб интерфейса (CSS zoom). 1 = оригинальный размер. */
export const UiScaleContext = createContext(1);
export const useUiScale = () => useContext(UiScaleContext);

export const UI_SCALE_KEY = 'zarya_ui_scale';
export const UI_SCALE_MIN = 0.5;
export const UI_SCALE_MAX = 1;
export const UI_SCALE_DEFAULT = 0.7;

export function loadUiScale(): number {
  try {
    const v = parseFloat(localStorage.getItem(UI_SCALE_KEY) ?? '');
    if (Number.isFinite(v)) return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, v));
  } catch {
    /* ignore */
  }
  return UI_SCALE_DEFAULT;
}

export function saveUiScale(v: number) {
  try {
    localStorage.setItem(UI_SCALE_KEY, String(v));
  } catch {
    /* ignore */
  }
}
