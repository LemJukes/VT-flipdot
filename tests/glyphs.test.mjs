import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from './load.mjs';

const { glyphs } = load().VTFlipdot;
const keys = Object.keys(glyphs);

test('27 glyphs: space and A-Z', () => {
  assert.deepEqual(keys.sort(), [' ', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].sort());
});

test('each glyph is exactly 7 rows of 5 dots, # or .', () => {
  for (const [key, art] of Object.entries(glyphs)) {
    assert.equal(art.length, 7, `${JSON.stringify(key)} rows`);
    for (const row of art) assert.match(row, /^[#.]{5}$/, `${JSON.stringify(key)} row ${row}`);
  }
});

test('space is blank and no letter is', () => {
  const lit = (art) => art.join('').includes('#');
  assert.equal(lit(glyphs[' ']), false);
  for (const key of keys.filter((k) => k !== ' ')) assert.ok(lit(glyphs[key]), `${key} is blank`);
});

test('no two glyphs are identical', () => {
  const seen = new Map();
  for (const [key, art] of Object.entries(glyphs)) {
    const shape = art.join('/');
    assert.ok(!seen.has(shape), `${JSON.stringify(key)} duplicates ${JSON.stringify(seen.get(shape))}`);
    seen.set(shape, key);
  }
});

test('the table is frozen', () => {
  assert.ok(Object.isFrozen(glyphs));
});
