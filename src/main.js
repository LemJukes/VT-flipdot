// Wiring (spec sections 5 and 6). Browser only.
(function () {
  'use strict';

  const { Verbatempus, VTFlipdot } = window;
  const { raster, plan, params, clock, layout, board: boards } = VTFlipdot;

  const options = params.parse(window.location.search);
  const { columns, rows } = raster.size(options.level);

  const host = document.getElementById('board');
  const stage = document.getElementById('stage');
  const motionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  const planner = plan.create({ columns, rows, reducedMotion: Boolean(motionQuery && motionQuery.matches) });
  const board = boards.create({ host, planner });
  const time = clock.create({ at: options.at, interval: options.interval });

  VTFlipdot.stats = board.stats;

  // The text for the board (upper case, A-Z and space) and the label for assistive technology.
  function currentText() {
    if (options.phrase !== null) {
      const text = layout.normalize(options.phrase);
      return { text, label: text.toLowerCase() };
    }
    const when = time.read();
    return {
      text: Verbatempus.format(when, { level: options.level, parts: 'both', case: 'upper', charset: 'alpha' }),
      label: Verbatempus.format(when, { level: options.level, parts: 'both' }),
    };
  }

  function update(snap) {
    const { text, label } = currentText();
    const dots = raster.frameFor(text, options.level).dots;
    if (snap) board.snap(dots, label);
    else board.show(dots, label);
  }

  // One pending timeout, re-armed from the clock each time, never setInterval (spec section 6).
  let timer = null;
  function arm() {
    clearTimeout(timer);
    timer = null;
    if (options.phrase !== null) return; // fixed text never changes
    const delay = time.next();
    if (delay === null) return;
    timer = setTimeout(() => {
      time.tick();
      update(false);
      arm();
    }, delay);
  }

  // Dot pitch: the largest that fits the stage, in CSS px, not rounded (spec section 3).
  function fit(width, height) {
    if (width > 0 && height > 0) board.setPitch(Math.min(width / columns, height / rows));
  }
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver((entries) => {
      const { width, height } = entries[entries.length - 1].contentRect;
      fit(width, height);
    }).observe(stage);
  }
  {
    const padding = parseFloat(getComputedStyle(stage).paddingLeft) || 0;
    fit(stage.clientWidth - 2 * padding, stage.clientHeight - 2 * padding);
  }

  // A hidden page gets no animation frames and throttled timers: when it returns, show the current
  // minute at once rather than playing a backlog of sweeps.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    update(true);
    arm();
  });

  if (motionQuery) {
    motionQuery.addEventListener('change', (event) => {
      planner.reducedMotion = event.matches;
      if (event.matches) update(true);
    });
  }

  update(false);
  arm();
})();
