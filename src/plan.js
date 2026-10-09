// The update plan (spec section 5): which dots flip, and when. Pure: no DOM, no timers, no clock of its
// own. Every call is given `now` in milliseconds, so tests drive it with a fake clock.
//
// Per dot, `shown` is the face out at rest (0 dark, 1 lit) and at most one flip is held:
// flipTo / flipStart / flipEnd, with flipTo -1 for none. A flip is "started" once advance() has
// reported it, which is when the board begins to draw it; until then it can still be dropped.
(function (global) {
  'use strict';

  const VTFlipdot = (global.VTFlipdot = global.VTFlipdot || {});

  const DEFAULTS = Object.freeze({ flipMs: 100, colDelayMs: 8, jitterMs: 15 });

  // Integer hash of a dot index (a murmur-style finalizer), so jitter is the same on every run.
  function hash(index) {
    let x = (index + 1) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    return (x ^ (x >>> 16)) >>> 0;
  }

  // options: { columns, rows, flipMs, colDelayMs, jitterMs, reducedMotion }
  function create(options) {
    const { columns, rows } = options;
    const flipMs = options.flipMs ?? DEFAULTS.flipMs;
    const colDelayMs = options.colDelayMs ?? DEFAULTS.colDelayMs;
    const jitterMs = options.jitterMs ?? DEFAULTS.jitterMs;
    let reducedMotion = Boolean(options.reducedMotion);

    const count = columns * rows;
    const shown = new Uint8Array(count);
    const target = new Uint8Array(count);
    const flipTo = new Int8Array(count).fill(-1);
    const flipStart = new Float64Array(count);
    const flipEnd = new Float64Array(count);
    const reported = new Uint8Array(count);
    const active = new Set(); // indices holding a flip

    const offsetOf = (index) => (index % columns) * colDelayMs + (hash(index) % (jitterMs + 1));

    function begin(index, start, duration) {
      flipTo[index] = target[index];
      flipStart[index] = start;
      flipEnd[index] = start + duration;
      reported[index] = 0;
      active.add(index);
    }

    function drop(index) {
      flipTo[index] = -1;
      reported[index] = 0;
      active.delete(index);
    }

    // `dots` is a frame's Uint8Array, one entry per dot. Flips that have started run to completion; a
    // flip that has not started and already leads to the new face keeps its schedule; any other
    // unstarted flip is dropped; every dot left with shown != target and no flip gets a new one.
    function setTarget(dots, now) {
      if (dots.length !== count) {
        throw new RangeError(`Frame has ${dots.length} dots; the board has ${count}`);
      }
      for (let index = 0; index < count; index++) {
        const want = dots[index] ? 1 : 0;
        target[index] = want;

        if (flipTo[index] !== -1) {
          if (reported[index] || flipTo[index] === want) continue;
          drop(index);
        }
        if (shown[index] !== want) {
          begin(index, now + (reducedMotion ? 0 : offsetOf(index)), reducedMotion ? 0 : flipMs);
        }
      }
    }

    // Moves the plan to `now`. Returns the indices whose flip began and the indices whose flip ended
    // in this call; each flip appears once in `started` and once in `finished`. For started[k], the face
    // it turns to is startedTo[k] and its length startedMs[k], captured when it was reported (a flip can
    // start and end inside one call, after which the arrays no longer describe it). A dot that finishes
    // still unlike the target flips again at once, from the instant the last one ended.
    function advance(now) {
      const started = [];
      const startedTo = [];
      const startedMs = [];
      const finished = [];

      for (const index of Array.from(active)) {
        for (;;) {
          if (flipTo[index] === -1) break;
          if (!reported[index]) {
            if (flipStart[index] > now) break;
            reported[index] = 1;
            started.push(index);
            startedTo.push(flipTo[index]);
            startedMs.push(flipEnd[index] - flipStart[index]);
          }
          if (flipEnd[index] > now) break;

          const endedAt = flipEnd[index];
          shown[index] = flipTo[index];
          drop(index);
          finished.push(index);

          if (shown[index] === target[index]) break;
          begin(index, endedAt, reducedMotion ? 0 : flipMs);
        }
      }

      return { started, startedTo, startedMs, finished };
    }

    // Drops every flip and shows the target at once. Returns the indices the board must redraw: those
    // whose face changed and those that were mid-flip.
    function snap() {
      const touched = new Set(active);
      Array.from(active).forEach(drop);
      for (let index = 0; index < count; index++) {
        if (shown[index] !== target[index]) {
          shown[index] = target[index];
          touched.add(index);
        }
      }
      return Array.from(touched);
    }

    // When the last flip held now ends; 0 when there is none.
    function endsAt() {
      let latest = 0;
      for (const index of active) latest = Math.max(latest, flipEnd[index]);
      return latest;
    }

    // The longest a full-board update can take from setTarget to the last flip's end, at these settings.
    const budget = () => (columns - 1) * colDelayMs + jitterMs + flipMs;

    return {
      columns, rows, count, shown, target, flipTo, flipStart, flipEnd,
      setTarget, advance, snap, endsAt, budget,
      get idle() { return active.size === 0; },
      get activeCount() { return active.size; },
      get reducedMotion() { return reducedMotion; },
      set reducedMotion(value) { reducedMotion = Boolean(value); },
    };
  }

  VTFlipdot.plan = Object.freeze({ DEFAULTS, create });
})(globalThis);
