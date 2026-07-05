/* ============================================================
   PREMIUM MICRO-INTERACTIONS
   One pointer handler → one rAF loop. Transform/opacity only.
   Fully guarded for reduced-motion, touch, and hidden tabs.
============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pointerFx    = finePointer && !reduceMotion; // glow, magnetic, tilt, parallax

  // Deferred script → DOM is already parsed, but stay safe.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    setupStagger();
    setupCounters();
    if (!reduceMotion) setupRipple();
    if (pointerFx) setupPointerEffects();
  }

  /* ----------------------------------------------------------
     STAGGERED REVEALS
     - Project cards already reveal via main.js → just add --i.
     - Other grid children get a self-contained stagger observer.
  ---------------------------------------------------------- */
  function setupStagger() {
    // Project cards: index for the existing .reveal delay rule.
    document.querySelectorAll('#projectsGrid .project-card').forEach((card, i) => {
      card.style.setProperty('--i', i);
    });

    if (reduceMotion) return; // grid children just stay visible

    const groups = document.querySelectorAll(
      '.skills-grid, .tech-icons-row, .about-cards, .certs-awards-grid, .contact-links'
    );
    if (!groups.length) return;

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    groups.forEach(group => {
      Array.from(group.children).forEach((child, i) => {
        child.classList.add('stg');
        child.style.setProperty('--i', i);
        io.observe(child);
      });
    });
  }

  /* ----------------------------------------------------------
     ANIMATED COUNTERS
     Parses "3+", "Top 20", "8.0" → animates the numeric part once,
     preserving any prefix/suffix and decimal precision.
  ---------------------------------------------------------- */
  function setupCounters() {
    const nums = document.querySelectorAll('.hero-stat-num');
    if (!nums.length) return;

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    nums.forEach(el => {
      // Capture the original once so re-runs are idempotent.
      if (el.dataset.raw === undefined) el.dataset.raw = el.textContent.trim();
      io.observe(el);
    });
  }

  function animateCounter(el) {
    const raw = el.dataset.raw;
    const match = raw.match(/(\d+(?:\.\d+)?)/);
    if (!match) return; // nothing numeric (shouldn't happen here)

    const numStr   = match[1];
    const target   = parseFloat(numStr);
    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
    const prefix   = raw.slice(0, match.index);
    const suffix   = raw.slice(match.index + numStr.length);

    if (reduceMotion) { el.textContent = raw; return; }

    const duration = 1400;
    let startTs = null;

    function step(ts) {
      if (startTs === null) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const val = (target * eased).toFixed(decimals);
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = raw; // land exactly on the source string
    }
    requestAnimationFrame(step);
  }

  /* ----------------------------------------------------------
     CLICK RIPPLE (buttons)
  ---------------------------------------------------------- */
  function setupRipple() {
    const selector = '.btn-primary, .btn-secondary, .btn-hire, .btn-submit, ' +
                     '.filter-btn, .back-top, .theme-toggle';
    document.querySelectorAll(selector).forEach(btn => btn.classList.add('has-ripple'));

    document.addEventListener('pointerdown', e => {
      const btn = e.target.closest('.has-ripple');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  }

  /* ----------------------------------------------------------
     POINTER EFFECTS — cursor glow, magnetic buttons, card tilt,
     layered parallax. All driven by ONE rAF loop.
  ---------------------------------------------------------- */
  function setupPointerEffects() {
    const glow = document.querySelector('.cursor-glow');
    const magnets = Array.from(document.querySelectorAll(
      '.btn-primary, .btn-secondary, .btn-hire, .btn-submit, .filter-btn, .back-top, .theme-toggle'
    ));
    // Tilt only the substantial content cards — restrained on purpose
    // ("don't overuse effects"). Small chips/links keep their existing hover.
    const tiltEls = Array.from(document.querySelectorAll(
      '.hero-card, .project-card, .about-card, .skill-category'
    ));
    // Parallax uses the independent CSS `translate` property so it COMPOSES with
    // the orbs'/badges' existing transform keyframes and with card tilt — no fighting.
    const parallax = [
      { el: document.querySelector('.orb-1'),         depth: 14 },
      { el: document.querySelector('.orb-2'),         depth: -10 },
      { el: document.querySelector('.bg-grid'),       depth: 6 },
      { el: document.querySelector('.hero-card'),     depth: -8 },
      { el: document.querySelector('.float-badge-1'), depth: 18 },
      { el: document.querySelector('.float-badge-2'), depth: -16 }
    ].filter(p => p.el);

    magnets.forEach(m => m.classList.add('magnetic'));
    tiltEls.forEach(t => t.classList.add('tilt'));

    // ---- shared pointer state ----
    let mx = window.innerWidth / 2, my = window.innerHeight / 2; // latest pointer
    let running = false;
    let hasMoved = false;

    // Normalized parallax offset (-0.5 .. 0.5), eased toward the pointer.
    let nx = 0, ny = 0, tnx = 0, tny = 0;

    window.addEventListener('pointermove', e => {
      mx = e.clientX;
      my = e.clientY;
      tnx = (mx / window.innerWidth) - 0.5;
      tny = (my / window.innerHeight) - 0.5;
      if (!hasMoved && glow) { glow.classList.add('active'); hasMoved = true; }
      requestTick();
    }, { passive: true });

    // ---- tilt: track only the currently-hovered element ----
    let activeTilt = null;
    tiltEls.forEach(el => {
      let resetTimer = null;
      el.addEventListener('pointerenter', () => {
        activeTilt = el;
        clearTimeout(resetTimer);
        el.classList.remove('untilting');
        el.classList.add('tilting'); // instant 1:1 tracking
        requestTick();
      });
      el.addEventListener('pointerleave', () => {
        if (activeTilt === el) activeTilt = null;
        el.classList.remove('tilting');
        el.classList.add('untilting'); // smooth ease-out spring-back
        el.style.transform = '';
        resetTimer = setTimeout(() => el.classList.remove('untilting'), 550);
      });
    });

    function requestTick() {
      if (!running && !document.hidden) {
        running = true;
        requestAnimationFrame(frame);
      }
    }

    function frame() {
      running = false;

      // Cursor glow — direct follow (its own CSS opacity handles fade-in).
      if (glow) {
        glow.style.setProperty('--cx', mx + 'px');
        glow.style.setProperty('--cy', my + 'px');
      }

      // Magnetic buttons — pull toward pointer only within a radius.
      for (let i = 0; i < magnets.length; i++) {
        const btn = magnets[i];
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.hypot(dx, dy);
        const radius = Math.max(r.width, r.height) * 0.9 + 40;
        if (dist < radius) {
          const pull = 0.28; // subtle
          const tx = Math.max(-8, Math.min(8, dx * pull));
          const ty = Math.max(-8, Math.min(8, dy * pull));
          btn.classList.add('pulling');
          btn.style.transform = `translate(${tx}px, ${ty}px)`;
        } else if (btn.classList.contains('pulling')) {
          btn.classList.remove('pulling');
          btn.style.transform = '';
        }
      }

      // Card tilt — only the hovered card, capped at ~6°, with a small lift.
      if (activeTilt) {
        const r = activeTilt.getBoundingClientRect();
        const px = (mx - r.left) / r.width - 0.5;
        const py = (my - r.top) / r.height - 0.5;
        const rotY = Math.max(-6, Math.min(6, px * 12));
        const rotX = Math.max(-6, Math.min(6, -py * 12));
        activeTilt.style.transform =
          `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px)`;
      }

      // Layered parallax — ease toward target, move each layer by its depth.
      // Uses `translate` (independent of `transform`) so it never clobbers tilt
      // or the orb/badge float animations.
      nx += (tnx - nx) * 0.08;
      ny += (tny - ny) * 0.08;
      for (let i = 0; i < parallax.length; i++) {
        const { el, depth } = parallax[i];
        el.style.translate = `${(-nx * depth).toFixed(2)}px ${(-ny * depth).toFixed(2)}px`;
      }

      // Keep easing until parallax settles or pointer keeps moving.
      if (Math.abs(tnx - nx) > 0.001 || Math.abs(tny - ny) > 0.001 || activeTilt) {
        requestTick();
      }
    }

    // Pause everything when the tab is hidden; resume on return.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) requestTick();
    });

    requestTick(); // settle initial parallax
  }
})();
