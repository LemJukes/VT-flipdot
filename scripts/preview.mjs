// Prints a phrase, or the phrase for a date and time, as the dot board draws it.
//
//   node scripts/preview.mjs "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG" [--level terse]
//   node scripts/preview.mjs --at 2026-10-09T23:45 --level verbose
//   node scripts/preview.mjs --at 23:45                 (today)
//
// --at is local time, as ?at= is on the page. Level defaults to verbose. '#' is a lit dot.
// --trim drops the dark rows below the last line of text.
import { load } from '../tests/load.mjs';

const { Verbatempus, VTFlipdot } = load();
const { raster } = VTFlipdot;

function parseArgs(argv) {
  const options = { level: 'verbose', at: null, text: null, trim: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--level') options.level = argv[++i];
    else if (argv[i] === '--at') options.at = argv[++i];
    else if (argv[i] === '--trim') options.trim = true;
    else if (options.text === null) options.text = argv[i];
    else throw new Error(`Unexpected argument: ${argv[i]}`);
  }
  return options;
}

function atToDate(at) {
  const match = /^(?:(\d{4})-(\d{2})-(\d{2})T)?(\d{2}):(\d{2})$/.exec(at);
  if (!match) throw new Error(`--at wants HH:MM or YYYY-MM-DDTHH:MM, got ${at}`);
  const [, year, month, day, hours, minutes] = match;
  const date = new Date();
  if (year) date.setFullYear(Number(year), Number(month) - 1, Number(day));
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
}

const options = parseArgs(process.argv.slice(2));
let text = options.text;
if (text === null) {
  const date = options.at ? atToDate(options.at) : new Date();
  text = Verbatempus.format(date, { level: options.level, parts: 'both', case: 'upper', charset: 'alpha' });
}

const lines = VTFlipdot.layout.wrap(text, raster.WIDTH);
const frame = raster.render(lines, options.level);
let art = raster.toArt(frame);
if (options.trim) {
  // Keep the rows up to the bottom margin of the last line of text.
  art = art.slice(0, lines.length * (raster.GLYPH_HEIGHT + raster.GAP) + raster.MARGIN);
}
console.log(`${options.level}  ${frame.columns} x ${frame.rows}  ${lines.length} of ${raster.LINES[options.level]} lines`);
console.log(lines.join(' / '));
console.log(art.join('\n'));
