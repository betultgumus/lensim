import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/domain/types.ts';
import { transition, validateState } from '../src/domain/reducer.ts';
import { notificationPlan } from '../src/domain/effects.ts';

const today = '2026-11-16';
const now = new Date(2026, 10, 16, 8, 0);
const setup = () => {
  let s = transition(defaultState(), { type: 'openPackages', ids: ['r', 'l'], newBox: { id: 'b', name: 'b', brand: '', lensType: 'spherical', durationDays: 30, lensesTotal: 6, lensesRemaining: 6, eyes: ['right', 'left'], prescription: {} }, eyes: ['right', 'left'], date: today }, today);
  s = transition(s, { type: 'settings', patch: { notifications: true, nightReminder: true } }, today);
  return s;
};
const times = (s: ReturnType<typeof setup>, kind: string) => [...new Set(notificationPlan(s, now).filter(r => r.kind === kind).map(r => `${r.date.getHours()}:${r.date.getMinutes()}`))];

test('changing one reminder time moves only that reminder', () => {
  const s = transition(setup(), { type: 'settings', patch: { nightReminderTime: '22:45' } }, today);
  assert.equal(s.settings.notificationTime, '21:00');
  assert.deepEqual(times(s, 'night-remove'), ['22:45']);
  assert.deepEqual(times(s, 'daily-checkin'), ['21:0']);
  const d = transition(s, { type: 'settings', patch: { notificationTime: '08:30' } }, today);
  assert.deepEqual([d.settings.notificationTime, d.settings.nightReminderTime], ['08:30', '22:45']);
  assert.deepEqual(times(d, 'daily-checkin'), ['8:30']);
  assert.deepEqual(times(d, 'night-remove'), ['22:45']);
});

test('a reminder that is off keeps its on/off state when its time changes, and the time survives a reload', () => {
  let s = transition(setup(), { type: 'settings', patch: { nightReminder: false } }, today);
  s = transition(s, { type: 'settings', patch: { nightReminderTime: '23:30' } }, today);
  assert.equal(s.settings.nightReminder, false);
  assert.equal(s.settings.notifications, true);
  assert.deepEqual(times(s, 'night-remove'), []);
  const reloaded = validateState(JSON.parse(JSON.stringify(s)));
  assert.equal(reloaded.settings.nightReminderTime, '23:30');
  assert.deepEqual(times(transition(reloaded, { type: 'settings', patch: { nightReminder: true } }, today), 'night-remove'), ['23:30']);
});

test('a change warning at question time is folded into the daily question (one notification, with answer buttons)', () => {
  const plan = notificationPlan(setup(), now);
  // 30-day package opened today: last day 2026-12-15, warnings 3 and 1 days before and on the day, all at 21:00.
  const warningDay = plan.find(r => r.kind === 'daily-checkin' && r.date.getMonth() === 11 && r.date.getDate() === 12)!;
  assert.match(warningDay.body, /lensinin 3 günü kaldı\..*Bugün lens taktın mı\?$/);
  assert.ok(!plan.some(r => r.key.startsWith('package:') && +r.date === +warningDay.date));
  const plainDay = plan.find(r => r.kind === 'daily-checkin' && r.date.getDate() === 20)!;
  assert.equal(plainDay.body, 'Bugün lens taktın mı?');
});
