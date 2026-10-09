import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load, plain } from './load.mjs';

const { layout } = load().VTFlipdot;
const wrap = (text, width) => plain(layout.wrap(text, width));

test('normalize upper-cases, turns other characters into spaces and collapses runs', () => {
  assert.equal(layout.normalize('  it\'s  7:05 pm,\n ok '), 'IT S PM OK');
  assert.equal(layout.normalize(''), '');
});

test('wrap fills each line greedily and never exceeds the width', () => {
  assert.deepEqual(wrap('IT IS A QUARTER TO MIDNIGHT', 16), ['IT IS A QUARTER', 'TO MIDNIGHT']);
  assert.deepEqual(wrap('ONE TWO THREE', 7), ['ONE TWO', 'THREE']);
  assert.deepEqual(wrap('ABCDEFGHIJKLMNOP', 16), ['ABCDEFGHIJKLMNOP']);
});

test('a word that fits is never split', () => {
  assert.deepEqual(wrap('AAAAAAAAA BBBBBBBBB', 10), ['AAAAAAAAA', 'BBBBBBBBB']);
});

test('a word longer than the width is cut into width-sized pieces', () => {
  assert.deepEqual(wrap('SEVENTEENTH', 4), ['SEVE', 'NTEE', 'NTH']);
  assert.deepEqual(wrap('A SEVENTEENTH B', 4), ['A', 'SEVE', 'NTEE', 'NTH', 'B']);
});

test('empty text wraps to no lines', () => {
  assert.deepEqual(wrap('   ', 16), []);
});

test('the pangram wraps to three lines at 16', () => {
  assert.deepEqual(wrap('THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG', 16), [
    'THE QUICK BROWN',
    'FOX JUMPS OVER',
    'THE LAZY DOG',
  ]);
});
