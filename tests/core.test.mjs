import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { load, root, scriptList } from './load.mjs';

// verbatempus@2.0.0, dist/verbatempus.iife.js, as published to the npm registry.
const CORE_SHA256 = 'a3e02b0613e502c0b10eadcbde7411ee4b7794648e434c25e280fe2a16e6cc19';

test('vendored Core is byte-identical to the 2.0.0 tarball', () => {
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
