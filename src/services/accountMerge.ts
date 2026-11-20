import { validateState } from '../domain/reducer.ts';
import type { AppState } from '../domain/types';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const byKey = <T>(cloud: T[], local: T[], key: (item: T) => string) => {
  const rows = new Map<string, T>();
  for (const item of cloud) rows.set(key(item), copy(item));
  // The active device wins a duplicate key. Other account records remain in the union.
  for (const item of local) rows.set(key(item), copy(item));
  return [...rows.values()];
};
const norm = (name: string) => name.trim().normalize('NFKC').toLocaleLowerCase('tr-TR');
const hasRecords = (s: AppState) => Boolean(s.onboarded || s.boxes.length || s.packages.length || s.dailyStatuses.length || s.prescriptionHistory.length || s.journal.length || s.cycles.length);

/** Merge stable record IDs; resolve one-per-day answers in favor of the current device. */
export function mergeAccountStates(local: AppState, cloud: AppState): { state: AppState; overlappingDays: number } {
  const l = copy(local), c = copy(cloud);
  const localDays = new Set(l.dailyStatuses.map(d => d.date));
  const cloudDays = new Set(c.dailyStatuses.map(d => d.date));
  const overlappingDays = [...localDays].filter(day => cloudDays.has(day)).length;
  const boxes = byKey(c.boxes, l.boxes, row => row.id);
  const usedNames = new Set<string>();
  for (const box of boxes) {
    const base = box.name.trim(); let name = base; let suffix = 2;
    while (usedNames.has(norm(name))) name = `${base} (${suffix++})`;
    box.name = name; usedNames.add(norm(name));
  }
  const state: AppState = {
    ...c, ...l, revision: Math.max(l.revision, c.revision), onboarded: l.onboarded || c.onboarded,
    // Theme, reminders and widget preferences remain device-local.
    settings: hasRecords(l) ? l.settings : c.settings,
    modules: hasRecords(l) ? l.modules : c.modules,
    stock: hasRecords(l) ? l.stock : c.stock,
    profiles: byKey(c.profiles, l.profiles, row => row.id),
    cycles: byKey(c.cycles, l.cycles, row => row.id),
    movements: byKey(c.movements, l.movements, row => row.id),
    auxiliary: byKey(c.auxiliary, l.auxiliary, row => row.id),
    journal: byKey(c.journal, l.journal, row => row.id), boxes,
    packages: byKey(c.packages, l.packages, row => row.id),
    checkIns: byKey(c.checkIns, l.checkIns, row => `${row.packageId}|${row.date}`),
    dailyStatuses: byKey(c.dailyStatuses, l.dailyStatuses, row => row.date),
    prescriptionHistory: byKey(c.prescriptionHistory, l.prescriptionHistory, row => row.id),
  };
  return { state: validateState(state), overlappingDays };
}

