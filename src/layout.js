// Text layout: normalise and wrap. Pure: no DOM, no timers.
// normalize() and wrap() are VT-split-flap's normalizeText() and wrapWords() (layout.js at commit
// f8716ec, the author's own code), renamed. Behaviour is unchanged, so ?phrase= text wraps the same way
// in both displays.
(function (global) {
  'use strict';

  const VTFlipdot = (global.VTFlipdot = global.VTFlipdot || {});

  // Upper case; anything outside A-Z and whitespace becomes a space; whitespace runs collapse.
  function normalize(text) {
    return text
      .toUpperCase()
      .replace(/[^A-Z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function chunk(word, size) {
    const chunks = [];
    for (let index = 0; index < word.length; index += size) {
      chunks.push(word.slice(index, index + size));
    }
    return chunks;
  }

  // Greedy wrap on spaces, at most `width` characters a line. A word that fits is never split. A word
  // longer than `width` is cut into `width`-sized pieces; no clock phrase has one (corpus test).
  // Returns every line, unpadded, however many it takes.
  function wrap(text, width) {
    const words = normalize(text).split(' ').filter(Boolean);
    const lines = [];
    let current = '';

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;

      if (candidate.length <= width) {
        current = candidate;
        return;
      }

      if (current) {
        lines.push(current);
      }

      if (word.length <= width) {
        current = word;
        return;
      }

      const pieces = chunk(word, width);
      lines.push(...pieces.slice(0, -1));
      current = pieces[pieces.length - 1];
    });

    if (current) {
      lines.push(current);
    }

    return lines;
  }

  VTFlipdot.layout = Object.freeze({ normalize, wrap });
})(globalThis);
