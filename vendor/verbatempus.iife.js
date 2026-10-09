/*! verbatempus v2.0.0 | MIT */
var Verbatempus = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    MAX_LENGTH: () => MAX_LENGTH,
    format: () => format,
    formatParts: () => formatParts,
    lengthyDate: () => lengthyDate,
    lengthyDateTime: () => lengthyDateTime,
    lengthyTime: () => lengthyTime,
    shortDate: () => shortDate,
    shortDateTime: () => shortDateTime,
    shortTime: () => shortTime,
    terseDate: () => terseDate,
    terseDateTime: () => terseDateTime,
    terseTime: () => terseTime,
    verboseDate: () => verboseDate,
    verboseDateTime: () => verboseDateTime,
    verboseTime: () => verboseTime
  });

  // src/fields.js
  var SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var formatters = /* @__PURE__ */ new Map();
  function formatterFor(timeZone) {
    let fmt = formatters.get(timeZone);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        weekday: "short"
      });
      formatters.set(timeZone, fmt);
    }
    return fmt;
  }
  function fieldsFromParts(parts) {
    const get = (type) => parts.find((p) => p.type === type).value;
    return {
      year: Number(get("year")),
      month: Number(get("month")),
      // 1-12
      day: Number(get("day")),
      weekday: SHORT_WEEKDAYS.indexOf(get("weekday")),
      // 0 = sunday
      hour: Number(get("hour")) % 24,
      // 24 -> 0
      minute: Number(get("minute"))
    };
  }
  function fieldsIn(date, timeZone) {
    if (!timeZone) {
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        weekday: date.getDay(),
        hour: date.getHours(),
        minute: date.getMinutes()
      };
    }
    return fieldsFromParts(formatterFor(timeZone).formatToParts(date));
  }

  // src/words.js
  var ONES = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen"
  ];
  var TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function cardinal(n) {
    if (n < 20) return ONES[n];
    const ten = Math.floor(n / 10);
    const one = n % 10;
    return one ? `${TENS[ten]} ${ONES[one]}` : TENS[ten];
  }
  var range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  var MINUTE_CARDINALS = Object.freeze(
    Object.fromEntries(range(1, 59).map((m) => [m, cardinal(m)]))
  );
  var MINUTES_TO_HOUR = Object.freeze(
    Object.fromEntries(range(45, 59).map((m) => [m, cardinal(60 - m)]))
  );
  var LANDMARK_HOURS = Object.freeze({ 0: "midnight", 12: "noon" });
  var isLandmarkHour = (hour) => hour % 24 in LANDMARK_HOURS;
  function hourWord(hour) {
    const h = hour % 24;
    if (h in LANDMARK_HOURS) return LANDMARK_HOURS[h];
    return ONES[h % 12];
  }
  function timeOfDay(hour) {
    const h = hour % 24;
    if (h >= 1 && h <= 11) return "in the morning";
    if (h >= 13 && h <= 16) return "in the afternoon";
    if (h >= 17 && h <= 23) return "in the evening";
    return "";
  }
  function meridiem(hour) {
    const h = hour % 24;
    if (h in LANDMARK_HOURS) return "";
    return h < 12 ? "am" : "pm";
  }
  var MONTHS = Object.freeze([
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ]);
  var WEEKDAYS = Object.freeze([
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ]);
  var ORDINAL_DAYS = Object.freeze([
    "",
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
    "eleventh",
    "twelfth",
    "thirteenth",
    "fourteenth",
    "fifteenth",
    "sixteenth",
    "seventeenth",
    "eighteenth",
    "nineteenth",
    "twentieth",
    "twenty first",
    "twenty second",
    "twenty third",
    "twenty fourth",
    "twenty fifth",
    "twenty sixth",
    "twenty seventh",
    "twenty eighth",
    "twenty ninth",
    "thirtieth",
    "thirty first"
  ]);
  function yearWords(year) {
    if (!Number.isInteger(year) || year < 0) {
      throw new Error("Year must be a positive integer");
    }
    if (year >= 2e3 && year <= 2009) {
      return `two thousand${year > 2e3 ? " and " + cardinal(year - 2e3) : ""}`;
    }
    const century = Math.floor(year / 100);
    const remainder = year % 100;
    if (century < 10) {
      if (year < 100) return cardinal(year);
      return `${cardinal(century)} hundred${remainder ? " and " + cardinal(remainder) : ""}`;
    }
    if (remainder === 0) return `${cardinal(century)} hundred`;
    if (century >= 20) {
      if (remainder < 10) return `${cardinal(century)} hundred and ${cardinal(remainder)}`;
      return `${cardinal(century)} ${cardinal(remainder)}`;
    }
    return `${cardinal(century)} hundred and ${cardinal(remainder)}`;
  }

  // src/time.js
  var tok = (type, value) => ({ type, value });
  var CLOCK_FACES = {
    verbose: { units: true, oclock: true },
    lengthy: { units: false, oclock: false }
  };
  function spokenHour(hour, face) {
    const tokens = [tok("hour", hourWord(hour))];
    if (isLandmarkHour(hour)) return tokens;
    if (face.oclock) tokens.push(tok("oclock", "oclock"));
    const part = timeOfDay(hour);
    if (part) tokens.push(tok("suffix", part));
    return tokens;
  }
  function clockTokens(hour, minute, face) {
    const lead = tok("lead", "it is");
    const count = (n, word) => tok("minute", face.units ? `${word} ${n === 1 ? "minute" : "minutes"}` : word);
    const next = (hour + 1) % 24;
    if (minute === 0) return [lead, ...spokenHour(hour, face)];
    if (minute <= 44) {
      const rel = minute <= 10 ? "after" : "past";
      let amount;
      if (minute === 15) amount = tok("minute", "a quarter");
      else if (minute === 30) amount = tok("minute", "half");
      else amount = count(minute, MINUTE_CARDINALS[minute]);
      return [lead, amount, tok("rel", rel), ...spokenHour(hour, face)];
    }
    const left = 60 - minute;
    const toHour = spokenHour(next, face);
    if (left === 15) return [lead, tok("minute", "a quarter"), tok("rel", "to"), ...toHour];
    if ((left === 10 || left === 5) && isLandmarkHour(next)) {
      return [lead, tok("minute", MINUTES_TO_HOUR[minute]), tok("rel", "till"), ...toHour];
    }
    return [lead, count(left, MINUTES_TO_HOUR[minute]), tok("rel", "to"), ...toHour];
  }
  var band = (upTo, pre, minute, rel, hour) => ({ upTo, pre, minute, rel, hour });
  var SHORT_BANDS = [
    band(0, null, null, null, "this"),
    band(4, "just after", null, null, "this"),
    band(5, null, "five", "past", "this"),
    band(8, "almost", "ten", "past", "this"),
    band(9, "just about", "ten", "past", "this"),
    band(10, null, "ten", "past", "this"),
    band(13, "almost", "quarter", "past", "this"),
    band(14, "just about", "quarter", "past", "this"),
    band(19, null, "quarter", "past", "this"),
    band(28, "almost", "half", "past", "this"),
    band(29, "just about", "half", "past", "this"),
    band(39, null, "half", "past", "this"),
    band(43, "almost", "quarter", "to", "next"),
    band(44, "just about", "quarter", "to", "next"),
    band(49, null, "quarter", "to", "next"),
    band(50, null, "ten", "to", "next"),
    band(53, "almost", null, null, "next"),
    band(54, "just about", null, null, "next"),
    band(55, null, "five", "to", "next"),
    band(58, "almost", null, null, "next"),
    band(59, "just about", null, null, "next")
  ];
  var TERSE_BANDS = [
    band(0, null, null, null, "this"),
    band(5, "just after", null, null, "this"),
    band(14, "after", null, null, "this"),
    band(24, null, "quarter", "after", "this"),
    band(39, null, "half", "past", "this"),
    band(49, null, "quarter", "to", "next"),
    band(59, "almost", null, null, "next")
  ];
  var BAND_FACES = {
    short: { lead: "it is", bands: SHORT_BANDS, meridiem: true },
    terse: { lead: "its", bands: TERSE_BANDS, meridiem: false }
  };
  function bandTokens(hour, minute, face) {
    const b = face.bands.find((candidate) => minute <= candidate.upTo);
    const named2 = b.hour === "next" ? (hour + 1) % 24 : hour;
    const tokens = [tok("lead", face.lead)];
    if (b.pre) tokens.push(tok("rel", b.pre));
    if (b.minute) tokens.push(tok("minute", b.minute));
    if (b.rel) tokens.push(tok("rel", b.rel));
    tokens.push(tok("hour", hourWord(named2)));
    if (face.meridiem && meridiem(named2)) tokens.push(tok("suffix", meridiem(named2)));
    return tokens;
  }
  function timeTokens(hour, minute, level) {
    if (level in CLOCK_FACES) return clockTokens(hour, minute, CLOCK_FACES[level]);
    return bandTokens(hour, minute, BAND_FACES[level]);
  }

  // src/date.js
  var tok2 = (type, value) => ({ type, value });
  function dateTokens(fields, level) {
    const lead = tok2("lead", "it is");
    const weekday = tok2("weekday", WEEKDAYS[fields.weekday]);
    const month = tok2("month", MONTHS[fields.month - 1]);
    const ordinal = ORDINAL_DAYS[fields.day];
    switch (level) {
      case "verbose":
        return [lead, weekday, month, tok2("day", `the ${ordinal}`), tok2("year", yearWords(fields.year))];
      case "lengthy":
        return [lead, weekday, month, tok2("day", ordinal)];
      case "short":
        return [lead, weekday, tok2("day", `the ${ordinal}`)];
      case "terse":
        return [lead, weekday];
    }
  }

  // src/render.js
  function transform(value, letterCase, charset) {
    let out = letterCase === "upper" ? value.toUpperCase() : value;
    if (charset === "alpha") {
      out = out.replace(/[^A-Za-z ]/g, "").replace(/ +/g, " ").trim();
    }
    return out;
  }
  function render(tokens, { case: letterCase, charset }) {
    const out = tokens.map((t) => ({ type: t.type, value: transform(t.value, letterCase, charset) })).filter((t) => t.value !== "");
    const text = out.reduce(
      (acc, t, i) => acc + (i === 0 || t.value.startsWith(",") ? "" : " ") + t.value,
      ""
    );
    return { text, tokens: out };
  }

  // src/index.js
  var LEVELS = ["verbose", "lengthy", "short", "terse"];
  var PARTS = ["time", "date", "both"];
  var CASES = ["lower", "upper"];
  var CHARSETS = ["full", "alpha"];
  var MAX_LENGTH = Object.freeze({
    verbose: Object.freeze({ time: 61, date: 65, both: 132 }),
    lengthy: Object.freeze({ time: 46, date: 40, both: 84 }),
    short: Object.freeze({ time: 39, date: 34, both: 71 }),
    terse: Object.freeze({ time: 26, date: 15, both: 41 })
  });
  var JOINERS = { verbose: ", and it is", lengthy: "at", short: "at", terse: "at" };
  function validateDate(date) {
    if (Object.prototype.toString.call(date) !== "[object Date]") {
      throw new Error("Input must be a valid Date object");
    }
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid Date: date object contains an invalid date");
    }
  }
  function choose(name, value, allowed) {
    if (!allowed.includes(value)) {
      throw new Error(`Invalid ${name}: ${String(value)}. Expected one of: ${allowed.join(", ")}`);
    }
    return value;
  }
  function formatParts(date = /* @__PURE__ */ new Date(), options = {}) {
    var _a, _b, _c, _d;
    validateDate(date);
    const level = choose("level", (_a = options.level) != null ? _a : "verbose", LEVELS);
    const parts = choose("parts", (_b = options.parts) != null ? _b : "time", PARTS);
    const letterCase = choose("case", (_c = options.case) != null ? _c : "lower", CASES);
    const charset = choose("charset", (_d = options.charset) != null ? _d : "full", CHARSETS);
    const fields = fieldsIn(date, options.timeZone);
    let tokens;
    if (parts === "time") {
      tokens = timeTokens(fields.hour, fields.minute, level);
    } else if (parts === "date") {
      tokens = dateTokens(fields, level);
    } else {
      tokens = [
        ...dateTokens(fields, level),
        { type: "join", value: JOINERS[level] },
        ...timeTokens(fields.hour, fields.minute, level).slice(1)
      ];
    }
    const { text, tokens: rendered } = render(tokens, { case: letterCase, charset });
    return { text, tokens: rendered, level, parts, maxLength: MAX_LENGTH[level][parts] };
  }
  function format(date, options) {
    return formatParts(date, options).text;
  }
  var named = (level, parts) => (date, options) => format(date, { ...options, level, parts });
  var verboseTime = named("verbose", "time");
  var lengthyTime = named("lengthy", "time");
  var shortTime = named("short", "time");
  var terseTime = named("terse", "time");
  var verboseDate = named("verbose", "date");
  var lengthyDate = named("lengthy", "date");
  var shortDate = named("short", "date");
  var terseDate = named("terse", "date");
  var verboseDateTime = named("verbose", "both");
  var lengthyDateTime = named("lengthy", "both");
  var shortDateTime = named("short", "both");
  var terseDateTime = named("terse", "both");
  return __toCommonJS(index_exports);
})();
