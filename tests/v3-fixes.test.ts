import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/domain/types.ts';
import { transition } from '../src/domain/reducer.ts';
import { daysOpen } from '../src/domain/dates.ts';
import { widgetView } from '../src/domain/widget.ts';

const today = '2026-11-16';
const box = (id: string, eyes: ('right' | 'left')[] = ['right', 'left'], count = 6) => ({ id, name: id, brand: '', lensType: 'spherical' as const, durationDays: 30, lensesTotal: count, lensesRemaining: count, eyes, prescription: {} });
const pair = () => transition(defaultState(), { type: 'openPackages', ids: ['r1', 'l1'], newBox: box('b'), eyes: ['right', 'left'], date: '2026-11-10', pairId: 'p' }, today);

test('"Taktım" before the opening, keeping the opening date: only that day changes', () => {
  const state = transition(pair(), { type: 'dailyStatus', id: 'd', date: '2026-11-08', status: 'worn', keepOpening: true }, today);
  assert.deepEqual(state.packages.map(p => p.openedOn), ['2026-11-10', '2026-11-10']);
  assert.equal(state.dailyStatuses.find(d => d.date === '2026-11-08')?.status, 'worn');
  assert.equal(state.checkIns.some(c => c.date === '2026-11-08'), false);
  assert.equal(daysOpen(state.packages[0]!.openedOn, today), 7);
  // A later recalculation (e.g. another day's change) keeps that manual day.
  const next = transition(state, { type: 'dailyStatus', id: 'e', date: '2026-11-11', status: 'notWorn' }, today);
  assert.equal(next.dailyStatuses.find(d => d.date === '2026-11-08')?.status, 'worn');
});

test('"Taktım" before the opening, moving the opening date: counters follow', () => {
  const state = transition(pair(), { type: 'dailyStatus', id: 'd', date: '2026-11-08', status: 'worn', moveOpening: true }, today);
  assert.deepEqual(state.packages.map(p => p.openedOn), ['2026-11-08', '2026-11-08']);
  assert.equal(daysOpen(state.packages[0]!.openedOn, today), 9);
  assert.equal(`${widgetView(state, today).count}${widgetView(state, today).total}`, '9/30');
  assert.equal(state.checkIns.filter(c => c.date === '2026-11-08' && c.status === 'worn').length, 2);
});

test('without a choice a day before every package still cannot be "worn"', () => {
  assert.throws(() => transition(pair(), { type: 'dailyStatus', id: 'd', date: '2026-11-08', status: 'worn' }, today));
});

test('"Her göze ayrı": a box made for one eye cannot be transferred to the other eye', () => {
  let state = transition(defaultState(), { type: 'addBox', box: box('rightOnly', ['right']) }, today);
  state = transition(state, { type: 'addBox', box: box('shared') }, today);
  assert.throws(() => transition(state, { type: 'openPackages', ids: ['r', 'l'], boxes: [{ boxId: 'shared' }, { boxId: 'rightOnly' }], eyes: ['right', 'left'], date: today }, today));
  assert.deepEqual(state.boxes.find(b => b.id === 'rightOnly')!.eyes, ['right']);
  assert.equal(state.boxes.find(b => b.id === 'rightOnly')!.lensesRemaining, 6);
  assert.equal(state.boxes.find(b => b.id === 'shared')!.lensesRemaining, 6);
});

test('"Tek kutu" still requires a box made for both eyes', () => {
  const state = transition(defaultState(), { type: 'addBox', box: box('rightOnly', ['right']) }, today);
  assert.throws(() => transition(state, { type: 'openPackages', ids: ['r', 'l'], boxId: 'rightOnly', eyes: ['right', 'left'], date: today }, today));
});
