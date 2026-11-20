import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INITIAL_SCHEMA } from '../src/data/schema.ts';
import { defaultState, type LensBox } from '../src/domain/types.ts';
import { missingAutoDays, transition, unansweredDays, validateState } from '../src/domain/reducer.ts';
import { notificationPlan, NIGHT_REMINDER_BODY } from '../src/domain/effects.ts';
import { friendlyError, isDatabaseBusy } from '../src/domain/errors.ts';
import { DURATION_OPTIONS } from '../src/domain/dates.ts';

const today = '2026-11-18';
const box = (durationDays = 30): LensBox => ({ id: 'box', name: '1.5 numara mavi kap', brand: '', lensType: 'spherical', durationDays, lensesTotal: 6, lensesRemaining: 6, eyes: ['right', 'left'], prescription: {} });
const open = (date: string, createdOn = today) => transition(defaultState(), { type: 'openPackages', ids: ['r', 'l'], newBox: box(), eyes: ['right', 'left'], date, pairId: 'p' }, createdOn);
const worn = (s: ReturnType<typeof open>) => new Set(s.checkIns.filter(c => c.status === 'worn').map(c => c.date)).size;

test('root cause: a second connection writing during an exclusive transaction fails with "database is locked"', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lens-lock-')); const path = join(dir, 'lock.db');
  const a = new DatabaseSync(path); const b = new DatabaseSync(path);
  try {
    a.exec('PRAGMA journal_mode = WAL;'); a.exec(INITIAL_SCHEMA);
    b.exec('PRAGMA busy_timeout = 0;');
    a.exec('BEGIN EXCLUSIVE'); a.prepare("INSERT INTO scheduled_notifications VALUES ('x','x')").run();
    let caught: unknown; try { b.prepare("INSERT INTO scheduled_notifications VALUES ('y','y')").run(); } catch (e) { caught = e; }
    a.exec('COMMIT');
    assert.ok(caught, 'second writer must be rejected while the first holds the lock');
    assert.ok(isDatabaseBusy(caught));
    // Taking turns (what the app queue now does) succeeds.
    b.prepare("INSERT INTO scheduled_notifications VALUES ('y','y')").run();
  } finally { a.close(); b.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('database writes go through one connection and one queue (no second exclusive connection)', () => {
  const source = readFileSync(new URL('../src/data/database.ts', import.meta.url), 'utf8');
  assert.ok(!source.includes('withExclusiveTransactionAsync('));
  assert.match(source, /busy_timeout/);
  for (const fn of ['loadState', 'saveState', 'rememberNotification', 'clearNotificationRecords']) assert.match(source, new RegExp(`export function ${fn}[^]*?serial\\(`));
});

test('raw SQLite errors become Turkish messages that say data is safe and what to do', () => {
  const save = friendlyError(new Error('Call to function NativeStatement.finalizeAsync has been rejected. Caused by: Error code 5: database is locked'));
  assert.equal(save.title, 'Kaydedilemedi'); assert.doesNotMatch(save.message, /Error code|database/); assert.match(save.message, /korunuyor/); assert.match(save.message, /tekrar dene/i);
  const load = friendlyError(new Error('Error code 5: database is locked'), 'load');
  assert.match(load.message, /silinmedi/); assert.match(load.message, /Yeniden dene/);
  assert.doesNotMatch(friendlyError(new Error('undefined is not an object')).message, /undefined/);
  assert.equal(friendlyError(new Error('Kutudaki lens sayısını kontrol et.')).message, 'Kutudaki lens sayısını kontrol et.');
});

test('an empty brand saves normally', () => {
  const s = open(today);
  assert.equal(s.boxes[0]!.brand, ''); assert.equal(s.packages.length, 2);
});

test('auto-fill is one transition and skips days before the package was added', () => {
  // Opened 4 days ago, added to Lensim today: those 4 days were never asked about.
  let s = open('2026-11-14');
  assert.deepEqual(missingAutoDays(s, today), []);
  assert.deepEqual(unansweredDays(s, today), ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17']);
  // Two days later the days after it was added are filled, in a single saved transition.
  const later = '2026-11-20'; const before = s.revision;
  s = transition(s, { type: 'autoFill', id: 'a' }, later);
  assert.equal(s.revision, before + 1);
  assert.deepEqual(s.dailyStatuses.filter(d => d.automatic).map(d => d.date), ['2026-11-18', '2026-11-19']);
  assert.equal(transition(s, { type: 'autoFill', id: 'b' }, later), s, 'nothing left to fill: no save');
});

test('older packages without createdOn keep filling from the opening day', () => {
  const s = open('2026-11-14'); for (const p of s.packages) delete p.createdOn;
  assert.deepEqual(missingAutoDays(validateState(JSON.parse(JSON.stringify(s))), today), ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17']);
});

test('switching the default to "Taktım" updates automatic days and counters, never manual answers', () => {
  let s = transition(open('2026-11-10', '2026-11-10'), { type: 'settings', patch: { defaultAnswer: 'notWorn' } }, today);
  s = transition(s, { type: 'autoFill', id: 'a' }, today);
  s = transition(s, { type: 'dailyStatus', id: 'm', date: '2026-11-12', status: 'glasses' }, today);
  assert.equal(worn(s), 0);
  s = transition(s, { type: 'settings', patch: { defaultAnswer: 'worn' } }, today);
  assert.equal(worn(s), 7, 'the 7 automatic days (10–17 Nov except the manual 12th) now count as worn');
  assert.equal(s.dailyStatuses.find(d => d.date === '2026-11-12')!.status, 'glasses');
  assert.ok(s.dailyStatuses.filter(d => d.date !== '2026-11-12').every(d => d.automatic && d.status === 'worn'));
  // And back again.
  s = transition(s, { type: 'settings', patch: { defaultAnswer: 'notWorn' } }, today);
  assert.equal(worn(s), 0);
});

test('night reminder and daily question are independent', () => {
  const now = new Date(2026, 10, 18, 12);
  let s = open(today);
  s = transition(s, { type: 'settings', patch: { nightReminder: true } }, today);
  let plan = notificationPlan(s, now);
  assert.ok(plan.length > 0 && plan.every(r => r.body === NIGHT_REMINDER_BODY));
  assert.equal(plan[0]!.date.getHours(), 23);
  assert.equal(s.settings.notifications, false);
  s = transition(s, { type: 'settings', patch: { notifications: true, nightReminder: false, notificationTime: '20:30' } }, today);
  plan = notificationPlan(s, now);
  assert.ok(!plan.some(r => r.body === NIGHT_REMINDER_BODY));
  assert.ok(plan.some(r => r.kind === 'daily-checkin' && r.date.getHours() === 20 && r.date.getMinutes() === 30));
  assert.equal(s.settings.nightReminderTime, '23:00');
  // A "Takmadım" answer removes that night's reminder.
  s = transition(s, { type: 'settings', patch: { nightReminder: true } }, today);
  s = transition(s, { type: 'dailyStatus', id: 'n', date: today, status: 'notWorn' }, today);
  assert.ok(!notificationPlan(s, now).some(r => r.body === NIGHT_REMINDER_BODY && r.date.getDate() === 18));
});

test('older saved data gains the night reminder settings without losing anything', () => {
  const s = open(today) as any; delete s.settings.nightReminder; delete s.settings.nightReminderTime;
  const loaded = validateState(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.settings.nightReminder, false); assert.equal(loaded.settings.nightReminderTime, '23:00'); assert.equal(loaded.packages.length, 2);
});

test('usage period offers Günlük, 15 günlük, Aylık (and Özel); no 3-month preset', () => {
  assert.deepEqual(DURATION_OPTIONS.map(([n]) => n), [1, 15, 30]);
});

test('reminder time input accepts common typings and rejects impossible times', async () => {
  const { normalizeTimeInput } = await import('../src/domain/dates.ts');
  assert.equal(normalizeTimeInput('2030'), '20:30'); assert.equal(normalizeTimeInput('8.15'), '08:15'); assert.equal(normalizeTimeInput('21:00'), '21:00');
  assert.equal(normalizeTimeInput('2560'), null); assert.equal(normalizeTimeInput('9'), null);
});

test('daily question time chosen at setup is the planned time; the night reminder keeps its own', () => {
  let s = transition(defaultState(), { type: 'settings', patch: { defaultAnswer: 'worn', notificationTime: '20:30' } }, today);
  s = transition(s, { type: 'openPackages', ids: ['r', 'l'], newBox: box(), eyes: ['right', 'left'], date: today, pairId: 'p' }, today);
  s = transition(s, { type: 'settings', patch: { notifications: true, nightReminder: true } }, today);
  const plan = notificationPlan(s, new Date(2026, 10, 18, 12));
  const daily = plan.filter(r => r.kind === 'daily-checkin'); const night = plan.filter(r => r.kind === 'night-remove');
  assert.ok(daily.length && daily.every(r => r.date.getHours() === 20 && r.date.getMinutes() === 30));
  assert.ok(night.length && night.every(r => r.date.getHours() === 23 && r.date.getMinutes() === 0));
});

test('changing the default "only from now on" keeps earlier automatic days and every manual day', () => {
  let s = transition(open('2026-11-10', '2026-11-10'), { type: 'settings', patch: { defaultAnswer: 'notWorn' } }, today);
  s = transition(s, { type: 'autoFill', id: 'a' }, today);
  s = transition(s, { type: 'dailyStatus', id: 'm', date: '2026-11-12', status: 'glasses' }, today);
  s = transition(s, { type: 'settings', patch: { defaultAnswer: 'worn' }, pastAutomatic: 'keep' }, today);
  assert.equal(s.settings.defaultAnswer, 'worn');
  assert.equal(worn(s), 0, 'earlier automatic days stay "Takmadım"');
  assert.equal(s.dailyStatuses.find(d => d.date === '2026-11-12')!.status, 'glasses');
  // The next unanswered day is filled with the new default.
  s = transition(s, { type: 'autoFill', id: 'b' }, '2026-11-19');
  assert.equal(s.dailyStatuses.find(d => d.date === '2026-11-18')!.status, 'worn');
  assert.equal(s.dailyStatuses.find(d => d.date === '2026-11-11')!.status, 'notWorn');
});
