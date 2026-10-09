// The DOM board (spec section 4): one <i> per dot in a CSS grid. Browser only; the pure modules do the
// thinking and this file draws what plan.js reports.
//
// A flip is started here, from the frame loop, when plan.advance() reports it. Nothing is scheduled
// ahead with a CSS or animation `delay`, so at any moment only the dots in flight hold an animation.
(function (global) {
  'use strict';

  const VTFlipdot = (global.VTFlipdot = global.VTFlipdot || {});

  // A turn about the vertical axis: scaleX 1 -> 0 -> 1. The outgoing colour holds until the dot is
  // edge-on (t = 0.5) and the incoming colour takes over from there. The paired 0.5 offsets make the
  // colour change a step, not a blend.
  function keyframes(outgoing, incoming) {
    return [
      { offset: 0, transform: 'scaleX(1)', backgroundColor: outgoing },
      { offset: 0.5, transform: 'scaleX(0)', backgroundColor: outgoing },
      { offset: 0.5, transform: 'scaleX(0)', backgroundColor: incoming },
      { offset: 1, transform: 'scaleX(1)', backgroundColor: incoming },
    ];
  }

  // options: { host, planner }. `host` is the empty element that becomes the board.
  function create(options) {
    const { host, planner } = options;
    const stats = { frames: 0 };
    const running = new Map(); // dot index -> its Animation while it is turning

    host.classList.add('board');
    host.setAttribute('role', 'img');
    host.style.setProperty('--columns', String(planner.columns));

    const dots = [];
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < planner.count; index++) {
      const dot = document.createElement('i');
      dots.push(dot);
      fragment.appendChild(dot);
    }
    host.appendChild(fragment);

    // Read once: the palette lives in CSS custom properties (spec section 10).
    const style = getComputedStyle(host);
    const colours = {
      off: style.getPropertyValue('--dot-off').trim(),
      on: style.getPropertyValue('--dot-on').trim(),
    };
    const canAnimate = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';

    function startFlip(index, to, duration) {
      const dot = dots[index];
      const previous = running.get(index);
      if (previous) {
        previous.cancel();
        running.delete(index);
      }

      dot.classList.toggle('on', to === 1);
      if (duration <= 0 || !canAnimate) return;

      const animation = dot.animate(
        to === 1 ? keyframes(colours.off, colours.on) : keyframes(colours.on, colours.off),
        { duration },
      );
      running.set(index, animation);
      animation.onfinish = () => {
        if (running.get(index) === animation) running.delete(index);
      };
    }

    // Frame loop: runs only while the plan holds a flip. Idle means no frame is requested.
    let handle = null;
    function frame() {
      handle = null;
      stats.frames += 1;
      const { started, startedTo, startedMs } = planner.advance(performance.now());
      for (let k = 0; k < started.length; k++) {
        startFlip(started[k], startedTo[k], startedMs[k]);
      }
      if (!planner.idle) handle = requestAnimationFrame(frame);
    }
    function wake() {
      if (handle === null && !planner.idle) handle = requestAnimationFrame(frame);
    }

    function redraw(indices) {
      for (const index of indices) {
        const previous = running.get(index);
        if (previous) {
          previous.cancel();
          running.delete(index);
        }
        dots[index].classList.toggle('on', planner.shown[index] === 1);
      }
    }

    return {
      stats,
      dots,

      // Sweep to `frameDots`; the label is the lower-case phrase for assistive technology.
      show(frameDots, label) {
        host.setAttribute('aria-label', label);
        planner.setTarget(frameDots, performance.now());
        wake();
      },

      // Go to `frameDots` at once, with no animation (resume from a hidden page, reduced motion on).
      snap(frameDots, label) {
        host.setAttribute('aria-label', label);
        planner.setTarget(frameDots, performance.now());
        redraw(planner.snap());
      },

      // Dot pitch in CSS px, not rounded (spec section 3).
      setPitch(pitch) {
        host.style.setProperty('--pitch', `${pitch}px`);
      },
    };
  }

  VTFlipdot.board = Object.freeze({ create });
})(globalThis);
