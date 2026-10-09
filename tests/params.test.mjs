import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load, plain } from './load.mjs';

const { params } = load().VTFlipdot;
const parse = (search) => plain(params.parse(search));

test('defaults', () => {
  assert.deepEqual(parse(''), { level: 'verbose', interval: null, phrase: null, at: null });
  assert.deepEqual(parse('?'), parse(''));
  assert.deepEqual(parse(undefined), parse(''));
});

test('level: the four names, any case, trimmed; anything else is verbose', () => {
  for (const level of ['verbose', 'lengthy', 'short', 'terse']) {
    assert.equal(parse(`?level=${level}`).level, level);
    assert.equal(parse(`?level=${level.toUpperCase()}`).level, level);
  }
  assert.equal(parse('?level=%20Terse%20').level, 'terse');
  assert.equal(parse('?level=loud').level, 'verbose');
  assert.equal(parse('?level=').level, 'verbose');
  assert.equal(parse('?level=terse,short').level, 'verbose');
});

test('interval: a number from 250 to the largest timer delay; otherwise null (as VT-split-flap)', () => {
  assert.equal(parse('?interval=250').interval, 250);
  assert.equal(parse('?interval=2000').interval, 2000);
  assert.equal(parse('?interval=2147483647').interval, 2147483647);
  for (const bad of ['249', '0', '-500', 'soon', '', 'Infinity', '2147483648', 'NaN']) {
    assert.equal(parse(`?interval=${bad}`).interval, null, bad);
  }
  assert.equal(parse('?level=terse').interval, null);
});

test('phrase: present means used, even empty; the raw text comes through', () => {
  assert.equal(parse('?phrase=HELLO%20WORLD').phrase, 'HELLO WORLD');
  assert.equal(parse('?phrase=').phrase, '');
  assert.equal(parse('?phrase').phrase, '');
  assert.equal(parse('?phrase=a%26b%3F').phrase, 'a&b?');
  assert.equal(parse('?level=terse').phrase, null);
});

test('at: HH:MM, or YYYY-MM-DDTHH:MM, 24-hour', () => {
  assert.deepEqual(parse('?at=23:45').at, { date: null, hours: 23, minutes: 45 });
  assert.deepEqual(parse('?at=00:00').at, { date: null, hours: 0, minutes: 0 });
  assert.deepEqual(parse('?at=2026-12-31T23:58').at, {
    date: { year: 2026, month: 12, day: 31 }, hours: 23, minutes: 58,
  });
  assert.deepEqual(parse('?at=%2023:45%20').at, { date: null, hours: 23, minutes: 45 }, 'trimmed');
});

test('at: invalid values are ignored', () => {
  const bad = [
    '', '23', '23:5', '24:00', '12:60', '1:30', '23:45:10', '11:30pm', 'noon',
    '2026-12-31', '2026-12-31T', '2026-12-31 23:58', '2026-13-01T10:00', '2026-02-30T10:00',
    '2027-02-29T10:00', '2026-00-10T10:00', '2026-12-00T10:00', '26-12-31T23:58',
    '2009-12-31T23:58', '2100-01-01T00:00', '0001-01-01T00:00',
  ];
  for (const raw of bad) assert.equal(parse(`?at=${encodeURIComponent(raw)}`).at, null, JSON.stringify(raw));
});

test('at: leap day is valid in a leap year', () => {
  assert.deepEqual(parse('?at=2028-02-29T12:00').at, {
    date: { year: 2028, month: 2, day: 29 }, hours: 12, minutes: 0,
  });
});

test('at: the years the corpus covers are the only ones accepted', () => {
  assert.notEqual(parse('?at=2010-01-01T00:00').at, null);
  assert.notEqual(parse('?at=2099-12-31T23:59').at, null);
});

test('parameters combine', () => {
  assert.deepEqual(parse('?level=Short&at=2026-12-31T23:58&interval=2000&phrase=hi'), {
    level: 'short',
    interval: 2000,
    phrase: 'hi',
    at: { date: { year: 2026, month: 12, day: 31 }, hours: 23, minutes: 58 },
  });
});

test('an unknown parameter is ignored', () => {
  assert.deepEqual(parse('?colour=red'), parse(''));
});
