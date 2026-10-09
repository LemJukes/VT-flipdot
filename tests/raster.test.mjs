import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load, plain } from './load.mjs';

const { Verbatempus, VTFlipdot } = load();
const { raster } = VTFlipdot;
const glyph = (key) => plain(VTFlipdot.glyphs[key]);
const LEVELS = ['verbose', 'lengthy', 'short', 'terse'];

// RangeError thrown inside the vm context is not instanceof the test's RangeError.
const RANGE_ERROR = { name: 'RangeError' };

const dot = (frame, column, row) => frame.dots[row * frame.columns + column];

// The 5 x 7 block at (left, top) as string art.
const block = (frame, left, top) =>
  Array.from({ length: 7 }, (_, y) =>
    Array.from({ length: 5 }, (_, x) => (dot(frame, left + x, top + y) ? '#' : '.')).join(''));

test('board size follows the spec formulas: 6W + 1 columns, 8L + 1 rows', () => {
  const expected = {
    verbose: { columns: 97, rows: 73, lines: 9 },
    lengthy: { columns: 97, rows: 49, lines: 6 },
    short: { columns: 97, rows: 41, lines: 5 },
    terse: { columns: 97, rows: 25, lines: 3 },
  };
  for (const level of LEVELS) {
    assert.deepEqual(plain(raster.size(level)), expected[level], level);
    const frame = raster.render([], level);
    assert.equal(frame.dots.length, expected[level].columns * expected[level].rows);
  }
});

test('element counts per level: 7081 / 4753 / 3977 / 2425', () => {
  assert.deepEqual(LEVELS.map((level) => raster.render([], level).dots.length), [7081, 4753, 3977, 2425]);
});

test('an unknown level throws', () => {
  assert.throws(() => raster.size('loud'), RANGE_ERROR);
  assert.throws(() => raster.render([], 'loud'), RANGE_ERROR);
});

test('character k of line j starts at column 1 + 6k, row 1 + 8j', () => {
  const frame = raster.render(['AB', 'C D'], 'terse');
  assert.deepEqual(block(frame, 1, 1), glyph('A'));
  assert.deepEqual(block(frame, 7, 1), glyph('B'));
  assert.deepEqual(block(frame, 1, 9), glyph('C'));
  assert.deepEqual(block(frame, 7, 9), glyph(' '));
  assert.deepEqual(block(frame, 13, 9), glyph('D'));
});

test('a full line leaves the one-dot margin on every side', () => {
  const frame = raster.render(['M'.repeat(16), 'M'.repeat(16), 'M'.repeat(16)], 'terse');
  for (let column = 0; column < frame.columns; column++) {
    assert.equal(dot(frame, column, 0), 0);
    assert.equal(dot(frame, column, frame.rows - 1), 0);
  }
  for (let row = 0; row < frame.rows; row++) {
    assert.equal(dot(frame, 0, row), 0);
    assert.equal(dot(frame, frame.columns - 1, row), 0);
  }
  assert.deepEqual(block(frame, 1 + 6 * 15, 1 + 8 * 2), glyph('M'));
});

test('lines past the board are dropped with a warning', () => {
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    const frame = raster.render(['A', 'B', 'C', 'D'], 'terse');
    assert.equal(warnings.length, 1);
    assert.deepEqual(block(frame, 1, 17), glyph('C'));
    assert.equal(frame.dots.length, 97 * 25);
  } finally {
    console.warn = original;
  }
});

test('a line wider than the board and a character with no glyph both throw', () => {
  assert.throws(() => raster.render(['A'.repeat(17)], 'verbose'), RANGE_ERROR);
  assert.throws(() => raster.render(['A1'], 'verbose'), RANGE_ERROR);
});

test('a blank board has no lit dot', () => {
  assert.ok(raster.render([], 'verbose').dots.every((value) => value === 0));
});

// Reviewed by eye on 2026-10-09 (scripts/preview.mjs --at 2026-10-09T23:45 --level terse).
const TERSE_2345 = [
  '.................................................................................................',
  '..###..#####........###...####.......#####.####...###..###....###..#...#........###..#####.......',
  '...#.....#...........#...#...........#.....#...#...#...#..#..#...#.#...#.......#...#...#.........',
  '...#.....#...........#...#...........#.....#...#...#...#...#.#...#..#.#........#...#...#.........',
  '...#.....#...........#....###........####..####....#...#...#.#####...#.........#####...#.........',
  '...#.....#...........#.......#.......#.....#.#.....#...#...#.#...#...#.........#...#...#.........',
  '...#.....#...........#.......#.......#.....#..#....#...#..#..#...#...#.........#...#...#.........',
  '..###....#..........###..####........#.....#...#..###..###...#...#...#.........#...#...#.........',
  '.................................................................................................',
  '..###..#...#..###..####..#####.#####.####........#####..###......................................',
  '.#...#.#...#.#...#.#...#...#...#.....#...#.........#...#...#.....................................',
  '.#...#.#...#.#...#.#...#...#...#.....#...#.........#...#...#.....................................',
  '.#...#.#...#.#####.####....#...####..####..........#...#...#.....................................',
  '.#.#.#.#...#.#...#.#.#.....#...#.....#.#...........#...#...#.....................................',
  '.#..#..#...#.#...#.#..#....#...#.....#..#..........#...#...#.....................................',
  '..##.#..###..#...#.#...#...#...#####.#...#.........#....###......................................',
  '.................................................................................................',
  '.#...#..###..###...#...#..###...###..#...#.#####.................................................',
  '.##.##...#...#..#..##..#...#...#...#.#...#...#...................................................',
  '.#.#.#...#...#...#.##..#...#...#.....#...#...#...................................................',
  '.#.#.#...#...#...#.#.#.#...#...#.###.#####...#...................................................',
  '.#...#...#...#...#.#..##...#...#...#.#...#...#...................................................',
  '.#...#...#...#..#..#..##...#...#...#.#...#...#...................................................',
  '.#...#..###..###...#...#..###...####.#...#...#...................................................',
  '.................................................................................................',
];

test('terse 23:45 on 2026-10-09 matches the reviewed board', () => {
  const text = Verbatempus.format(new Date(Date.UTC(2026, 9, 9, 23, 45)), {
    timeZone: 'UTC', level: 'terse', parts: 'both', case: 'upper', charset: 'alpha',
  });
  assert.equal(text, 'IT IS FRIDAY AT QUARTER TO MIDNIGHT');
  assert.deepEqual(plain(raster.toArt(raster.frameFor(text, 'terse'))), TERSE_2345);
});

test('frameFor wraps at 16 before drawing', () => {
  const lines = plain(VTFlipdot.layout.wrap('IT IS FRIDAY AT QUARTER TO MIDNIGHT', raster.WIDTH));
  assert.deepEqual(lines, ['IT IS FRIDAY AT', 'QUARTER TO', 'MIDNIGHT']);
  assert.deepEqual(
    plain(raster.toArt(raster.frameFor('IT IS FRIDAY AT QUARTER TO MIDNIGHT', 'terse'))),
    plain(raster.toArt(raster.render(lines, 'terse'))),
  );
});
