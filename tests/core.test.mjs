import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { load, root, scriptList } from './load.mjs';

// verbatempus@2.0.1, dist/verbatempus.iife.js, as published to the npm registry.
const CORE_SHA256 = '506df0316b05c9100b3915a8b46b9710e1aaaf0335b25380b60cbbb5fa0c395c';

test('vendored Core is byte-identical to the 2.0.1 tarball', () => {
  const bytes = readFileSync(path.join(root, 'vendor', 'verbatempus.iife.js'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), CORE_SHA256);
});

test('the vendored script is the first one index.html loads', () => {
  assert.equal(scriptList()[0], 'vendor/verbatempus.iife.js');
});

test('Core loads in a bare vm context and formats 23:45 UTC', () => {
  const { Verbatempus } = load();
  assert.equal(typeof Verbatempus.format, 'function');
  const text = Verbatempus.format(new Date(Date.UTC(2026, 9, 9, 23, 45)), {
    timeZone: 'UTC',
    level: 'verbose',
    case: 'upper',
    charset: 'alpha',
  });
  assert.equal(text, 'IT IS A QUARTER TO MIDNIGHT');
});

// 2.0.0 said 'IT IS TUESDAY AT AFTER THREE' for terse minutes 6-14; 2.0.1 fixed it in Core.
test('Core has the 2.0.1 terse fix: "AT A BIT AFTER", never "AT AFTER"', () => {
  const { Verbatempus } = load();
  for (const minute of [6, 8, 14]) {
    const text = Verbatempus.format(new Date(Date.UTC(2026, 2, 3, 15, minute)), {
      timeZone: 'UTC',
      level: 'terse',
      parts: 'both',
      case: 'upper',
      charset: 'alpha',
    });
    assert.equal(text, 'IT IS TUESDAY AT A BIT AFTER THREE');
  }
});
