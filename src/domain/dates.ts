import type { DateOnly, Plan, Cycle, LensStatus } from './types.ts';

/** Date-only values are parsed into local calendar components, never UTC timestamps. */
export function parseDate(value: DateOnly): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Tarih anlaşılmadı. GG.AA.YYYY biçiminde geçerli bir tarih gir.');
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const result = new Date(year, month - 1, day, 12);
  if (year < 1900 || year > 2200 || result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) throw new Error('Geçerli bir tarih gir.');
  return result;
}
export function dateOnly(date: Date = new Date()): DateOnly {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
/** Formats date digits entered by a user as Turkish day.month.year. */
export function maskTurkishDateInput(value:string):string {
  const digits=value.replace(/\D/g,'').slice(0,8);
  return digits.length<=2?digits:digits.length<=4?`${digits.slice(0,2)}.${digits.slice(2)}`:`${digits.slice(0,2)}.${digits.slice(2,4)}.${digits.slice(4)}`;
}
/** Returns an ISO date for a complete valid GG.AA.YYYY value, otherwise null. */
export function parseTurkishDateInput(value:string):DateOnly|null {
  if(!/^\d{2}\.\d{2}\.\d{4}$/.test(value))return null;
  const [day,month,year]=value.split('.');const iso=`${year}-${month}-${day}`;
  try{parseDate(iso);return iso;}catch{return null;}
}
/** The user's tracking day rolls over at 02:00 local time. */
export function trackingDay(date = new Date(), cutoffHour = 2): DateOnly {
  const value = new Date(date);
  if (value.getHours() < cutoffHour) value.setDate(value.getDate() - 1);
  return dateOnly(value);
}
export function addDays(date: DateOnly, amount: number): DateOnly {
  const value = parseDate(date); value.setDate(value.getDate() + amount); return dateOnly(value);
}
/** User-entered lens events may be backdated by at most thirty calendar days. */
export function isWithinEntryWindow(value: DateOnly, today = dateOnly(), maxDaysBack = 30): boolean {
  parseDate(value); parseDate(today);
  return value <= today && value >= addDays(today, -maxDaysBack);
}
/** Lens durations offered in forms. Any other value is a custom duration. */
/** Offered in forms next to “Özel”. Packages saved earlier with other durations (e.g. 90 days) keep them and show as custom. */
export const DURATION_OPTIONS:ReadonlyArray<readonly [number,string]>=[[1,'Günlük'],[15,'15 günlük'],[30,'Aylık']];
export const isPresetDuration=(days:number)=>DURATION_OPTIONS.some(([n])=>n===days);
export function durationLabel(days:number){return days===1?'Günlük':days===15?'15 günlük':days===30?'Aylık':days===90?'3 aylık':`${days} gün`;}
/** Short Turkish date, e.g. "16 Kas". */
export function shortDate(value:DateOnly){return parseDate(value).toLocaleDateString('tr-TR',{day:'numeric',month:'short'});}
/** Package day number: the opening day is day 1 (never below 1). Shared by the home screen, cycle screen and widget. */
export const daysOpen=(start:DateOnly,today:DateOnly)=>Math.max(1,getDaysRemaining(today,start)+1);
/**
 * Owl reaction for a package, used by the home screen and the home-screen widget. Monthly: 20 and 30 days.
 * 15-day: the same proportions (10 and 15 days). Any other multi-day package shows the overdue owl once its
 * duration has passed and otherwise keeps the calm owl. Daily lenses always keep the calm owl.
 */
export function packageMascotLevel(durationDays:number,elapsedDays:number):1|2|3 {
  if(durationDays===30)return monthlyMascotLevel(elapsedDays);
  if(durationDays===15)return elapsedDays>15?3:elapsedDays>=10?2:1;
  return durationDays>1&&elapsedDays>durationDays?3:1;
}
/** Mascot reaction thresholds for the monthly package card; this is a visual alert only. */
export function monthlyMascotLevel(elapsedDays:number):1|2|3 {
  return elapsedDays>30?3:elapsedDays>=20?2:1;
}
/** Clamp calendar-month addition to the last day of the destination month. */
export function addMonths(date: DateOnly, amount: number): DateOnly {
  const value = parseDate(date); const day = value.getDate();
  value.setDate(1); value.setMonth(value.getMonth() + amount);
  const last = new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
  value.setDate(Math.min(day, last)); return dateOnly(value);
}
/** UTC is used only to subtract calendar ordinals, avoiding 23/25-hour DST days. */
export function getDaysRemaining(due: DateOnly, today = dateOnly()): number {
  const ordinal = (s: string) => { const d = parseDate(s); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000; };
  return ordinal(due) - ordinal(today);
}
export function validatePlan(plan: Plan) {
  if (!['daily','fortnight','monthly','custom'].includes(plan.kind) || !['days','weeks','months'].includes(plan.unit) || !Number.isInteger(plan.interval) || plan.interval < 1 || plan.interval > 365) throw new Error('Geçerli bir değişim aralığı gir (1–365).');
}
/** Daily disposable use ends the same day; completion never auto-opens a new pair. */
export function getNextReplacementDate(start: DateOnly, plan: Plan): DateOnly {
  parseDate(start); validatePlan(plan);
  if (plan.kind === 'daily') return start;
  if (plan.kind === 'fortnight') return addDays(start, 14);
  if (plan.unit === 'months') return addMonths(start, plan.interval);
  return addDays(start, plan.interval * (plan.unit === 'weeks' ? 7 : 1));
}
export function getCycleProgress(cycle: Cycle, today = dateOnly()): number {
  const total = getDaysRemaining(cycle.due, cycle.start);
  return total === 0 ? (today < cycle.start ? 0 : 1) : Math.max(0, Math.min(1, getDaysRemaining(today, cycle.start) / total));
}
export function getLensStatus(cycle: Cycle, today = dateOnly()): LensStatus {
  if (today < cycle.start) return 'future';
  const days = getDaysRemaining(cycle.due, today);
  if (days < 0) return 'overdue';
  if (cycle.plan.kind === 'daily') return 'daily';
  if (days === 0) return 'due';
  if (days === 1) return 'tomorrow';
  return days <= 3 ? 'soon' : 'normal';
}
export function formatDate(value: DateOnly, short = false) {
  return parseDate(value).toLocaleDateString('tr-TR', { day: 'numeric', month: short ? 'short' : 'long', ...(short ? {} : { year: 'numeric' }) });
}
export function planLabel(plan: Plan): string {
  if (plan.kind === 'daily') return 'Günlük tek kullanımlık';
  if (plan.kind === 'fortnight') return '14 günlük';
  if (plan.kind === 'monthly') return plan.unit === 'months' ? 'Aylık · takvim ayı' : 'Aylık · 30 gün';
  return `${plan.interval} ${ { days: 'gün', weeks: 'hafta', months: 'ay' }[plan.unit] }`;
}
/** Reads 2130, 21.30, 21:30 or 9:05 as a valid SS:DD time; returns null when it is not a real time. */
export function normalizeTimeInput(raw: string): string | null {
  const trimmed = raw.trim(); const digits = trimmed.replace(/\D/g, '');
  const parts = /^(\d{1,2})[:.](\d{2})$/.exec(trimmed);
  const candidate = parts ? `${parts[1]!.padStart(2, '0')}:${parts[2]}` : digits.length === 3 ? `0${digits[0]}:${digits.slice(1)}` : digits.length === 4 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : '';
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : null;
}
export function timeParts(time: string): [number, number] {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Saati SS:DD biçiminde gir (ör. 09:00).');
  return time.split(':').map(Number) as [number, number];
}
export function getNotificationDates(due: DateOnly, offsets: number[], time: string, now = new Date()): Date[] {
  const [hour, minute] = timeParts(time);
  return [...new Set(offsets)].filter(n => n >= 0 && Number.isInteger(n)).map(offset => {
    const date = parseDate(addDays(due, -offset)); date.setHours(hour, minute, 0, 0); return date;
  }).filter(date => date > now).sort((a, b) => +a - +b);
}
