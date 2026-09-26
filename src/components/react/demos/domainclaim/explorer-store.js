/**
 * State shared by the explorer's two islands (the state card and the view). Both import this
 * module, so they share one instance on the page.
 *
 * The card plays through the scenes on its own after a quiet spell. A pick, a hover or focus in
 * either island pauses it; it picks up again after a longer quiet spell. Reduced motion: no loop.
 */
import { useSyncExternalStore } from 'react';
import { SCENES } from './explorer-data.js';

const DWELL_MS = 9000;
const AFTER_PICK_MS = 20000;

let state = { index: 0, picked: false, auto: false };
const listeners = new Set();
const clock = { openedAt: Date.now(), touchedAt: 0, inside: 0, visible: 0, timer: null };
const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const set = (next) => {
  state = { ...state, ...next };
  for (const l of listeners) l();
};

export const useExplorer = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );

export const pick = (index, picked = true) => {
  const i = ((index % SCENES.length) + SCENES.length) % SCENES.length;
  clock.openedAt = Date.now();
  if (picked) clock.touchedAt = Date.now();
  set({ index: i, picked });
};

/** Pointer or focus entering / leaving either island. */
export const touch = (inside) => {
  clock.inside = Math.max(0, clock.inside + (inside ? 1 : -1));
  clock.touchedAt = Date.now();
};

/** Each island reports entering and leaving the viewport; the loop runs while either is seen. */
export const seen = (visible) => {
  clock.visible = Math.max(0, clock.visible + (visible ? 1 : -1));
};

/** Started by the state card; one timer for the page. */
export const startLoop = () => {
  if (clock.timer !== null || reduced) return () => {};
  clock.timer = setInterval(() => {
    const now = Date.now();
    const paused = clock.inside > 0 || clock.visible === 0 || document.hidden;
    if (state.auto !== !paused) set({ auto: !paused });
    if (paused) return;
    const dwell = state.picked ? AFTER_PICK_MS : DWELL_MS;
    if (now - clock.openedAt > dwell && now - clock.touchedAt > DWELL_MS) pick(state.index + 1, false);
  }, 500);
  return () => {
    clearInterval(clock.timer);
    clock.timer = null;
  };
};

export const loopAvailable = !reduced;
