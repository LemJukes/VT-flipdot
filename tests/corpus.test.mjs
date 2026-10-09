// Spec section 9, "Corpus method". This test is the definition of "fits": it fails if Core's phrasing
// changes under the board, instead of letting a phrase be truncated.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { load } from './load.mjs';
import { LEVELS, corpus, instants, phrase, splitCheck, stats, worstCase, WELL_FORMED } from './corpus-lib.mjs';

const WIDTH = 16;
const SPLIT_PAIRS = 10000;

// Remove once layout.js and raster.js land (run sheet step 3).
const PENDING = { todo: 'layout lands in step 3' };

const { Verbatempus, VTFlipdot } = load();
const layout = () => {
  assert.ok(VTFlipdot?.layout, 'VTFlipdot.layout is missing');
  assert.ok(VTFlipdot?.raster, 'VTFlipdot.raster is missing');
  return VTFlipdot;
};

for (const level of LEVELS) {
  describe(level, () => {
    test('every time and date phrase is A-Z and single spaces; every word fits the line', (t) => {
      const { bad, longestWord } = corpus(Verbatempus, level);
      t.diagnostic(`longest word ${longestWord.length} letters: ${longestWord}`);
      assert.deepEqual(bad.slice(0, 3), []);
      assert.ok(longestWord.length <= WIDTH, `${longestWord} is longer than ${WIDTH}`);
    });

    test(`both = date + joiner + time, ${SPLIT_PAIRS} pairs`, () => {
      const failures = [];
      for (const ms of instants(SPLIT_PAIRS)) {
        const failure = splitCheck(Verbatempus, level, ms);
        if (failure) failures.push(failure);
        if (failures.length === 3) break;
      }
      assert.deepEqual(failures, [], 'the worst-case reduction no longer holds; stop and report');
    });

    test('random both phrases are well formed', () => {
      for (const ms of instants(2000, 7)) {
        assert.match(phrase(Verbatempus, ms, level, 'both'), WELL_FORMED);
      }
    });

    test('the worst case wraps to exactly L lines', PENDING, (t) => {
      const { layout: lay, raster } = layout();
      const worst = worstCase(Verbatempus, lay.wrap, level, WIDTH);
      const { dateShapes, timeShapes } = stats(Verbatempus, level);
      t.diagnostic(`${dateShapes} date shapes x ${timeShapes} time shapes`);
      t.diagnostic(`worst: ${worst.lines} lines at ${new Date(worst.ms).toISOString()}: ${worst.text}`);
      assert.equal(raster.LINES[level], worst.lines);
    });

    test('random both phrases wrap within L lines', PENDING, () => {
      const { layout: lay, raster } = layout();
      for (const ms of instants(5000, 99)) {
        const lines = lay.wrap(phrase(Verbatempus, ms, level, 'both'), WIDTH).length;
        assert.ok(lines <= raster.LINES[level], `${new Date(ms).toISOString()} wraps to ${lines} lines`);
      }
    });
  });
}
