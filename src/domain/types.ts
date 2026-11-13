export type DateOnly = string;
export type Scope = 'both' | 'left' | 'right';
export type Plan = { kind: 'daily' | 'fortnight' | 'monthly' | 'custom'; unit: 'days' | 'weeks' | 'months'; interval: number };
export type LensStatus = 'future' | 'normal' | 'soon' | 'tomorrow' | 'due' | 'overdue' | 'daily';
export type ModuleKey = 'separate' | 'stock' | 'solution' | 'journal' | 'case';
export type Profile = { id: Scope; plan: Plan; brand: string; power: string };
export type Cycle = { id: string; profileId: Scope; start: DateOnly; due: DateOnly; completed: DateOnly | null; plan: Plan };
export type Settings = {
  theme: 'lavender' | 'mint' | 'rose' | 'peach' | 'sky'; mode: 'system' | 'light' | 'dark';
  mascot: 'lumi' | 'minti' | 'pufi' | 'none'; reduceMotion: boolean; haptics: boolean;
  notifications: boolean; notificationTime: string; offsets: number[];
  widgetStyle: 'mascot' | 'minimal'; widgetScope: Scope | 'summary'; widgetStock: boolean;
};
export type Auxiliary = { id: string; kind: 'solution' | 'case'; name: string; start: DateOnly; due: DateOnly; completed: DateOnly | null };
export type Journal = { id: string; date: DateOnly; comfort: number; symptoms: string[]; note: string };
export type StockMovement = { id: string; date: DateOnly; delta: number; reason: string; cycleId?: string };
export type AppState = {
  version: 1; revision: number; onboarded: boolean;
  settings: Settings; modules: Record<ModuleKey, boolean>;
  profiles: Profile[]; cycles: Cycle[];
  stock: { pieces: number; autoDeduct: boolean; unit: 'pairs' | 'pieces' };
  movements: StockMovement[]; auxiliary: Auxiliary[]; journal: Journal[];
};
export const defaultState = (): AppState => ({
  version: 1, revision: 0, onboarded: false,
  settings: { theme: 'lavender', mode: 'system', mascot: 'lumi', reduceMotion: false, haptics: true, notifications: false, notificationTime: '09:00', offsets: [3, 1, 0], widgetStyle: 'mascot', widgetScope: 'summary', widgetStock: false },
  modules: { separate: false, stock: false, solution: false, journal: false, case: false },
  profiles: [], cycles: [], stock: { pieces: 0, autoDeduct: false, unit: 'pairs' }, movements: [], auxiliary: [], journal: [],
});
export const scopeLabel = (scope: Scope) => ({ both: 'İki göz', left: 'Sol göz', right: 'Sağ göz' })[scope];
