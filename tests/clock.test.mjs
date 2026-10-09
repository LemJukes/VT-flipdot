import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from './load.mjs';

const { clock } = load().VTFlipdot;

// A whole minute, any minute: the delay depends only on the position inside it.
const MINUTE = 60000;
const at = (minute, ms) => minute * MINUTE + ms;

test('next-minute delay: 60000 at :00.000, 59999 at :00.001, 1 at :59.999', () => {
  assert.equal(clock.msUntilNextMinute(at(29_000_000, 0)), 60000);
  assert.equal(clock.msUntilNextMinute(at(29_000_000, 1)), 59999);
  assert.equal(clock.msUntilNextMinute(at(29_000_000, 59999)), 1);
  assert.equal(clock.msUntilNextMinute(at(29_000_000, 30000)), 30000);
});

test('live: reads the real time and waits for the next minute boundary', () => {
  let nowMs = Date.UTC(2026, 9, 9, 12, 0, 59, 500);
  const live = clock.create({ now: () => nowMs });
  assert.equal(live.mode, 'live');
  assert.equal(live.read().getTime(), nowMs);
  assert.equal(live.next(), 500);
  nowMs += 500;
  live.tick();
  assert.equal(live.next(), 60000);
  assert.equal(live.read().getTime(), nowMs);
});

test('recheck: ?interval alone re-reads the real time every N ms', () => {
  let nowMs = Date.UTC(2026, 9, 9, 12, 0, 10);
  const recheck = clock.create({ interval: 5000, now: () => nowMs });
  assert.equal(recheck.mode, 'recheck');
  assert.equal(recheck.next(), 5000);
  nowMs += 5000;
  recheck.tick();
  assert.equal(recheck.read().getTime(), nowMs);
  assert.equal(recheck.next(), 5000);
});

test('frozen: ?at alone shows that instant and never asks to be woken', () => {
  const now = new Date(2026, 9, 9, 8, 30, 15).getTime();
  const frozen = clock.create({ at: { date: null, hours: 23, minutes: 45 }, now: () => now });
  assert.equal(frozen.mode, 'frozen');
  assert.equal(frozen.next(), null);
  const shown = frozen.read();
  assert.deepEqual(
    [shown.getFullYear(), shown.getMonth(), shown.getDate(), shown.getHours(), shown.getMinutes(), shown.getSeconds()],
    [2026, 9, 9, 23, 45, 0],
  );
  frozen.tick();
  assert.equal(frozen.read().getTime(), shown.getTime());
});

test('frozen with a date: that local day and time', () => {
  const at = { date: { year: 2026, month: 12, day: 31 }, hours: 23, minutes: 58 };
  const shown = clock.create({ at, now: () => 0 }).read();
  assert.deepEqual(
    [shown.getFullYear(), shown.getMonth(), shown.getDate(), shown.getHours(), shown.getMinutes()],
    [2026, 11, 31, 23, 58],
  );
});

test('read returns a new Date each time', () => {
  const frozen = clock.create({ at: { date: null, hours: 1, minutes: 2 }, now: () => 0 });
  const a = frozen.read();
  a.setFullYear(1999);
  assert.notEqual(frozen.read().getFullYear(), 1999);
});

test('simulated: one minute per tick, across the date and year rollover', () => {
  const at = { date: { year: 2026, month: 12, day: 31 }, hours: 23, minutes: 58 };
  const simulated = clock.create({ at, interval: 2000, now: () => 0 });
  assert.equal(simulated.mode, 'simulated');
  assert.equal(simulated.next(), 2000);

  const seen = [];
  for (let step = 0; step < 4; step++) {
    const when = simulated.read();
    seen.push([when.getFullYear(), when.getMonth() + 1, when.getDate(), when.getHours(), when.getMinutes()]);
    simulated.tick();
  }
  assert.deepEqual(seen, [
    [2026, 12, 31, 23, 58],
    [2026, 12, 31, 23, 59],
    [2027, 1, 1, 0, 0],
    [2027, 1, 1, 0, 1],
  ]);
});

test('simulated without a date starts today and rolls the day', () => {
  const now = new Date(2026, 9, 9, 8, 0).getTime();
  const simulated = clock.create({ at: { date: null, hours: 23, minutes: 59 }, interval: 250, now: () => now });
  assert.equal(simulated.read().getDate(), 9);
  simulated.tick();
  const next = simulated.read();
  assert.deepEqual([next.getMonth(), next.getDate(), next.getHours(), next.getMinutes()], [9, 10, 0, 0]);
});
