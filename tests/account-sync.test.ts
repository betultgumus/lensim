import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/domain/types.ts';
import { transition } from '../src/domain/reducer.ts';
import { mergeAccountStates } from '../src/services/accountMerge.ts';

const today = '2026-11-20';
function stateWithBox(id: string, eye: 'right' | 'left') {
  const box = { id: `box-${id}`, name: 'Aylık lens', brand: 'Marka', lensType: 'spherical' as const, durationDays: 30, lensesTotal: 6, lensesRemaining: 6, eyes: [eye], prescription: {} };
  return transition(defaultState(), { type: 'openPackages', ids: [`pack-${id}`], newBox: box, eyes: [eye], date: today }, today);
}

test('guest boxes keep both histories when a new account receives them', () => {
  const local = stateWithBox('local', 'right');
  const cloud = defaultState();
  const merged = mergeAccountStates(local, cloud).state;
  assert.equal(merged.packages.length, 1);
  assert.equal(merged.boxes.length, 1);
  assert.equal(merged.packages[0]?.boxId, 'box-local');
});

test('cloud and guest data with duplicate box names keep distinct names and box links', () => {
  const local = stateWithBox('local', 'right');
  const cloud = stateWithBox('cloud', 'left');
  const merged = mergeAccountStates(local, cloud).state;
  assert.equal(merged.packages.length, 2);
  assert.equal(merged.boxes.length, 2);
  assert.deepEqual(new Set(merged.boxes.map(box => box.name)), new Set(['Aylık lens', 'Aylık lens (2)']));
  assert.ok(merged.packages.every(pack => merged.boxes.some(box => box.id === pack.boxId)));
});

test('repeating the same account merge does not duplicate records', () => {
  const local = stateWithBox('local', 'right');
  const cloud = stateWithBox('cloud', 'left');
  const once = mergeAccountStates(local, cloud).state;
  const twice = mergeAccountStates(once, once).state;
  assert.equal(twice.boxes.length, once.boxes.length);
  assert.equal(twice.packages.length, once.packages.length);
});

test('a duplicate lens-box name is rejected when adding a second physical box', () => {
  const state = stateWithBox('existing', 'right');
  const duplicate = { id: 'another-box', name: '  Aylık lens  ', brand: 'Other', lensType: 'spherical' as const, durationDays: 30, lensesTotal: 6, lensesRemaining: 6, eyes: ['left'] as ('left')[], prescription: {} };
  assert.throws(() => transition(state, { type: 'addBox', box: duplicate }, today), /farklı bir isim/);
});
