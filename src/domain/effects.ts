import { activeCycles } from './reducer.ts';
import { addDays, dateOnly, formatDate, getCycleProgress, getNotificationDates, parseDate, statusCopy } from './dates.ts';
import type { AppState } from './types.ts';

export type Reminder = { key: string; date: Date; body: string };
export function notificationPlan(state: AppState, now = new Date()): Reminder[] {
  if (!state.settings.notifications) return [];
  const result: Reminder[] = [];
  for (const c of activeCycles(state)) {
    const offsets = c.plan.kind === 'daily' ? [0] : state.settings.offsets;
    for (const date of getNotificationDates(c.due, offsets, state.settings.notificationTime, now)) {
      if (dateOnly(date) < c.start) continue;
      const eye = c.profileId === 'both' ? 'Lenslerin' : c.profileId === 'left' ? 'Sol lensin' : 'Sağ lensin';
      result.push({ key: `lens:${c.id}:${+date}`, date, body: c.plan.kind === 'daily' ? 'Günlük lensini kullanım sonunda atmayı unutma.' : `${eye} için değişim tarihi: ${formatDate(c.due)}. Ürün talimatını esas al.` });
    }
  }
  for (const e of state.auxiliary.filter(e => !e.completed && state.modules[e.kind])) {
    for (const date of getNotificationDates(e.due, [0], state.settings.notificationTime, now)) result.push({ key: `${e.kind}:${e.id}:${+date}`, date, body: `${e.kind === 'case' ? 'Lens kabı' : 'Solüsyon'} değişim tarihin geldi. Ürün talimatını kontrol et.` });
  }
  return result.sort((a,b) => +a.date - +b.date).slice(0, 60);
}
export type WidgetProps = { title: string; value: string; label: string; due: string; summary: string; color: string; background: string; mascot: boolean; face: string; stock: string; progress: number };
const colors = { lavender: '#7456C3', mint: '#267257', rose: '#A14472', peach: '#A15B31', sky: '#346CA2' };
const backgrounds = { lavender: '#F2EDFF', mint: '#E4F6EC', rose: '#FBEAF3', peach: '#FFF0E5', sky: '#E8F3FF' };
/** Widget storage never receives journal notes, lens powers, brands or historical records. */
export function androidWidgetSnapshot(state: AppState) {
  const { theme, mode, mascot, widgetStyle, widgetScope, widgetStock } = state.settings;
  return {
    settings: { theme, mode, mascot, widgetStyle, widgetScope, widgetStock },
    modules: { separate: state.modules.separate, stock: state.modules.stock },
    cycles: activeCycles(state).map(c => ({ start:c.start, due:c.due, profileId:c.profileId, completed:null, plan:{ kind:c.plan.kind } })),
    stock: { pieces: state.modules.stock && widgetStock ? state.stock.pieces : 0 },
  };
}
export function widgetProps(state: AppState, day: string): WidgetProps {
  const cycles = activeCycles(state);
  const sorted = [...cycles].sort((a,b) => a.due.localeCompare(b.due));
  const cycle = state.settings.widgetScope === 'summary' ? sorted[0] : cycles.find(c => c.profileId === state.settings.widgetScope) ?? sorted[0];
  const copy = cycle ? statusCopy(cycle, day) : null;
  return {
    title: 'Lens Takip', value: copy?.number ?? 'Merhaba', label: copy?.label ?? 'Lens takibini başlat',
    due: cycle ? `Değişim: ${formatDate(cycle.due, true)}` : 'Uygulamayı aç',
    summary: state.modules.separate ? cycles.map(c => `${c.profileId === 'left' ? 'Sol' : 'Sağ'}: ${statusCopy(c, day).number} ${statusCopy(c, day).label}`).join(' · ') : '',
    color: colors[state.settings.theme], background: state.settings.mode === 'dark' ? '#211C30' : backgrounds[state.settings.theme],
    mascot: state.settings.widgetStyle === 'mascot' && state.settings.mascot !== 'none', face: state.settings.mascot,
    stock: state.modules.stock && state.settings.widgetStock ? `${state.stock.pieces} lens stokta` : '',
    progress: cycle ? getCycleProgress(cycle,day) : 0,
  };
}
/** Local midnights, not increments of 24h; final entry has no stale countdown. */
export function generateWidgetTimeline(state: AppState, now = new Date(), days = 62) {
  const entries = [{ date: now, props: widgetProps(state, dateOnly(now)) }];
  for (let i = 1; i <= days; i++) {
    const day = addDays(dateOnly(now), i); const date = parseDate(day); date.setHours(0,0,0,0);
    entries.push({ date, props: widgetProps(state, day) });
  }
  const final = parseDate(addDays(dateOnly(now), days + 1)); final.setHours(0,0,0,0);
  entries.push({ date: final, props: { ...widgetProps(state, dateOnly(final)), value: 'Tarihini', label: 'kontrol et', summary: '' } });
  return entries;
}
