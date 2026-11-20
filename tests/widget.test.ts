import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, type AppState } from '../src/domain/types.ts';
import { transition } from '../src/domain/reducer.ts';
import { addDays } from '../src/domain/dates.ts';
import { widgetSnapshot, widgetView } from '../src/domain/widget.ts';

const today = '2026-11-16';
const box = (id: string, durationDays: number, count = 6) => ({ id, name: id, brand: 'Marka', lensType: 'spherical' as const, durationDays, lensesTotal: count, lensesRemaining: count, eyes: ['right', 'left'] as ('right' | 'left')[], prescription: { right: { sph: '-2.00' } } });
const pair = (date = '2026-11-01', duration = 30) => transition(defaultState(), { type: 'openPackages', ids: ['r1', 'l1'], newBox: box('b', duration), eyes: ['right', 'left'], date, pairId: 'p1' }, today);
const wear = (state: AppState, dates: string[], packageId = 'r1') => dates.reduce((s, date, i) => transition(s, { type: 'checkIn', id: `w${packageId}${i}`, packageId, date, status: 'worn' }, today), state);

test('shared right and left package: cycle day, worn days and remaining are separate numbers', () => {
  const state = wear(pair(), ['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-05', '2026-11-07']);
  const view = widgetView(state, '2026-11-07');
  assert.equal(view.side, 'Sol & Sağ');
  assert.equal(`${view.count}${view.total}`, '7/30');
  assert.equal(view.worn, '5 gün taktın');
  assert.equal(view.status, '23 gün kaldı');
  assert.equal(view.mood, 'fresh');
  assert.equal(view.segments, 3);
  assert.equal(view.other, '');
  assert.equal(view.link, 'lenstakip:///?page=today');
});

test('the widget worn-day line is derived from worn check-ins, not elapsed package days', () => {
  const state = wear(pair('2026-10-17'), ['2026-10-17', '2026-10-19', '2026-10-21']);
  const view = widgetView(state, today);
  assert.equal(`${view.count}${view.total}`, '31/30');
  assert.equal(view.worn, '3 gün taktın');
  assert.equal(view.status, 'Süre geçti!');
  assert.match(view.description, /3 gün taktın/);
});

test('the three looks follow the shared owl thresholds', () => {
  const state = pair();
  const at = (n: number) => widgetView(state, addDays('2026-11-01', n - 1));
  assert.equal(at(19).mood, 'fresh');
  assert.deepEqual([at(27).mood, at(27).status, at(27).segments], ['nearing', '3 gün kaldı', 9]);
  assert.deepEqual([at(30).mood, at(30).status], ['nearing', 'Bugün son gün']);
  const late = at(32);
  assert.deepEqual([late.mood, `${late.count}${late.total}`, late.status, late.segments], ['overdue', '32/30', 'Süre geçti!', 10]);
  assert.match(late.description, /Süre 2 gün geçti/);
});

test('eyes opened on different days keep their own numbers; the more urgent one is shown large', () => {
  let state = transition(defaultState(), { type: 'openPackages', ids: ['r1'], newBox: box('b', 30), eyes: ['right'], date: '2026-10-20' }, '2026-10-20');
  state = transition(state, { type: 'openPackages', ids: ['l1'], boxId: 'b', eyes: ['left'], date: '2026-11-10' }, today);
  state = wear(state, ['2026-11-10', '2026-11-11'], 'l1');
  const view = widgetView(state, today);
  assert.equal(view.side, 'Sağ göz');
  assert.equal(`${view.count}${view.total}`, '28/30');
  assert.equal(view.mood, 'nearing');
  assert.equal(view.other, 'Sol göz · 7/30 · 23 gün kaldı');
  assert.equal(view.otherShort, 'Sol göz · 7/30');
  assert.match(view.description, /Sağ göz: 30 günlük kullanımın 28\. günü/);
  assert.match(view.description, /Sol göz: 30 günlük kullanımın 7\. günü, 2 gün taktın/);
});

test('daily lenses show worn days this month and lenses left, without a cycle bar', () => {
  const state = wear(pair('2026-11-10', 1), ['2026-11-10', '2026-11-12']);
  const view = widgetView(state, today);
  assert.deepEqual([view.count, view.total, view.segments, view.mood], ['2', '/ay', -1, 'fresh']);
  assert.match(view.status, /^Kutuda \d+ lens$/);
});

test('missing or broken data gives the empty card instead of failing', () => {
  assert.equal(widgetView(defaultState(), today).mood, 'empty');
  const broken = pair(); broken.boxes = []; broken.packages[0]!.durationDaysSnapshot = undefined; broken.packages[1]!.durationDaysSnapshot = undefined;
  assert.equal(widgetView(broken, today).mood, 'empty');
  assert.equal(widgetView(pair(), '2026-10-31').mood, 'empty');
});

test('snapshot starts on the tracking day (02.00 rollover) and covers the coming days', () => {
  const snapshot = widgetSnapshot(pair(), new Date(2026, 10, 16, 1, 30));
  const days = Object.keys(snapshot.days);
  assert.equal(days[0], '2026-11-15');
  assert.equal(days.length, 62);
  assert.equal(snapshot.days['2026-12-02']!.mood, 'overdue');
  const json = JSON.stringify(snapshot);
  assert.ok(!json.includes('Marka') && !json.includes('-2.00'));
});
