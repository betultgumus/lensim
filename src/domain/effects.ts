import { activeCycles } from './reducer.ts';
import { addDays, dateOnly, formatDate, getDaysRemaining, getNotificationDates, parseDate, trackingDay } from './dates.ts';
import type { AppState } from './types.ts';

export type Reminder = { key: string; date: Date; body: string; kind?: 'daily-checkin'|'package-expired'|'night-remove'; packageIds?: string[]; eye?: 'left'|'right' };
/**
 * Two independent reminder groups: `notifications` = the daily "Bugün lens taktın mı?" question plus package
 * change warnings at `notificationTime`; `nightReminder` = "Lenslerini çıkardın mı?" at `nightReminderTime`.
 * Turning one on never turns on or moves the other.
 */
export function notificationPlan(state: AppState, now = new Date()): Reminder[] {
  return [...dailyPlan(state, now), ...nightPlan(state, now)].sort((a,b) => +a.date - +b.date).slice(0, 60);
}
export const NIGHT_REMINDER_BODY = 'Lenslerini çıkardın mı? Lensle uyumamak için yatmadan önce çıkarmayı unutma.';
/** Nights with an open package, except days already answered "Takmadım" or "Gözlük". A time before 02.00 belongs to the same tracking day. */
function nightPlan(state: AppState, now: Date): Reminder[] {
  if (!state.settings.nightReminder) return [];
  const [hour, minute] = state.settings.nightReminderTime.split(':').map(Number);
  const result: Reminder[] = [];
  for (let i = 0; i < 21; i++) {
    const day = addDays(trackingDay(now), i);
    if (!state.packages.some(p => p.openedOn <= day && (!p.closedOn || day <= p.closedOn))) continue;
    const answer = state.dailyStatuses.find(d => d.date === day);
    if (answer && !answer.automatic && answer.status !== 'worn') continue;
    const date = parseDate(hour! < 2 ? addDays(day, 1) : day); date.setHours(hour!, minute!, 0, 0);
    if (date <= now) continue;
    result.push({ key: `night:${+date}`, date, body: NIGHT_REMINDER_BODY, kind: 'night-remove' });
  }
  return result;
}
function dailyPlan(state: AppState, now: Date): Reminder[] {
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
  const packages=state.packages.filter(p=>!p.closedOn&&p.openedOn<=trackingDay(now));
  for (const pack of packages) {
    const box=state.boxes.find(b=>b.id===pack.boxId); if(!box)continue;const duration=pack.durationDaysSnapshot??box.durationDays;if(duration<=1)continue;
    const due=addDays(pack.openedOn,duration-1);
    for(const date of getNotificationDates(due,state.settings.offsets,state.settings.notificationTime,now)) {
      if(dateOnly(date)<pack.openedOn) continue;
      const days=getDaysRemaining(due,dateOnly(date));
      result.push({key:`package:${pack.id}:${+date}`,date,body:days===0?`${pack.eye==='right'?'Sağ':'Sol'} lensinin bugün son günü.`:`${pack.eye==='right'?'Sağ':'Sol'} lensinin ${days} günü kaldı.`});
    }
    const expiredDate=parseDate(addDays(due,1));const [notifyHour,notifyMinute]=state.settings.notificationTime.split(':').map(Number);expiredDate.setHours(notifyHour!,notifyMinute!,0,0);
    if(expiredDate>now)result.push({key:`package-expired:${pack.id}`,date:expiredDate,body:`${pack.eye==='right'?'Sağ':'Sol'} lensinin süresi doldu. Yenisini açtın mı?`,kind:'package-expired',eye:pack.eye});
  }
  if(packages.length) {
    const [hour,minute]=state.settings.notificationTime.split(':').map(Number);
    for(let i=0;i<30;i++) {
      const day=addDays(trackingDay(now),i); const packageIds=packages.filter(p=>!state.checkIns.some(c=>c.packageId===p.id&&c.date===day)).map(p=>p.id);
      if(!packageIds.length)continue;
      const date=parseDate(day);date.setHours(hour!,minute!,0,0);if(date<=now)continue;
      result.push({key:`daily-check:${+date}:${packageIds.join(',')}`,date,body:'Bugün lens taktın mı?',kind:'daily-checkin',packageIds});
    }
  }
  for (const e of state.auxiliary.filter(e => !e.completed && state.modules[e.kind])) {
    for (const date of getNotificationDates(e.due, [0], state.settings.notificationTime, now)) result.push({ key: `${e.kind}:${e.id}:${+date}`, date, body: `${e.kind === 'case' ? 'Lens kabı' : 'Solüsyon'} değişim tarihin geldi. Ürün talimatını kontrol et.` });
  }
  return result;
}
