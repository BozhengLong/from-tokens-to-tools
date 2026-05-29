import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDiscount } from './cart.js';

test('100% off -> free', () => {
  assert.equal(applyDiscount(50, 100), 0);
});

test('caps an over-100% discount at free (never negative)', () => {
  assert.equal(applyDiscount(50, 130), 0); // FAILS until applyDiscount clamps
});

test('50% off', () => {
  assert.equal(applyDiscount(50, 50), 25);
});
