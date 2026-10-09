// Query-string options (spec section 6). Pure: takes the search string, touches nothing else.
//
// level, interval and phrase follow VT-split-flap's parseOptions (board-logic.js at f8716ec) so the two
// displays treat the same URL the same way. `at` is flipdot's own.
(function (global) {
  'use strict';

  const VTFlipdot = (global.VTFlipdot = global.VTFlipdot || {});

  const LEVELS = Object.freeze(['verbose', 'lengthy', 'short', 'terse']);
  const DEFAULT_LEVEL = 'verbose';
  const MIN_INTERVAL_MS = 250;
  const MAX_TIMER_MS = 2147483647; // longer setTimeout delays fire immediately

  // The years the corpus test covers (spec section 9). A date outside them is not proven to fit the
  // board, so `at` ignores it.
  const FIRST_YEAR = 2010;
  const LAST_YEAR = 2099;

  function parseInterval(raw) {
    if (raw === null || raw.trim() === '') {
      return null;
    }
    const value = Number(raw);
    const usable = Number.isFinite(value) && value >= MIN_INTERVAL_MS && value <= MAX_TIMER_MS;
    return usable ? value : null;
  }

  const AT = /^(?:(\d{4})-(\d{2})-(\d{2})T)?(\d{2}):(\d{2})$/;

  // "HH:MM" -> { date: null, hours, minutes } (today); "YYYY-MM-DDTHH:MM" -> { date: { year, month,
  // day }, hours, minutes }, month 1-12. Anything else, including a day that does not exist, is null.
  function parseAt(raw) {
    if (raw === null) {
      return null;
    }
    const match = AT.exec(raw.trim());
    if (!match) {
      return null;
    }
    const hours = Number(match[4]);
    const minutes = Number(match[5]);
    if (hours > 23 || minutes > 59) {
      return null;
    }
    if (match[1] === undefined) {
      return { date: null, hours, minutes };
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < FIRST_YEAR || year > LAST_YEAR) {
      return null;
    }
    const probe = new Date(2000, 0, 1);
    probe.setFullYear(year, month - 1, day);
    if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
      return null;
    }
    return { date: { year, month, day }, hours, minutes };
  }

  // ?level=verbose|lengthy|short|terse (any case, trimmed; otherwise verbose)
  // ?interval=N (ms, 250 to 2147483647; otherwise null)
  // ?phrase=... (raw text, or null when absent)
  // ?at=HH:MM or YYYY-MM-DDTHH:MM (local; otherwise null)
  function parse(search) {
    const params = new URLSearchParams(search || '');
    const requestedLevel = (params.get('level') || '').trim().toLowerCase();

    return {
      level: LEVELS.includes(requestedLevel) ? requestedLevel : DEFAULT_LEVEL,
      interval: parseInterval(params.get('interval')),
      phrase: params.has('phrase') ? params.get('phrase') : null,
      at: parseAt(params.get('at')),
    };
  }

  VTFlipdot.params = Object.freeze({ LEVELS, DEFAULT_LEVEL, MIN_INTERVAL_MS, MAX_TIMER_MS, parse });
})(globalThis);
