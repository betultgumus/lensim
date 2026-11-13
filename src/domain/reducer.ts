import { dateOnly, getNextReplacementDate, parseDate, timeParts, validatePlan } from './dates.ts';
import { defaultState, type AppState, type Plan, type Scope, type Settings, type ModuleKey, type Journal, type Auxiliary } from './types.ts';

export type Action =
  | { type: 'setup'; plan: Plan; start: string; due?: string; id: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'module'; key: ModuleKey; enabled: boolean }
  | { type: 'separate'; enabled: boolean; copy: boolean }
  | { type: 'edit'; scope: Scope; plan: Plan; start: string; due?: string; brand: string; power: string }
  | { type: 'replace'; cycleId: string; date: string; id: string; allowEmptyStock?: boolean }
  | { type: 'correctHistory'; cycleId: string; date: string }
  | { type: 'openDaily'; scope: Scope; date: string; id: string; allowEmptyStock?: boolean }
  | { type: 'openLens'; scope: Scope; date: string; id: string; allowEmptyStock?: boolean }
  | { type: 'undo'; expectedRevision: number; previous: AppState }
  | { type: 'stock'; pieces: number; reason: string; id: string; date: string }
  | { type: 'stockSettings'; autoDeduct: boolean; unit: 'pairs' | 'pieces' }
  | { type: 'auxiliary'; entry: Auxiliary }
  | { type: 'journal'; entry: Journal }
  | { type: 'deleteJournal'; id: string }
  | { type: 'reset' };

export function activeCycles(state: AppState) {
  return state.cycles.filter(c => !c.completed && (state.modules.separate ? c.profileId !== 'both' : c.profileId === 'both'));
}
// State contains JSON values only. Do not depend on structuredClone availability in Hermes.
function cloneState(state: AppState): AppState { return JSON.parse(JSON.stringify(state)) as AppState; }
function validDates(start: string, due: string) {
  parseDate(start); parseDate(due);
  if (due < start) throw new Error('Değişim tarihi başlangıçtan önce olamaz.');
}
function deduct(state: AppState, scope: Scope, id: string, date: string, allowEmpty = false) {
  if (!state.modules.stock || !state.stock.autoDeduct) return;
  const pieces = scope === 'both' ? 2 : 1;
  if (state.stock.pieces < pieces && !allowEmpty) throw new Error('Stok yetersiz. Önce stok ekle veya otomatik azaltmayı kapat.');
  if (state.stock.pieces < pieces) return;
  state.stock.pieces -= pieces;
  state.movements.push({ id: `stock-${id}`, cycleId: id, date, delta: -pieces, reason: 'Yeni lens açıldı' });
}
/** Pure atomic transition. Persistence commits the entire transition before external effects. */
export function transition(previous: AppState, action: Action, today = dateOnly()): AppState {
  if (action.type === 'reset') { const empty = defaultState(); empty.revision = previous.revision + 1; return empty; }
  const state: AppState = cloneState(previous);
  switch (action.type) {
    case 'setup': {
      if (state.onboarded) throw new Error('Kurulum zaten tamamlandı.');
      validatePlan(action.plan);
      const due = action.plan.kind === 'daily' ? action.start : action.due || getNextReplacementDate(action.start, action.plan);
      validDates(action.start, due);
      state.profiles = [{ id: 'both', plan: action.plan, brand: '', power: '' }];
      state.cycles = [{ id: action.id, profileId: 'both', start: action.start, due, completed: null, plan: action.plan }];
      state.onboarded = true; break;
    }
    case 'settings':
      if (action.patch.notificationTime) timeParts(action.patch.notificationTime);
      state.settings = { ...state.settings, ...action.patch }; break;
    case 'module':
      if (action.key === 'separate') throw new Error('Ayrı takip geçişini onay ekranından yap.');
      state.modules[action.key] = action.enabled; break;
    case 'separate': {
      if (action.enabled && !state.profiles.some(p => p.id === 'left')) {
        const both = state.profiles.find(p => p.id === 'both'); const current = activeCycles(state)[0];
        if (!both || !current || !action.copy) throw new Error('Önce iki göz için etkin bir döngü başlat.');
        for (const scope of ['left','right'] as const) {
          state.profiles.push({ ...both, id: scope });
          state.cycles.push({ ...current, id: `${current.id}-${scope}`, profileId: scope });
        }
      }
      // Original and separate cycles remain stored; inactive scopes are frozen from UI/effects only.
      state.modules.separate = action.enabled; break;
    }
    case 'edit': {
      validatePlan(action.plan);
      const profile = state.profiles.find(p => p.id === action.scope);
      if (!profile) throw new Error('Lens profili bulunamadı.');
      const cycle = state.cycles.find(c => c.profileId === action.scope && !c.completed);
      const due = action.plan.kind === 'daily' ? action.start : action.due || getNextReplacementDate(action.start, action.plan);
      validDates(action.start, due);
      if (cycle) Object.assign(cycle, { start: action.start, due, plan: action.plan });
      Object.assign(profile, { plan: action.plan, brand: action.brand, power: action.power }); break;
    }
    case 'replace': {
      const cycle = state.cycles.find(c => c.id === action.cycleId);
      // A completed cycle ID makes repeated taps idempotent, including process retries.
      if (!cycle || cycle.completed) return previous;
      if (!activeCycles(state).some(c => c.id === cycle.id)) throw new Error('Bu takip şu anda etkin değil.');
      parseDate(action.date);
      if (action.date < cycle.start || action.date > today) throw new Error('Gerçek değişim tarihi başlangıç ile bugün arasında olmalı.');
      cycle.completed = action.date;
      if (cycle.plan.kind !== 'daily') {
        const profile = state.profiles.find(p => p.id === cycle.profileId)!;
        state.cycles.push({ id: action.id, profileId: cycle.profileId, start: action.date, due: getNextReplacementDate(action.date, profile.plan), completed: null, plan: profile.plan });
        deduct(state, cycle.profileId, action.id, action.date, action.allowEmptyStock);
      }
      break;
    }
    case 'openDaily':
    case 'openLens': {
      parseDate(action.date);
      if (action.date > today) throw new Error('Yeni lens açılışı geleceğe kaydedilemez.');
      if (state.cycles.some(c => c.id === action.id)) return previous;
      if (state.cycles.some(c => c.profileId === action.scope && !c.completed)) throw new Error('Önce kullanılan lensi attığını kaydet.');
      const profile = state.profiles.find(p => p.id === action.scope);
      if (!profile || (action.type === 'openDaily' && profile.plan.kind !== 'daily')) throw new Error('Lens planı bulunamadı.');
      if (state.modules.separate ? action.scope === 'both' : action.scope !== 'both') throw new Error('Bu takip şu anda etkin değil.');
      const last = state.cycles.filter(c => c.profileId === action.scope && c.completed).at(-1);
      if (last?.completed && action.date < last.completed) throw new Error('Yeni kullanım önceki kayıttan önce başlayamaz.');
      state.cycles.push({ id: action.id, profileId: action.scope, start: action.date, due: getNextReplacementDate(action.date,profile.plan), completed: null, plan: profile.plan });
      deduct(state, action.scope, action.id, action.date, action.allowEmptyStock); break;
    }
    case 'correctHistory': {
      const cycle = state.cycles.find(c => c.id === action.cycleId);
      if (!cycle?.completed) throw new Error('Tamamlanan kayıt bulunamadı.');
      parseDate(action.date);
      if (action.date < cycle.start || action.date > today) throw new Error('Gerçek tarih başlangıç ile bugün arasında olmalı.');
      const index = state.cycles.indexOf(cycle);
      const next = state.cycles.slice(index + 1).find(c => c.profileId === cycle.profileId);
      const linked = next && cycle.plan.kind !== 'daily' && next.start === cycle.completed;
      if (next && action.date > (next.completed ?? (linked ? today : next.start))) throw new Error('Bu tarih sonraki kayıtla çakışıyor. Önce sonraki kaydı kontrol et.');
      if (next && cycle.plan.kind !== 'daily' && next.start === cycle.completed) {
        const manual = next.due !== getNextReplacementDate(next.start, next.plan);
        next.start = action.date;
        if (!manual) next.due = getNextReplacementDate(action.date, next.plan);
        validDates(next.start, next.due);
        state.movements.filter(m => m.cycleId === next.id).forEach(m => { m.date = action.date; });
      }
      cycle.completed = action.date; break;
    }
    case 'undo':
      if (previous.revision !== action.expectedRevision) throw new Error('Sonrasında başka değişiklik yapıldı; geri alma artık mümkün değil.');
      return { ...cloneState(action.previous), revision: previous.revision + 1 };
    case 'stock': {
      if (!Number.isInteger(action.pieces) || action.pieces < 0) throw new Error('Stok negatif olmayan tam lens adedi olmalı.');
      state.movements.push({ id: action.id, date: action.date, delta: action.pieces - state.stock.pieces, reason: action.reason });
      state.stock.pieces = action.pieces; break;
    }
    case 'stockSettings': state.stock = { ...state.stock, autoDeduct: action.autoDeduct, unit: action.unit }; break;
    case 'auxiliary': {
      validDates(action.entry.start, action.entry.due);
      if (action.entry.start > today) throw new Error('Açılış tarihi gelecekte olamaz.');
      if (state.auxiliary.some(e => e.kind === action.entry.kind && !e.completed && action.entry.start < e.start)) throw new Error('Yeni açılış önceki açılıştan önce olamaz.');
      state.auxiliary.filter(e => e.kind === action.entry.kind && !e.completed).forEach(e => { e.completed = action.entry.start; });
      state.auxiliary.push(action.entry); break;
    }
    case 'journal':
      parseDate(action.entry.date);
      if (action.entry.date > today) throw new Error('Günlük tarihi gelecekte olamaz.');
      if (action.entry.comfort < 1 || action.entry.comfort > 5) throw new Error('Konfor seviyesi 1–5 olmalı.');
      state.journal.push(action.entry); break;
    case 'deleteJournal': state.journal = state.journal.filter(e => e.id !== action.id); break;
  }
  state.revision++;
  return state;
}

/** Reject malformed state rather than silently deleting user records. */
export function validateState(value: unknown): AppState {
  const s = value as AppState;
  if (!s || s.version !== 1 || !Number.isInteger(s.revision) || !s.settings || !s.modules || !Array.isArray(s.cycles) || !Array.isArray(s.profiles) || !Array.isArray(s.journal) || !Array.isArray(s.auxiliary) || !Array.isArray(s.movements) || !s.stock) throw new Error('Yerel veriler okunamadı. Veriler korunuyor.');
  timeParts(s.settings.notificationTime);
  if (!['lavender','mint','rose','peach','sky'].includes(s.settings.theme) || !['system','light','dark'].includes(s.settings.mode) || !['lumi','minti','pufi','none'].includes(s.settings.mascot) || !['mascot','minimal'].includes(s.settings.widgetStyle) || !['both','left','right','summary'].includes(s.settings.widgetScope) || !Array.isArray(s.settings.offsets) || s.settings.offsets.some(n => !Number.isInteger(n) || n < 0 || n > 365)) throw new Error('Görünüm veya hatırlatıcı ayarları okunamadı.');
  for (const key of ['separate','stock','solution','journal','case'] as const) if (typeof s.modules[key] !== 'boolean') throw new Error('Özellik ayarları okunamadı.');
  for (const key of ['reduceMotion','haptics','notifications','widgetStock'] as const) if (typeof s.settings[key] !== 'boolean') throw new Error('Uygulama ayarları okunamadı.');
  const scopes = new Set<string>();
  for (const p of s.profiles) {
    if (!['both','left','right'].includes(p.id) || scopes.has(p.id)) throw new Error('Lens profili tutarsız.');
    scopes.add(p.id); validatePlan(p.plan);
  }
  const active = new Set<string>(); const ids = new Set<string>();
  for (const c of s.cycles) {
    validatePlan(c.plan); validDates(c.start, c.due);
    if (c.completed) { parseDate(c.completed); if (c.completed < c.start) throw new Error('Geçmiş tarihi tutarsız.'); }
    if (!s.profiles.some(p => p.id === c.profileId) || ids.has(c.id)) throw new Error('Döngü kaydı tutarsız.');
    ids.add(c.id);
    if (!c.completed) { if (active.has(c.profileId)) throw new Error('Bir profil için birden fazla etkin döngü var.'); active.add(c.profileId); }
  }
  if (!Number.isInteger(s.stock.pieces) || s.stock.pieces < 0) throw new Error('Stok kaydı tutarsız.');
  for (const j of s.journal) { parseDate(j.date); if (!Array.isArray(j.symptoms) || typeof j.note !== 'string' || !Number.isInteger(j.comfort) || j.comfort < 1 || j.comfort > 5) throw new Error('Günlük kaydı okunamadı.'); }
  for (const e of s.auxiliary) { validDates(e.start, e.due); if (!['case','solution'].includes(e.kind)) throw new Error('Yardımcı kayıt okunamadı.'); }
  return s;
}
