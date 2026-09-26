/**
 * The state shown by the explorer, shared by its two islands (the state card and the view). Both
 * import this module, so they share one instance on the page.
 *
 * No timer: the visitor picks. It opens on the doubled name, the failure with the clearest story.
 */
import { useSyncExternalStore } from 'react';
import { SCENES } from './explorer-data.js';

const START = Math.max(0, SCENES.findIndex((s) => s.id === 'appended-zone'));

let state = { index: START };
const listeners = new Set();

export const useExplorer = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );

export const pick = (index) => {
  const i = ((index % SCENES.length) + SCENES.length) % SCENES.length;
  if (i === state.index) return;
  state = { index: i };
  for (const l of listeners) l();
};
