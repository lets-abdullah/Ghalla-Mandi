import test from 'node:test';
import assert from 'node:assert/strict';
import { convertToKg, convertFromKg } from '../src/services/unitConversion.service.js';

test('Unit Conversion Service - Standard Mandi Units', async (t) => {
  await t.test('1 KG = 1 KG', () => {
    assert.equal(convertToKg(1, 'KG'), 1);
    assert.equal(convertFromKg(1, 'KG'), 1);
  });

  await t.test('1 Mann (Maund) = 40 KG', () => {
    assert.equal(convertToKg(1, 'Mann (Maund)'), 40);
    assert.equal(convertToKg(2.5, 'Mann'), 100);
    assert.equal(convertFromKg(80, 'Mann'), 2);
  });

  await t.test('1 Bag (Bori) = 50 KG', () => {
    assert.equal(convertToKg(1, 'Bag (Bora)'), 50);
    assert.equal(convertToKg(10, 'Bori'), 500);
    assert.equal(convertFromKg(250, 'Bag'), 5);
  });

  await t.test('1 Ton = 1,000 KG', () => {
    assert.equal(convertToKg(1, 'Ton'), 1000);
    assert.equal(convertToKg(3.5, 'Ton'), 3500);
    assert.equal(convertFromKg(5000, 'Ton'), 5);
  });

  await t.test('1 Quintal = 100 KG', () => {
    assert.equal(convertToKg(1, 'Quintal'), 100);
    assert.equal(convertFromKg(300, 'Quintal'), 3);
  });
});
