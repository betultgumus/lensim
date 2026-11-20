import test from 'node:test';
import assert from 'node:assert/strict';
import { assertRxValues, rxError, sanitizeRx } from '../src/domain/rx.ts';

test('typing and pasting keep only what a number can contain', () => {
  assert.deepEqual(sanitizeRx('SPH', '-2,25'), { value: '-2.25', removed: false });
  assert.deepEqual(sanitizeRx('SPH', 'abc-2.5x'), { value: '2.5', removed: true }, 'a sign after letters is not a leading sign');
  assert.deepEqual(sanitizeRx('SPH', '−1.75'), { value: '-1.75', removed: false }, 'a typographic minus from a paste is accepted');
  assert.deepEqual(sanitizeRx('PWR', '+3.00'), { value: '+3.00', removed: false });
  assert.deepEqual(sanitizeRx('PWR', '1..5'), { value: '1.5', removed: true });
  assert.deepEqual(sanitizeRx('AXIS', '90.5'), { value: '905', removed: true }, 'AXIS takes whole numbers only');
  assert.deepEqual(sanitizeRx('AXIS', '-90'), { value: '90', removed: true });
  assert.deepEqual(sanitizeRx('BC', '-8.6'), { value: '8.6', removed: true });
});

test('values are checked against each field’s rule', () => {
  assert.equal(rxError('SPH', '-2.25'), null);
  assert.equal(rxError('SPH', '-'), null, 'unfinished input is not an error while typing');
  assert.match(rxError('SPH', '-', true)!, /bir sayı değil/);
  assert.match(rxError('SPH', '-35')!, /-30 ile \+30 arasında/);
  assert.equal(rxError('AXIS', '180'), null);
  assert.match(rxError('AXIS', '181')!, /0 ile 180 arasında tam bir sayı/);
  assert.match(rxError('DIA', '20')!, /12 ile 16/);
  assert.match(rxError('ADD', '-1')!, /0.25 ile 4/);
});

test('saving names the wrong field and eye instead of storing it', () => {
  assert.doesNotThrow(() => assertRxValues({ 'right-SPH': '-2.25', 'left-SPH': '-2.00', AXIS: '' }));
  assert.throws(() => assertRxValues({ 'left-AXIS': '200' }), /Sol göz · Eksen \(AXIS\).*tekrar kaydet/);
  assert.throws(() => assertRxValues({ SPH: 'abc' }), /“abc” bir sayı değil/);
});
