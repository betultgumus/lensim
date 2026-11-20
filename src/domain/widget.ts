import { addDays, daysOpen, packageMascotLevel, trackingDay } from './dates.ts';
import type { AppState, DateOnly, Eye, LensPackage } from './types.ts';

/** Card look of the home-screen widget. `empty` = no open package (or no usable data). */
export type WidgetMood = 'fresh' | 'nearing' | 'overdue' | 'empty';
/**
 * Everything the native widget draws for one tracking day, already worded in Turkish. The native side
 * only picks the entry for the current day; it never recalculates lens rules, so the app and the widget
 * cannot disagree.
 */
export type WidgetView = {
  mood: WidgetMood;
  /** "Sol & Sağ", "Sol göz", "Sağ göz"; empty when there is no package. */
  side: string;
  /** Day of the use cycle (e.g. "7") and its total (e.g. "/30"). For daily lenses: worn days this month and "/ay". */
  count: string; total: string;
  /** Filled cells of the 10-cell progress bar; -1 hides the bar (daily lenses, empty state). */
  segments: number;
  /** Days the lens was actually worn: "5 gün taktın" (a different number from the cycle day). */
  worn: string;
  /** "23 gün kaldı", "Bugün son gün", "Süre geçti!" or the empty-state message. */
  status: string;
  /** The other eye when right and left were opened separately ("Sağ · 12/30 · 18 gün kaldı"), or an empty-state hint. */
  other: string; otherShort: string;
  /** Screen-reader text for the whole card: states everything without relying on colour or the owl. */
  description: string;
  /** Today's saved shared answer, if any; used by the 2×3 action widget. */
  todayAnswer: 'worn' | 'notWorn' | 'glasses' | null;
  /** Deep link opened by a tap: always the home screen with the lens case. */
  link: string;
};
export type WidgetSnapshot = { version: 1; days: Record<DateOnly, WidgetView> };

/** Days precomputed ahead, so the widget keeps counting while the app stays closed. */
export const WIDGET_DAYS_AHEAD = 62;
/** A widget tap opens the home screen on the lens case (app/index.tsx passes `page` on to the home tab). */
export const HOME_LINK = 'lenstakip:///?page=today';
const BAR_CELLS = 10;
const moods = { 1: 'fresh', 2: 'nearing', 3: 'overdue' } as const;
const moodText: Record<WidgetMood, string> = { fresh: 'Lensler yeni.', nearing: 'Değişim yaklaşıyor.', overdue: 'Değişim zamanı geçti.', empty: '' };
const eyeName = (eye: Eye) => eye === 'right' ? 'Sağ' : 'Sol';

type Row = { side: string; short: string; count: string; total: string; segments: number; worn: string; status: string; level: 1 | 2 | 3; remaining: number; spoken: string };

function row(state: AppState, packs: LensPackage[], side: string, day: DateOnly): Row | null {
  const first = packs[0]; if (!first) return null;
  const box = state.boxes.find(b => b.id === first.boxId);
  const duration = first.durationDaysSnapshot ?? box?.durationDays;
  if (!duration || !Number.isInteger(duration) || duration < 1) return null;
  if (duration === 1) {
    // Daily lenses: same numbers as the home screen's lens case (worn days this month, lenses left in the box).
    const month = new Set(state.checkIns.filter(c => c.status === 'worn' && c.date.slice(0, 7) === day.slice(0, 7) && c.date <= day).map(c => c.date)).size;
    const left = box ? `Kutuda ${box.lensesRemaining} lens` : 'Günlük lens';
    return { side, short: `${side} · ${month}/ay`, count: String(month), total: '/ay', segments: -1, worn: `${month} gün taktın`, status: left, level: 1, remaining: Infinity, spoken: `${side} günlük lens: bu ay ${month} gün taktın. ${left}.` };
  }
  const elapsed = daysOpen(first.openedOn, day); const remaining = duration - elapsed;
  const ids = new Set(packs.map(p => p.id));
  const worn = new Set(state.checkIns.filter(c => ids.has(c.packageId) && c.status === 'worn' && c.date >= first.openedOn && c.date <= day).map(c => c.date)).size;
  const level = packageMascotLevel(duration, elapsed);
  const status = remaining < 0 ? 'Süre geçti!' : remaining === 0 ? 'Bugün son gün' : `${remaining} gün kaldı`;
  const segments = remaining < 0 ? BAR_CELLS : Math.min(BAR_CELLS, Math.ceil((elapsed / duration) * BAR_CELLS));
  const spokenStatus = remaining < 0 ? `Süre ${-remaining} gün geçti` : status;
  return { side, short: `${side} · ${elapsed}/${duration}`, count: String(elapsed), total: `/${duration}`, segments, worn: `${worn} gün taktın`, status, level, remaining, spoken: `${side}: ${duration} günlük kullanımın ${elapsed}. günü, ${worn} gün taktın, ${spokenStatus}.` };
}

const emptyView = (): WidgetView => ({ mood: 'empty', side: '', count: '', total: '', segments: -1, worn: '', status: 'Açık lens paketin yok', other: 'Dokun, ilk paketini ekle', otherShort: 'Dokun, paket ekle', description: 'Lensim. Açık lens paketin yok. Dokunarak uygulamada paket ekleyebilirsin.', todayAnswer: null, link: HOME_LINK });

/**
 * Widget content for one tracking day. Uses the same package pairing as the home screen: right and left
 * opened the same day with the same duration share one counter ("Sol & Sağ"); otherwise each eye keeps its
 * own numbers, the more urgent one is shown large and the other one on its own line.
 */
export function widgetView(state: AppState, day: DateOnly): WidgetView {
  const active = state.packages.filter(p => !p.closedOn && p.openedOn <= day);
  const right = active.find(p => p.eye === 'right'); const left = active.find(p => p.eye === 'left');
  const durationOf = (p: LensPackage) => p.durationDaysSnapshot ?? state.boxes.find(b => b.id === p.boxId)?.durationDays;
  const shared = !!left && !!right && left.openedOn === right.openedOn && durationOf(left) === durationOf(right);
  const rows = (shared ? [row(state, [left!, right!], 'Sol & Sağ', day)] : [left && row(state, [left], `${eyeName('left')} göz`, day), right && row(state, [right], `${eyeName('right')} göz`, day)])
    .filter((r): r is Row => !!r)
    .sort((a, b) => b.level - a.level || a.remaining - b.remaining);
  const [main, second] = rows;
  if (!main) return emptyView();
  const mood = moods[Math.max(main.level, second?.level ?? 1) as 1 | 2 | 3];
  return {
    mood, side: main.side, count: main.count, total: main.total, segments: main.segments, worn: main.worn, status: main.status,
    other: second ? `${second.short} · ${second.status}` : '', otherShort: second?.short ?? '',
    description: ['Lensim.', main.spoken, second?.spoken, moodText[mood]].filter(Boolean).join(' '),
    todayAnswer: state.dailyStatuses.find(entry => entry.date === day)?.status ?? null,
    link: HOME_LINK,
  };
}

/** Data handed to the native widget: only counters and Turkish labels, never brands, powers, notes or history. */
export function widgetSnapshot(state: AppState, now = new Date(), days = WIDGET_DAYS_AHEAD): WidgetSnapshot {
  const start = trackingDay(now); const result: WidgetSnapshot = { version: 1, days: {} };
  for (let i = 0; i < days; i++) { const day = addDays(start, i); result.days[day] = state.onboarded ? widgetView(state, day) : emptyView(); }
  return result;
}
