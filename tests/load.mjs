// Loads the page's pure scripts the way the page does: the <script src> list in index.html, in order,
// into one fresh node:vm context. The context has no DOM, no require and no process, so a pure module
// that reaches for one fails here instead of in the browser. board.js and main.js are browser-only
// and are skipped.
//
// Objects made inside the context have that context's Array and Object, so assert.deepStrictEqual
// rejects them against literals from the test file. Use plain() to bring one across.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER_ONLY = new Set(['src/board.js', 'src/main.js']);

export function scriptList() {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  return [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
}

export function load() {
  const context = vm.createContext({ console });
  for (const src of scriptList()) {
    if (BROWSER_ONLY.has(src)) continue;
    vm.runInContext(readFileSync(path.join(root, src), 'utf8'), context, { filename: src });
  }
  return { Verbatempus: context.Verbatempus, VTFlipdot: context.VTFlipdot, context };
}

export const plain = (value) => JSON.parse(JSON.stringify(value));
