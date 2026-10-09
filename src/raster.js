// Lines of text -> a frame of dots, and the board size for each level (spec section 3). Pure: no DOM.
// A frame is a Uint8Array, row-major, 1 = lit: dot (column, row) is frame[row * columns + column].
(function (global) {
  'use strict';

  const VTFlipdot = (global.VTFlipdot = global.VTFlipdot || {});
  const glyphs = VTFlipdot.glyphs;
  const layout = VTFlipdot.layout;

  const WIDTH = 16; // characters per line
  const GLYPH_WIDTH = 5;
  const GLYPH_HEIGHT = 7;
  const GAP = 1; // between characters and between lines
  const MARGIN = 1;
  const CELL_WIDTH = GLYPH_WIDTH + GAP;
  const CELL_HEIGHT = GLYPH_HEIGHT + GAP;
  const COLUMNS = CELL_WIDTH * WIDTH + MARGIN * 2 - GAP; // 6W + 1

  // Worst-case wrapped lines of a date+time phrase at WIDTH, per level. The corpus test asserts each
  // equals the measured worst case, so a change in Core's phrasing fails a test instead of truncating.
  const LINES = Object.freeze({ verbose: 9, lengthy: 6, short: 5, terse: 3 });

  function size(level) {
    if (!Object.hasOwn(LINES, level)) {
      throw new RangeError(`Unknown level: ${level}`);
    }
    return { columns: COLUMNS, rows: CELL_HEIGHT * LINES[level] + MARGIN * 2 - GAP, lines: LINES[level] };
  }

  // Draw `lines` (already wrapped, each at most WIDTH characters) onto a dark board for `level`.
  // Line j, character k starts at column 1 + 6k, row 1 + 8j. Lines past the board are dropped with a
  // console warning.
  function render(lines, level) {
    const { columns, rows, lines: capacity } = size(level);
    const dots = new Uint8Array(columns * rows);

    if (lines.length > capacity) {
      console.warn(`Text has ${lines.length} lines; the ${level} board holds ${capacity}. Dropping the rest.`);
    }

    lines.slice(0, capacity).forEach((line, row) => {
      if (line.length > WIDTH) {
        throw new RangeError(`Line is ${line.length} characters; the board is ${WIDTH} wide: ${line}`);
      }
      [...line].forEach((character, column) => {
        const art = glyphs[character];
        if (!art) {
          throw new RangeError(`No glyph for ${JSON.stringify(character)}`);
        }
        const left = MARGIN + column * CELL_WIDTH;
        const top = MARGIN + row * CELL_HEIGHT;
        for (let y = 0; y < GLYPH_HEIGHT; y++) {
          for (let x = 0; x < GLYPH_WIDTH; x++) {
            if (art[y][x] === '#') {
              dots[(top + y) * columns + left + x] = 1;
            }
          }
        }
      });
    });

    return { columns, rows, dots };
  }

  // Wrap `text` at WIDTH and draw it.
  function frameFor(text, level) {
    return render(layout.wrap(text, WIDTH), level);
  }

  // A frame as rows of '#' and '.', for tests and preview.
  function toArt(frame) {
    const art = [];
    for (let row = 0; row < frame.rows; row++) {
      let line = '';
      for (let column = 0; column < frame.columns; column++) {
        line += frame.dots[row * frame.columns + column] ? '#' : '.';
      }
      art.push(line);
    }
    return art;
  }

  VTFlipdot.raster = Object.freeze({
    WIDTH, GLYPH_WIDTH, GLYPH_HEIGHT, GAP, MARGIN, LINES, size, render, frameFor, toArt,
  });
})(globalThis);
