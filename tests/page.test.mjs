// Static rules for index.html (spec sections 4 and 8): what the page may load, and how.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { root, scriptList } from './load.mjs';

const html = readFileSync(path.join(root, 'index.html'), 'utf8');

test('the CSP meta is default-src \'self\' and nothing looser', () => {
  const match = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html);
  assert.ok(match, 'CSP meta missing');
  assert.equal(match[1], "default-src 'self'");
});

test('no inline script and no style attribute', () => {
  assert.equal([...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>/g)].length, 0, 'inline <script>');
  assert.equal([...html.matchAll(/<style\b/g)].length, 0, 'inline <style>');
  assert.equal([...html.matchAll(/\sstyle\s*=/g)].length, 0, 'style attribute');
  assert.equal([...html.matchAll(/\son[a-z]+\s*=/g)].length, 0, 'inline event handler');
});

test('scripts are classic (no type=module), local, and exist; Core loads first', () => {
  assert.doesNotMatch(html, /type\s*=\s*["']module/);
  const scripts = scriptList();
  assert.equal(scripts[0], 'vendor/verbatempus.iife.js');
  for (const src of scripts) {
    assert.doesNotMatch(src, /^[a-z]+:|^\/\//i, `${src} is not a local path`);
    assert.ok(existsSync(path.join(root, src)), `${src} is missing`);
  }
  assert.deepEqual(scripts.slice(-2), ['src/board.js', 'src/main.js'], 'browser-only scripts load last');
});

test('every local stylesheet and icon the page links exists, and nothing else is fetched', () => {
  const hrefs = [...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(hrefs.length >= 2);
  for (const href of hrefs) {
    assert.doesNotMatch(href, /^[a-z]+:|^\/\//i, `${href} is not a local path`);
    assert.ok(existsSync(path.join(root, href)), `${href} is missing`);
  }
  assert.equal([...html.matchAll(/<(img|iframe|video|audio|source|embed|object)\b/g)].length, 0);
});

test('stylesheet loads no external resource', () => {
  const css = readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.doesNotMatch(css, /@import|url\(/);
});
