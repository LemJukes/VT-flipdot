// What time the board shows, and when to look again. Pure: the caller passes `now` in epoch
// milliseconds (Date.now) so tests can drive it.
//
//   live       no ?at, no ?interval: the real time, updated on every minute boundary
//   recheck    ?interval=N alone: the real time, re-read every N ms (VT-split-flap's behaviour)
//   frozen     ?at alone: the board stays on that instant
//   simulated  ?at with ?interval=N: starts at that instant and steps one minute every N ms
(function (global) {
  'use strict';

  const VTFlipdot = (global.VTFlipdot = global.VTFlipdot || {});

  const MINUTE_MS = 60000;

  // Milliseconds from `nowMs` to the next minute boundary, 1 to 60000. Epoch minutes are local minutes
  // because every current time-zone offset is a whole number of minutes.
  function msUntilNextMinute(nowMs) {
    return MINUTE_MS - (nowMs % MINUTE_MS);
  }

  // `at` is params.parse's `at`; the date part, when absent, is the day of `nowMs`. Local time.
  function resolveAt(at, nowMs) {
    const when = new Date(nowMs);
    if (at.date) {
      when.setFullYear(at.date.year, at.date.month - 1, at.date.day);
    }
    when.setHours(at.hours, at.minutes, 0, 0);
    return when;
  }

  // options: { at, interval, now } with now a function returning epoch ms.
  // Returns { mode, read(), next(), tick() }: read() is a new Date for the instant to show; next() is
  // the delay in ms until the next update, or null for never; tick() is called as that update begins.
  function create(options) {
    const at = options.at ?? null;
    const interval = options.interval ?? null;
    const now = options.now ?? Date.now;

    if (at) {
      const start = resolveAt(at, now());
      if (interval === null) {
        return { mode: 'frozen', read: () => new Date(start), next: () => null, tick() {} };
      }
      let steps = 0;
      return {
        mode: 'simulated',
        read: () => new Date(start.getTime() + steps * MINUTE_MS),
        next: () => interval,
        tick() { steps += 1; },
      };
    }

    if (interval !== null) {
      return { mode: 'recheck', read: () => new Date(now()), next: () => interval, tick() {} };
    }
    return { mode: 'live', read: () => new Date(now()), next: () => msUntilNextMinute(now()), tick() {} };
  }

  VTFlipdot.clock = Object.freeze({ MINUTE_MS, msUntilNextMinute, resolveAt, create });
})(globalThis);
