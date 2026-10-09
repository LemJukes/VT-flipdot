// The corpus behind corpus.test.mjs (spec section 9). Not a test file itself.
//
// Date x time is about 47 million phrases per level. Greedy wrap reads only word lengths, and a
// `both` phrase is its date phrase, a joiner and its time phrase (checked by splitCheck), so the
// worst case is found by grouping date phrases and time phrases by word-length sequence, crossing one
// representative of each group, and wrapping the real `both` phrase for each pair.

export const LEVELS = ['verbose', 'lengthy', 'short', 'terse'];
export const JOINER = { verbose: 'AND IT IS', lengthy: 'AT', short: 'AT', terse: 'AT' };

const DAY_MS = 86400000;
const MINUTE_MS = 60000;
const FIRST_DAY = Date.UTC(2010, 0, 1);
const DAY_COUNT = (Date.UTC(2099, 11, 31) - FIRST_DAY) / DAY_MS + 1;

export const phrase = (Verbatempus, ms, level, parts) =>
  Verbatempus.format(new Date(ms), { level, parts, case: 'upper', charset: 'alpha', timeZone: 'UTC' });

const shapeOf = (text) => text.split(' ').map((word) => word.length).join(',');

export const WELL_FORMED = /^[A-Z]+( [A-Z]+)*$/;

const cache = new Map();

// Every time phrase (1440 minutes) and every date phrase (every day 2010-2099) at `level`, grouped
// by shape. `dates` and `times` map shape -> { ms | minute, text } for the first member of the group.
export function corpus(Verbatempus, level) {
  if (cache.has(level)) return cache.get(level);
  const dates = new Map();
  const times = new Map();
  const bad = [];
  let longestWord = '';

  const note = (text) => {
    if (!WELL_FORMED.test(text)) bad.push(text);
    for (const word of text.split(' ')) if (word.length > longestWord.length) longestWord = word;
  };

  for (let minute = 0; minute < 1440; minute++) {
    const text = phrase(Verbatempus, FIRST_DAY + minute * MINUTE_MS, level, 'time');
    note(text);
    if (!times.has(shapeOf(text))) times.set(shapeOf(text), { minute, text });
  }
  for (let day = 0; day < DAY_COUNT; day++) {
    const ms = FIRST_DAY + day * DAY_MS;
    const text = phrase(Verbatempus, ms, level, 'date');
    note(text);
    if (!dates.has(shapeOf(text))) dates.set(shapeOf(text), { ms, text });
  }

  const result = { dates, times, bad, longestWord };
  cache.set(level, result);
  return result;
}

// Fixed-seed generator of (day, minute) instants, the same on every run.
export function* instants(count, seed = 20261009) {
  let state = seed;
  const next = (n) => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    return Math.floor((state / 0x80000000) * n);
  };
  for (let i = 0; i < count; i++) yield FIRST_DAY + next(DAY_COUNT) * DAY_MS + next(1440) * MINUTE_MS;
}

// `both` must equal date + joiner + time without its own leading "IT IS" / "ITS".
export function splitCheck(Verbatempus, level, ms) {
  const date = phrase(Verbatempus, ms, level, 'date');
  const time = phrase(Verbatempus, ms, level, 'time');
  const expected = `${date} ${JOINER[level]} ${time.replace(/^(IT IS|ITS) /, '')}`;
  const actual = phrase(Verbatempus, ms, level, 'both');
  return actual === expected ? null : { ms, actual, expected };
}

// The exact worst-case wrapped line count of `both` at `width`, with the first instant that
// produces it. `wrap(text, width)` returns the lines.
export function worstCase(Verbatempus, wrap, level, width) {
  const { dates, times } = corpus(Verbatempus, level);
  let worst = { lines: 0, text: '', ms: 0 };
  for (const date of dates.values()) {
    for (const time of times.values()) {
      const ms = date.ms + time.minute * MINUTE_MS;
      const text = phrase(Verbatempus, ms, level, 'both');
      const lines = wrap(text, width).length;
      if (lines > worst.lines) worst = { lines, text, ms };
    }
  }
  return worst;
}

export const stats = (Verbatempus, level) => {
  const { dates, times } = corpus(Verbatempus, level);
  return { dateShapes: dates.size, timeShapes: times.size };
};
