import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load, plain } from './load.mjs';

const { plan, raster } = load().VTFlipdot;
const RANGE_ERROR = { name: 'RangeError' };

const make = (columns = 20, rows = 5, extra = {}) => plan.create({ columns, rows, ...extra });
const frame = (planner, lit) => Uint8Array.from({ length: planner.count }, (_, index) => (lit(index) ? 1 : 0));
const allLit = (planner) => frame(planner, () => true);
const allDark = (planner) => frame(planner, () => false);
const checker = (planner) => frame(planner, (index) => index % 2 === 0);
const same = (a, b) => assert.deepEqual(Array.from(a), Array.from(b));
const lit = (planner) => Array.from(planner.shown).filter(Boolean).length;
const NOTHING = { started: [], finished: [] };

// Advance in 1 ms steps, recording each flip as it is reported. A 1 ms step is shorter than a flip,
// so a flip is never reported started and finished in one call and each started index appears once
// per call; flipStart / flipEnd then still describe the flip that was just reported.
function stepTo(planner, from, to, flips = new Map()) {
  for (let now = from; now <= to; now++) {
    const { started } = planner.advance(now);
    for (const index of started) {
      if (!flips.has(index)) flips.set(index, []);
      flips.get(index).push({ start: planner.flipStart[index], end: planner.flipEnd[index], to: planner.flipTo[index] });
    }
  }
  return flips;
}

function run(planner, from, limit = 5000) {
  const flips = stepTo(planner, from, from + limit);
  assert.equal(planner.idle, true, 'plan did not settle');
  return flips;
}

test('boots all dark and idle', () => {
  const planner = make();
  assert.equal(planner.idle, true);
  assert.equal(lit(planner), 0);
  assert.deepEqual(plain(planner.advance(0)), NOTHING);
});

test('the first target plans only the lit dots; a dark target drops them again', () => {
  const planner = make();
  planner.setTarget(checker(planner), 0);
  assert.equal(planner.activeCount, planner.count / 2);
  planner.setTarget(allDark(planner), 0);
  assert.equal(planner.activeCount, 0, 'flips that never started are dropped');
});

test('a plan runs to rest: shown equals target, every changed dot flips once', () => {
  const planner = make();
  planner.setTarget(checker(planner), 1000);
  const flips = run(planner, 1000);
  same(planner.shown, planner.target);
  assert.equal(flips.size, planner.count / 2);
  for (const list of flips.values()) assert.equal(list.length, 1);
});

test('an unchanged frame plans nothing, at rest', () => {
  const planner = make();
  planner.setTarget(checker(planner), 0);
  run(planner, 0);
  planner.setTarget(checker(planner), 5000);
  assert.equal(planner.activeCount, 0);
  assert.deepEqual(plain(planner.advance(6000)), NOTHING);
});

test('an unchanged frame mid-sweep keeps every schedule', () => {
  const planner = make();
  planner.setTarget(allLit(planner), 0);
  planner.advance(100);
  const before = {
    start: Array.from(planner.flipStart),
    end: Array.from(planner.flipEnd),
    active: planner.activeCount,
  };
  planner.setTarget(allLit(planner), 100);
  assert.equal(planner.activeCount, before.active);
  same(planner.flipStart, before.start);
  same(planner.flipEnd, before.end);
});

test('advance reports each flip start once, and each finish once', () => {
  const planner = make();
  planner.setTarget(allLit(planner), 0);
  const starts = new Array(planner.count).fill(0);
  const finishes = new Array(planner.count).fill(0);
  for (let now = 0; now < 600; now += 7) {
    const { started, finished } = planner.advance(now);
    started.forEach((index) => starts[index]++);
    finished.forEach((index) => finishes[index]++);
    assert.deepEqual(plain(planner.advance(now)), NOTHING, 'a second call at the same time');
  }
  assert.ok(starts.every((n) => n === 1));
  assert.ok(finishes.every((n) => n === 1));
});

test('start times follow the column sweep: column x COL_DELAY_MS plus 0 to JITTER_MS', () => {
  const planner = make(97, 3);
  planner.setTarget(allLit(planner), 500);
  const jitters = new Set();
  for (let index = 0; index < planner.count; index++) {
    const column = index % planner.columns;
    const jitter = planner.flipStart[index] - 500 - column * 8;
    assert.ok(jitter >= 0 && jitter <= 15, `dot ${index}: jitter ${jitter}`);
    assert.equal(planner.flipEnd[index] - planner.flipStart[index], 100);
    jitters.add(jitter);
  }
  assert.ok(jitters.size > 8, 'jitter takes many values');
});

test('plans are reproducible', () => {
  const a = make();
  const b = make();
  a.setTarget(checker(a), 0);
  b.setTarget(checker(b), 0);
  same(a.flipStart, b.flipStart);
});

test('a flip that has started runs to completion when the target changes', () => {
  const planner = make();
  planner.setTarget(allLit(planner), 0);
  planner.advance(100);
  const started = Array.from({ length: planner.count }, (_, index) => index).filter(
    (index) => planner.flipTo[index] !== -1 && planner.flipStart[index] <= 100,
  );
  assert.ok(started.length > 0 && started.length < planner.count);
  const before = started.map((index) => [planner.flipTo[index], planner.flipStart[index], planner.flipEnd[index]]);

  planner.setTarget(allDark(planner), 100);

  started.forEach((index, n) => {
    assert.deepEqual([planner.flipTo[index], planner.flipStart[index], planner.flipEnd[index]], before[n]);
  });
});

test('retarget at half-sweep (A then B then C) ends on C; no dot flips more than twice', () => {
  const planner = make();
  planner.setTarget(allLit(planner), 0); // B: every dot lights, left to right
  const flips = stepTo(planner, 0, 100); // half-sweep: the left columns have flipped, the right have not
  assert.ok(flips.size > 0 && flips.size < planner.count);

  const C = checker(planner);
  planner.setTarget(C, 100);
  stepTo(planner, 101, 5000, flips);

  assert.equal(planner.idle, true);
  same(planner.shown, C);
  const counts = Array.from(flips.values(), (list) => list.length);
  assert.equal(Math.max(...counts), 2, 'dots that lit and then had to go dark flip twice');
});

test('retarget to dark mid-sweep: started dots flip back, unstarted dots never move', () => {
  const planner = make();
  planner.setTarget(allLit(planner), 0);
  const flips = stepTo(planner, 0, 100);
  const startedBefore = new Set(flips.keys());
  planner.setTarget(allDark(planner), 100);
  stepTo(planner, 101, 5000, flips);
  same(planner.shown, planner.target);
  assert.equal(lit(planner), 0);
  for (const [index, list] of flips) assert.equal(list.length, startedBefore.has(index) ? 2 : 1, `dot ${index}`);
  assert.equal(flips.size, startedBefore.size, 'no dot outside the started set ever flipped');
});

test('a dot that finishes unlike the target flips again from the instant its last flip ended', () => {
  const planner = make();
  planner.setTarget(allLit(planner), 0);
  stepTo(planner, 0, 50); // column 0 has started; its flip ends by about 123
  const index = 0;
  assert.equal(planner.flipTo[index], 1);
  const endedAt = planner.flipEnd[index];
  planner.setTarget(allDark(planner), 50);
  assert.equal(planner.flipTo[index], 1, 'the started flip is not reversed');

  stepTo(planner, 51, Math.ceil(endedAt) + 1);
  assert.equal(planner.shown[index], 1);
  assert.equal(planner.flipTo[index], 0, 'the return flip is under way');
  assert.equal(planner.flipStart[index], endedAt);
});

test('a late frame does not delay the return flip: it starts at the old flip\'s end, not at now', () => {
  const planner = make();
  planner.setTarget(allLit(planner), 0);
  planner.advance(50);
  const endedAt = planner.flipEnd[0];
  planner.setTarget(allDark(planner), 50);

  const { started, finished } = planner.advance(endedAt + 30); // one slow frame, past the end
  assert.ok(finished.includes(0));
  assert.ok(started.includes(0), 'the return flip is reported in the same call');
  assert.equal(planner.flipStart[0], endedAt);
  assert.equal(planner.flipEnd[0], endedAt + 100);
});

test('no dot ever holds two flips at once', () => {
  const planner = make();
  planner.setTarget(allLit(planner), 0);
  const flips = stepTo(planner, 0, 120);
  planner.setTarget(checker(planner), 120);
  stepTo(planner, 121, 250, flips);
  planner.setTarget(allLit(planner), 250);
  stepTo(planner, 251, 5000, flips);
  for (const list of flips.values()) {
    for (let n = 1; n < list.length; n++) {
      assert.ok(list[n].start >= list[n - 1].end, 'flips of one dot overlap');
      assert.notEqual(list[n].to, list[n - 1].to, 'consecutive flips go opposite ways');
    }
  }
  same(planner.shown, planner.target);
});

test("budget: every dot changing finishes within 2000 ms on every level's board", () => {
  for (const level of ['verbose', 'lengthy', 'short', 'terse']) {
    const { columns, rows } = raster.size(level);
    const planner = plan.create({ columns, rows });
    assert.equal(planner.budget(), 883, 'at the defaults: 96 x 8 + 15 + 100');
    planner.setTarget(allLit(planner), 10000);
    const end = planner.endsAt();
    assert.ok(end - 10000 <= planner.budget(), level);
    assert.ok(end - 10000 <= 2000, level);

    for (let now = 10000; now <= end; now += 16) planner.advance(now);
    planner.advance(end);
    assert.equal(planner.idle, true, level);
    assert.equal(lit(planner), planner.count);
  }
});

test('mid-sweep, about 14 columns of dots are in flight, not the board', () => {
  const { columns, rows } = raster.size('verbose');
  const planner = plan.create({ columns, rows });
  planner.setTarget(allLit(planner), 0);
  const inFlight = new Set();
  let peak = 0;
  for (let now = 0; now <= 1000; now += 4) {
    const { started, finished } = planner.advance(now);
    started.forEach((index) => inFlight.add(index));
    finished.forEach((index) => inFlight.delete(index));
    peak = Math.max(peak, inFlight.size);
  }
  // 100 ms of flip over 8 ms columns, plus 15 ms of jitter: about 14 columns of 73 rows.
  assert.ok(peak < 16 * rows, `peak ${peak} dots in flight`);
  assert.ok(peak < planner.count / 5);
});

test('reduced motion: zero duration, zero offset, one frame', () => {
  const planner = make(20, 5, { reducedMotion: true });
  planner.setTarget(checker(planner), 700);
  for (let index = 0; index < planner.count; index++) {
    if (planner.flipTo[index] === -1) continue;
    assert.equal(planner.flipStart[index], 700);
    assert.equal(planner.flipEnd[index], 700);
  }
  const { started, finished } = planner.advance(700);
  assert.equal(started.length, planner.count / 2);
  assert.equal(finished.length, planner.count / 2);
  assert.equal(planner.idle, true);
  same(planner.shown, planner.target);
});

test('reduced motion can change at run time and applies to the next plan', () => {
  const planner = make();
  planner.setTarget(checker(planner), 0);
  assert.equal(planner.flipEnd[0] - planner.flipStart[0], 100);
  planner.reducedMotion = true;
  assert.equal(planner.reducedMotion, true);
  planner.setTarget(frame(planner, (index) => index % 2 === 1), 0);
  const odd = 1;
  assert.equal(planner.flipStart[odd], 0);
  assert.equal(planner.flipEnd[odd], 0);
});

test('snap drops every flip and shows the target; it reports the dots to redraw', () => {
  const planner = make();
  planner.setTarget(allLit(planner), 0);
  planner.advance(60);
  const midFlip = Array.from({ length: planner.count }, (_, i) => i).filter((i) => planner.flipTo[i] !== -1);
  const touched = planner.snap();
  assert.equal(planner.idle, true);
  same(planner.shown, planner.target);
  assert.equal(lit(planner), planner.count);
  assert.equal(touched.length, planner.count);
  assert.equal(new Set(touched).size, touched.length, 'no index twice');
  midFlip.forEach((i) => assert.ok(touched.includes(i)));
  assert.deepEqual(plain(planner.advance(60)), NOTHING);
  assert.deepEqual(plain(planner.snap()), [], 'nothing to do the second time');
});

test('setTarget rejects a frame of the wrong size', () => {
  const planner = make();
  assert.throws(() => planner.setTarget(new Uint8Array(planner.count - 1), 0), RANGE_ERROR);
});

test('a raster frame drives the plan end to end; the same minute again plans nothing', () => {
  const { columns, rows } = raster.size('terse');
  const planner = plan.create({ columns, rows });
  const board = raster.frameFor('IT IS FRIDAY AT QUARTER TO MIDNIGHT', 'terse');
  planner.setTarget(board.dots, 0);
  const litDots = board.dots.reduce((sum, value) => sum + value, 0);
  assert.equal(planner.activeCount, litDots);
  for (let now = 0; now <= planner.budget(); now += 16) planner.advance(now);
  planner.advance(planner.budget());
  assert.equal(planner.idle, true);
  same(planner.shown, board.dots);

  planner.setTarget(raster.frameFor('IT IS FRIDAY AT QUARTER TO MIDNIGHT', 'terse').dots, 60000);
  assert.equal(planner.activeCount, 0);
});
