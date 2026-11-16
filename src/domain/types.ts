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
  defaultAnswer: 'worn' | 'notWorn'; backupEnabled: boolean;
  separateEyeCalendars: boolean;
};
export type Auxiliary = { id: string; kind: 'solution' | 'case'; name: string; start: DateOnly; due: DateOnly; completed: DateOnly | null };
export type Journal = { id: string; date: DateOnly; comfort: number; symptoms: string[]; note: string };
export type StockMovement = { id: string; date: DateOnly; delta: number; reason: string; cycleId?: string };
export type Eye = 'right' | 'left';
export type LensBox = {
  id: string; name: string; brand: string; lensType: 'spherical' | 'toric' | 'multifocal' | 'colored';
  durationDays: number; lensesTotal: number; lensesRemaining: number; eyes: Eye[];
  prescription: { right?: Record<string,string>; left?: Record<string,string>; color?: string };
};
export type LensPackage = { id: string; boxId: string; eye: Eye; openedOn: DateOnly; closedOn: DateOnly | null; pairId?: string; durationDaysSnapshot?: number; lensTypeSnapshot?: LensBox['lensType']; prescriptionSnapshot?: Partial<Record<Eye,Record<string,string>>> & {color?:string} };
export type DailyCheckIn = { id: string; packageId: string; date: DateOnly; status: 'worn' | 'notWorn' | 'glasses'; automatic: boolean; stockUsed?: boolean };
export type DailyStatus = { id:string; date:DateOnly; status:'worn'|'notWorn'|'glasses'; automatic:boolean };
export type PrescriptionRecord = { id: string; date: DateOnly; kind: 'lens' | 'glasses'; eyes: Eye[]; values: Partial<Record<Eye, Record<string,string>>> };
export type AppState = {
  version: 1; revision: number; onboarded: boolean;
  settings: Settings; modules: Record<ModuleKey, boolean>;
  profiles: Profile[]; cycles: Cycle[];
  stock: { pieces: number; autoDeduct: boolean; unit: 'pairs' | 'pieces' };
  movements: StockMovement[]; auxiliary: Auxiliary[]; journal: Journal[];
  boxes: LensBox[]; packages: LensPackage[]; checkIns: DailyCheckIn[]; dailyStatuses:DailyStatus[]; prescriptionHistory: PrescriptionRecord[];
};
export const defaultState = (): AppState => ({
  version: 1, revision: 0, onboarded: false,
  settings: { theme: 'sky', mode: 'system', mascot: 'lumi', reduceMotion: false, haptics: true, notifications: false, notificationTime: '21:00', offsets: [3, 1, 0], widgetStyle: 'mascot', widgetScope: 'summary', widgetStock: false, defaultAnswer: 'worn', backupEnabled: false, separateEyeCalendars:false },
  modules: { separate: false, stock: false, solution: false, journal: false, case: false },
  profiles: [], cycles: [], stock: { pieces: 0, autoDeduct: false, unit: 'pairs' }, movements: [], auxiliary: [], journal: [], boxes: [], packages: [], checkIns: [], dailyStatuses:[], prescriptionHistory: [],
});
export const scopeLabel = (scope: Scope) => ({ both: 'İki göz', left: 'Sol göz', right: 'Sağ göz' })[scope];
export const eyeLabel = (eye: Eye) => eye === 'right' ? 'Sağ' : 'Sol';
